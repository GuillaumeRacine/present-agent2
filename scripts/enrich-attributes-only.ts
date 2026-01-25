#!/usr/bin/env tsx
/**
 * Attribute-Only Product Enrichment Script
 *
 * This script focuses ONLY on enriching products with gift attributes
 * (isPractical, isLuxury, isExperiential, etc.) for products that lack them.
 *
 * KEY FEATURES:
 * - Targets ONLY products without attributes (WHERE p.is_practical IS NULL)
 * - Batch processing with validation after each batch
 * - Checkpointing every 100 products for safe resumption
 * - Batch success rate validation (fails if <80% success per batch)
 * - Uses OpenAI gpt-4o-mini for consistency
 * - Detailed logging for each batch
 *
 * USAGE:
 *   npx tsx scripts/enrich-attributes-only.ts [options]
 *
 * OPTIONS:
 *   --live              Apply changes (default: dry-run)
 *   --batch-size N      Products per LLM call (default: 20)
 *   --limit N           Maximum products to process
 *   --verbose           Show detailed LLM logs
 *
 * The script will automatically:
 * - Save checkpoints every 100 products
 * - Validate batch success (fails if <80% success rate)
 * - Resume from where it left off
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { chatCompletion } from '../src/lib/llm.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
}

interface AttributeResult {
  productId: string;
  attributes: Record<string, boolean>;
}

interface Stats {
  totalInDb: number;
  needsAttributes: number;
  processedThisRun: number;
  attributesSet: number;
  tokensUsed: number;
  estimatedCost: number;
  errors: number;
  startTime: number;
  lastCheckpoint: number;
}

interface Checkpoint {
  lastProcessedId: string | null;
  processedCount: number;
  stats: Stats;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHECKPOINT_FILE = path.join(process.cwd(), 'data', '.enrich-attributes-checkpoint.json');

const GIFT_ATTRIBUTES = [
  'isExperiential', 'isMemoryMaking', 'isSentimental', 'isPersonalized',
  'isPractical', 'isLuxury', 'isConsumable', 'isArtistic', 'isMinimalist',
  'isShared', 'isConversationStarter', 'isEducational', 'isHandcrafted',
  'isLastingValue', 'isEcoFriendly',
] as const;

// GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
const COST_PER_1M_INPUT = 0.15;
const COST_PER_1M_OUTPUT = 0.60;

// Minimum success rate for batch validation
const MIN_BATCH_SUCCESS_RATE = 0.80; // 80%

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load checkpoint, starting fresh'));
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  try {
    const dir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to save checkpoint'));
  }
}

function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    // Ignore
  }
}

// ============================================================================
// LLM ENRICHMENT
// ============================================================================

function generateBatchPrompt(products: Product[]): string {
  const productList = products.map((p, idx) => {
    const desc = (p.description || '').substring(0, 300);
    const priceInfo = p.price ? ` ($${p.price})` : '';
    return `${idx + 1}. "${p.title}"${priceInfo} - ${desc}`;
  }).join('\n\n');

  return `Analyze these ${products.length} products and identify their gift attributes.

PRODUCTS:
${productList}

For EACH product, identify which attributes apply (set to true only if clearly applicable):

ATTRIBUTES:
- isExperiential: Experiences, events, classes, tickets, subscriptions
- isMemoryMaking: Photo albums, memory books, keepsakes, commemorative items
- isSentimental: Meaningful, heartfelt, touching, emotional gifts
- isPersonalized: Custom, engraved, monogrammed, bespoke items
- isPractical: Useful, everyday, functional, utility items
- isLuxury: Premium, high-end, deluxe, exclusive items (or price >= $100)
- isConsumable: Food, drinks, candles, beauty products, bath items
- isArtistic: Art, sculptures, paintings, creative items
- isMinimalist: Simple, clean, understated design
- isShared: Items for sharing, group activities, social gatherings
- isConversationStarter: Unique, unusual, quirky, interesting
- isEducational: Books, courses, tutorials, learning materials
- isHandcrafted: Handmade, artisan, crafted items
- isLastingValue: Heirloom quality, timeless, durable, investment pieces
- isEcoFriendly: Sustainable, organic, recycled, ethical, eco materials

Return JSON array (same order as products):
[{"productIndex":1,"attributes":{"isPractical":true,"isLuxury":false}}]

Return exactly ${products.length} objects. Only include attributes that are true.`;
}

async function enrichAttributesBatch(
  products: Product[],
  verbose: boolean,
  stats: Stats
): Promise<AttributeResult[]> {
  const prompt = generateBatchPrompt(products);

  try {
    if (verbose) {
      console.log(chalk.gray(`  [LLM] Calling OpenAI for ${products.length} products...`));
    }

    const response = await chatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      jsonMode: true,
      model: 'gpt-4o-mini',
    });

    // Estimate tokens (rough: prompt + response / 4)
    const tokens = Math.ceil((prompt.length + response.length) / 4);
    stats.tokensUsed += tokens;

    // Calculate cost
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    stats.estimatedCost += (inputTokens * COST_PER_1M_INPUT + outputTokens * COST_PER_1M_OUTPUT) / 1_000_000;

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (parseError) {
      if (verbose) {
        console.error(chalk.red(`  [LLM] JSON parse error: ${parseError}`));
        console.error(chalk.gray(`  [LLM] Raw response: ${response.substring(0, 500)}`));
      }
      throw new Error(`Failed to parse LLM response: ${parseError}`);
    }

    if (verbose) {
      console.log(chalk.gray(`  [LLM] Response type: ${Array.isArray(parsed) ? 'array' : 'object'}`));
      console.log(chalk.gray(`  [LLM] Response sample: ${JSON.stringify(parsed).substring(0, 300)}`));
    }

    // Handle different response formats from LLM
    let responseArray: any[];
    if (Array.isArray(parsed)) {
      responseArray = parsed;
    } else if (parsed.products && Array.isArray(parsed.products)) {
      responseArray = parsed.products;
    } else if (parsed.results && Array.isArray(parsed.results)) {
      responseArray = parsed.results;
    } else if (parsed.productIndex !== undefined && parsed.attributes !== undefined) {
      // Handle single product object response - wrap it in an array
      if (verbose) {
        console.log(chalk.yellow(`  [LLM] Received single product object, wrapping in array`));
      }
      responseArray = [parsed];
    } else {
      // If we got an object with keys, try to extract an array
      const keys = Object.keys(parsed);
      if (keys.length > 0 && Array.isArray(parsed[keys[0]])) {
        responseArray = parsed[keys[0]];
      } else {
        throw new Error(`Unexpected LLM response format: ${JSON.stringify(parsed).substring(0, 200)}`);
      }
    }

    if (verbose) {
      console.log(chalk.gray(`  [LLM] Received ${responseArray.length} results (expected ${products.length})`));
      if (responseArray.length > 0) {
        console.log(chalk.gray(`  [LLM] First result: ${JSON.stringify(responseArray[0])}`));
      }
    }

    const results: AttributeResult[] = [];

    for (let i = 0; i < products.length; i++) {
      const llmResult = responseArray[i] || {};
      const attributes: Record<string, boolean> = {};

      // Handle both direct attributes and nested attributes structure
      const attrSource = llmResult.attributes || llmResult;

      if (attrSource && typeof attrSource === 'object') {
        for (const attr of GIFT_ATTRIBUTES) {
          if (attrSource[attr] === true) {
            attributes[attr] = true;
          }
        }
      }

      results.push({
        productId: products[i].id,
        attributes,
      });
    }

    return results;

  } catch (error: any) {
    stats.errors++;
    console.error(chalk.red(`\n❌ Batch enrichment failed: ${error.message}`));
    throw error;
  }
}

/**
 * Check if attribute result has actual data (not empty)
 */
function hasValidAttributes(result: AttributeResult): boolean {
  return Object.keys(result.attributes).length > 0;
}

/**
 * Validate batch success rate
 */
function validateBatchSuccess(results: AttributeResult[], minRate: number = MIN_BATCH_SUCCESS_RATE): boolean {
  const validCount = results.filter(hasValidAttributes).length;
  const successRate = validCount / results.length;

  if (successRate < minRate) {
    console.error(chalk.red(`\n❌ Batch validation failed: ${(successRate * 100).toFixed(1)}% success (required: ${(minRate * 100)}%)`));
    console.error(chalk.yellow(`   Valid: ${validCount}/${results.length} products`));
    return false;
  }

  return true;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Convert camelCase attribute names to snake_case for Neo4j
 * Neo4j stores: is_practical, is_luxury, etc.
 * TypeScript uses: isPractical, isLuxury, etc.
 */
function convertToSnakeCase(attributes: Record<string, boolean>): Record<string, boolean> {
  const snakeCased: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCased[snakeKey] = value;
  }
  return snakeCased;
}

async function saveAttributesToNeo4j(
  productId: string,
  attributes: Record<string, boolean>,
  dryRun: boolean
): Promise<void> {
  if (dryRun || Object.keys(attributes).length === 0) return;

  const driver = getDriver();
  const session = driver.session();

  try {
    // Convert camelCase to snake_case for Neo4j
    const snakeCasedAttributes = convertToSnakeCase(attributes);

    await session.run(
      `MATCH (p:Product {id: $productId})
       SET p += $attributes,
           p.attributes_updated_at = datetime()`,
      { productId, attributes: snakeCasedAttributes }
    );
  } finally {
    await session.close();
  }
}

async function countProductsNeedingAttributes(): Promise<{ total: number; needsAttributes: number }> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (p2:Product)
      WHERE p2.is_practical IS NULL
      RETURN total, count(p2) as needsAttributes
    `);

    const record = result.records[0];
    const total = record.get('total');
    const needsAttributes = record.get('needsAttributes');
    return {
      total: typeof total === 'object' && total.toNumber ? total.toNumber() : Number(total),
      needsAttributes: typeof needsAttributes === 'object' && needsAttributes.toNumber ? needsAttributes.toNumber() : Number(needsAttributes),
    };
  } finally {
    await session.close();
  }
}

async function fetchProductsNeedingAttributes(
  limit: number,
  afterId?: string | null
): Promise<Product[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const query = `
      MATCH (p:Product)
      WHERE ${afterId ? 'p.id > $afterId AND' : ''}
            p.is_practical IS NULL
      WITH p ORDER BY p.id
      LIMIT toInteger($limit)
      RETURN p.id AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             p.vendor AS vendor
    `;

    const result = await session.run(query, { limit: Math.floor(limit), afterId: afterId || '' });

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
      price: r.get('price'),
      vendor: r.get('vendor'),
    }));
  } finally {
    await session.close();
  }
}

async function verifyAttributeCoverage(): Promise<{
  total: number;
  withAttributes: number;
  coverage: number;
}> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (all:Product)
      WITH total,
           sum(CASE WHEN all.is_practical IS NOT NULL THEN 1 ELSE 0 END) as withAttributes
      RETURN total, withAttributes
    `);

    const record = result.records[0];
    const total = typeof record.get('total') === 'object'
      ? record.get('total').toNumber()
      : Number(record.get('total'));
    const withAttributes = typeof record.get('withAttributes') === 'object'
      ? record.get('withAttributes').toNumber()
      : Number(record.get('withAttributes'));

    return {
      total,
      withAttributes,
      coverage: total > 0 ? (withAttributes / total) * 100 : 0,
    };
  } finally {
    await session.close();
  }
}

// ============================================================================
// MAIN ENRICHMENT LOOP
// ============================================================================

async function runEnrichment(options: {
  dryRun: boolean;
  batchSize: number;
  limit?: number;
  verbose: boolean;
}) {
  const spinner = ora('Initializing...').start();

  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  ATTRIBUTE-ONLY PRODUCT ENRICHMENT'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

  console.log(`Mode: ${options.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`Provider: ${chalk.cyan('OpenAI gpt-4o-mini')}`);
  console.log(`Batch size: ${chalk.white(options.batchSize)}`);
  console.log(`Min success rate: ${chalk.white((MIN_BATCH_SUCCESS_RATE * 100) + '%')}`);
  if (options.limit) {
    console.log(`Limit: ${chalk.white(options.limit)} products`);
  }
  console.log();

  // Load checkpoint
  let checkpoint = loadCheckpoint();
  if (checkpoint) {
    spinner.succeed(`Resumed from checkpoint (${checkpoint.processedCount} products already processed)`);
  }

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  // Get counts
  spinner.text = 'Counting products...';
  const counts = await countProductsNeedingAttributes();

  // Initialize stats
  const stats: Stats = checkpoint?.stats || {
    totalInDb: counts.total,
    needsAttributes: counts.needsAttributes,
    processedThisRun: 0,
    attributesSet: 0,
    tokensUsed: 0,
    estimatedCost: 0,
    errors: 0,
    startTime: Date.now(),
    lastCheckpoint: Date.now(),
  };

  console.log(chalk.bold('\nDatabase Status:'));
  console.log(`  Total products: ${chalk.white(counts.total.toLocaleString())}`);
  console.log(`  With attributes: ${chalk.green((counts.total - counts.needsAttributes).toLocaleString())}`);
  console.log(`  Needs attributes: ${chalk.yellow(counts.needsAttributes.toLocaleString())}`);

  if (counts.needsAttributes === 0) {
    spinner.succeed(chalk.green('All products already have attributes!'));
    await closeNeo4j();
    return;
  }

  console.log(chalk.bold('\n🚀 Starting attribute enrichment...\n'));

  let lastProcessedId = checkpoint?.lastProcessedId || null;
  let totalProcessed = checkpoint?.processedCount || 0;
  const maxToProcess = options.limit || counts.needsAttributes;

  try {
    // Main loop
    while (totalProcessed < maxToProcess) {
      // Fetch next batch
      const remaining = maxToProcess - totalProcessed;
      const fetchLimit = Math.min(options.batchSize * 2, remaining);

      spinner.text = `Fetching products (${totalProcessed}/${maxToProcess})...`;
      const products = await fetchProductsNeedingAttributes(fetchLimit, lastProcessedId);

      if (products.length === 0) {
        spinner.succeed(chalk.green('No more products to process!'));
        break;
      }

      // Process in batches
      for (let i = 0; i < products.length; i += options.batchSize) {
        const batch = products.slice(i, Math.min(i + options.batchSize, products.length));
        const batchNum = Math.floor(totalProcessed / options.batchSize) + 1;

        spinner.start(`Processing batch #${batchNum} (${batch.length} products)...`);

        try {
          // Call LLM
          const results = await enrichAttributesBatch(batch, options.verbose, stats);

          // Validate batch success
          if (!validateBatchSuccess(results, MIN_BATCH_SUCCESS_RATE)) {
            throw new Error('Batch validation failed - success rate below threshold');
          }

          // Save results
          let attributesInBatch = 0;
          for (const result of results) {
            await saveAttributesToNeo4j(result.productId, result.attributes, options.dryRun);
            const attrCount = Object.keys(result.attributes).length;
            stats.attributesSet += attrCount;
            if (attrCount > 0) {
              attributesInBatch++;
            }
          }

          totalProcessed += batch.length;
          stats.processedThisRun += batch.length;

          // Update last processed ID
          lastProcessedId = batch[batch.length - 1].id;

          // Calculate stats
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.processedThisRun / elapsed;
          const validCount = results.filter(hasValidAttributes).length;
          const successRate = (validCount / batch.length * 100).toFixed(1);

          spinner.succeed(
            `Batch #${batchNum}: ${chalk.green(validCount)}/${batch.length} products (${chalk.cyan(successRate)}%) | ` +
            `Total: ${chalk.white(totalProcessed)}/${maxToProcess} | ` +
            `Rate: ${chalk.white(rate.toFixed(1))}/s | ` +
            `Cost: ${chalk.yellow('$' + stats.estimatedCost.toFixed(4))}`
          );

          if (options.verbose) {
            console.log(chalk.gray(`  Attributes added: ${attributesInBatch} products, ${stats.attributesSet} total attributes`));
          }

          // Save checkpoint every 100 products
          if (totalProcessed % 100 < batch.length && !options.dryRun) {
            saveCheckpoint({
              lastProcessedId,
              processedCount: totalProcessed,
              stats,
              timestamp: new Date().toISOString(),
            });
            console.log(chalk.gray(`  💾 Checkpoint saved`));
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
          spinner.fail(`Batch #${batchNum} failed: ${error.message}`);

          // Save checkpoint on error
          if (!options.dryRun) {
            saveCheckpoint({
              lastProcessedId,
              processedCount: totalProcessed,
              stats,
              timestamp: new Date().toISOString(),
            });
            console.log(chalk.yellow('\n💾 Progress saved. Re-run to continue from checkpoint.'));
          }

          throw error;
        }
      }
    }

    // Verify coverage
    spinner.start('Verifying attribute coverage...');
    const coverage = await verifyAttributeCoverage();
    spinner.succeed('Coverage verification complete');

    // Final summary
    const totalDuration = (Date.now() - stats.startTime) / 1000;

    console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  ENRICHMENT COMPLETE'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

    console.log(chalk.bold.white('Coverage in Database:'));
    console.log(`  Products with attributes: ${chalk.green(coverage.withAttributes.toLocaleString())} / ${coverage.total.toLocaleString()} (${chalk.cyan(coverage.coverage.toFixed(1))}%)`);
    console.log();

    console.log(chalk.white('Processing:'));
    console.log(`  Products processed: ${chalk.green(stats.processedThisRun.toLocaleString())}`);
    console.log(`  Attributes added: ${chalk.green(stats.attributesSet.toLocaleString())}`);
    console.log(`  Errors: ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green(stats.errors)}`);

    console.log(chalk.white('\nLLM Usage:'));
    console.log(`  Tokens: ${chalk.green(stats.tokensUsed.toLocaleString())}`);
    console.log(`  Estimated cost: ${chalk.green('$' + stats.estimatedCost.toFixed(4))}`);

    console.log(chalk.white('\nPerformance:'));
    console.log(`  Total time: ${chalk.green(formatDuration(totalDuration))}`);
    console.log(`  Rate: ${chalk.green((stats.processedThisRun / totalDuration).toFixed(1))} products/s`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes saved'));
    } else {
      console.log(chalk.green('\n✅ All changes saved to database'));
      clearCheckpoint();
    }

  } catch (error) {
    spinner.fail('Enrichment failed');
    console.error(chalk.red('\n❌ Error:'), error);
  } finally {
    await closeNeo4j();
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ${Math.floor(seconds%60)}s`;
  return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`;
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

const options = {
  dryRun: !args.includes('--live'),
  batchSize: args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 20,
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  verbose: args.includes('--verbose'),
};

runEnrichment(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
