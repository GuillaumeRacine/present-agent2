#!/usr/bin/env tsx
/**
 * ATTRIBUTE-FOCUSED Product Enrichment Script
 *
 * This script specifically enriches products that are missing gift attributes.
 * It's optimized for the critical gap: only 6% of products have attributes.
 *
 * KEY FEATURES:
 * - Skips products that already have 3+ attributes
 * - Focuses LLM calls ONLY on attribute determination
 * - Uses efficient batching for cost savings
 * - Multi-provider failover with retry logic
 *
 * USAGE:
 *   npx tsx scripts/enrich-attributes-focused.ts [options]
 *
 * OPTIONS:
 *   --live              Apply changes (default: dry-run)
 *   --batch-size N      Products per LLM call (default: 20)
 *   --concurrency N     Parallel batches (default: 3)
 *   --target N          Stop after enriching N products (default: all)
 *   --verbose           Show detailed LLM logs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { chatCompletion } from '../src/lib/llm.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  attributeCount: number;
}

interface AttributeResult {
  productId: string;
  attributes: Record<string, boolean>;
}

interface Stats {
  totalProcessed: number;
  attributesAdded: number;
  tokensUsed: number;
  estimatedCost: number;
  errors: number;
  startTime: number;
  providerUsage: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GIFT_ATTRIBUTES = [
  'isExperiential', 'isMemoryMaking', 'isSentimental', 'isPersonalized',
  'isPractical', 'isLuxury', 'isConsumable', 'isArtistic', 'isMinimalist',
  'isShared', 'isConversationStarter', 'isEducational', 'isHandcrafted',
  'isLastingValue', 'isEcoFriendly',
] as const;

const PROVIDER_COSTS = {
  gemini: 0.075,
  openai: 0.15,
  anthropic: 0.25,
};

// ============================================================================
// PROVIDER MANAGEMENT
// ============================================================================

const geminiClient = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '')
  : null;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const providers: Record<string, { available: boolean; failures: number; cooldownUntil: number }> = {
  gemini: { available: !!geminiClient, failures: 0, cooldownUntil: 0 },
  openai: { available: !!process.env.OPENAI_API_KEY, failures: 0, cooldownUntil: 0 },
  anthropic: { available: !!anthropicClient, failures: 0, cooldownUntil: 0 },
};

function selectProvider(): string | null {
  const now = Date.now();
  const order = ['gemini', 'openai', 'anthropic'];

  for (const name of order) {
    const provider = providers[name];
    if (provider.available && provider.cooldownUntil < now) {
      return name;
    }
  }
  return null;
}

function markProviderFailed(name: string, error: any): void {
  const provider = providers[name];
  if (!provider) return;

  provider.failures++;
  const isRateLimit = error?.status === 429 || error?.message?.includes('429');

  if (isRateLimit || provider.failures >= 3) {
    const cooldownMs = Math.min(30000 * Math.pow(2, provider.failures - 1), 300000);
    provider.cooldownUntil = Date.now() + cooldownMs;
    console.log(chalk.yellow(`  ⏸️  ${name} on cooldown for ${cooldownMs/1000}s`));
  }
}

function markProviderSuccess(name: string): void {
  const provider = providers[name];
  if (provider) provider.failures = 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// LLM CALLS
// ============================================================================

async function callGemini(prompt: string): Promise<string> {
  if (!geminiClient) throw new Error('Gemini not available');
  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.0-flash', // Fixed: correct model name (was gemini-1.5-flash-latest which doesn't exist)
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callOpenAI(prompt: string): Promise<string> {
  return await chatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    jsonMode: true,
  });
}

async function callAnthropic(prompt: string): Promise<string> {
  if (!anthropicClient) throw new Error('Anthropic not available');
  const response = await anthropicClient.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

async function callLLMWithRetry(
  prompt: string,
  maxAttempts: number = 5
): Promise<{ response: string; provider: string; tokens: number }> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const providerName = selectProvider();

    if (!providerName) {
      const shortestCooldown = Math.min(
        ...Object.values(providers)
          .filter(p => p.available)
          .map(p => p.cooldownUntil - Date.now())
      );
      if (shortestCooldown > 0) {
        await sleep(shortestCooldown + 1000);
        continue;
      }
      throw new Error('No LLM providers available');
    }

    try {
      let response: string;
      switch (providerName) {
        case 'gemini': response = await callGemini(prompt); break;
        case 'anthropic': response = await callAnthropic(prompt); break;
        default: response = await callOpenAI(prompt);
      }

      markProviderSuccess(providerName);
      const tokens = Math.ceil((prompt.length + response.length) / 4);
      return { response, provider: providerName, tokens };

    } catch (error: any) {
      lastError = error;
      markProviderFailed(providerName, error);
      await sleep(1000 * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// ============================================================================
// ATTRIBUTE ENRICHMENT
// ============================================================================

function generateAttributePrompt(products: Product[]): string {
  const productList = products.map((p, idx) =>
    `${idx + 1}. "${p.title}" ($${p.price || 'N/A'}) - ${(p.description || '').substring(0, 200)}`
  ).join('\n\n');

  return `Analyze these ${products.length} gift products and determine their gift attributes.

PRODUCTS:
${productList}

For EACH product, determine which attributes apply (true/false):
- isExperiential: Experience or activity vs physical item
- isMemoryMaking: Creates lasting memories (photos, albums, keepsakes)
- isSentimental: Emotional/heartfelt value
- isPersonalized: Custom/engraved/monogrammed
- isPractical: Useful/functional for everyday life
- isLuxury: Premium/high-end/exclusive ($100+)
- isConsumable: Used up (food, candles, cosmetics)
- isArtistic: Art, sculpture, creative work
- isMinimalist: Simple, clean, understated design
- isShared: For groups/sharing (games, food platters)
- isConversationStarter: Unique/quirky/interesting
- isEducational: Learning/courses/books
- isHandcrafted: Handmade/artisan
- isLastingValue: Durable/heirloom quality
- isEcoFriendly: Sustainable/organic/ethical

Return JSON array (same order as products):
[{"productIndex":1,"attributes":{"isPractical":true,"isLuxury":false,...}}]

Return exactly ${products.length} objects with ALL attributes.`;
}

async function enrichAttributesBatch(
  products: Product[],
  stats: Stats
): Promise<AttributeResult[]> {
  const prompt = generateAttributePrompt(products);

  try {
    const { response, provider, tokens } = await callLLMWithRetry(prompt);

    stats.tokensUsed += tokens;
    stats.providerUsage[provider] = (stats.providerUsage[provider] || 0) + products.length;

    const costPerToken = PROVIDER_COSTS[provider as keyof typeof PROVIDER_COSTS] || 0.15;
    stats.estimatedCost += tokens * costPerToken / 1_000_000;

    const parsed = JSON.parse(response);
    const results: AttributeResult[] = [];

    for (let i = 0; i < products.length; i++) {
      const llmResult = parsed[i] || {};
      const attributes: Record<string, boolean> = {};

      if (llmResult.attributes && typeof llmResult.attributes === 'object') {
        for (const attr of GIFT_ATTRIBUTES) {
          if (llmResult.attributes[attr] === true) {
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
    throw error;
  }
}

async function enrichAttributesWithRetry(
  products: Product[],
  stats: Stats,
  maxRetries: number = 3
): Promise<AttributeResult[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const results = await enrichAttributesBatch(products, stats);

      // Validate - must have enriched at least 80% of products
      const validCount = results.filter(r => Object.keys(r.attributes).length > 0).length;
      const successRate = validCount / products.length;

      if (successRate < 0.8) {
        throw new Error(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
      }

      return results;

    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        console.log(chalk.yellow(`  ⚠️  Retry ${attempt + 1}/${maxRetries - 1}: ${error.message}`));
        await sleep(2000 * Math.pow(2, attempt));
      } else {
        throw error;
      }
    }
  }

  throw new Error('All retries failed');
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function saveAttributesToNeo4j(
  productId: string,
  attributes: Record<string, boolean>,
  dryRun: boolean
): Promise<void> {
  if (dryRun || Object.keys(attributes).length === 0) return;

  const driver = getDriver();
  const session = driver.session();

  try {
    await session.run(
      `MATCH (p:Product {id: $productId})
       SET p += $attributes,
           p.attributes_updated_at = datetime()`,
      { productId, attributes }
    );
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
            (p.isPractical IS NULL
             OR size([attr IN keys(p) WHERE attr IN $attributeNames AND p[attr] = true]) < 3)
      WITH p ORDER BY p.id
      LIMIT toInteger($limit)
      RETURN p.id AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             p.vendor AS vendor,
             size([attr IN keys(p) WHERE attr IN $attributeNames AND p[attr] = true]) AS attributeCount
    `;

    const result = await session.run(query, {
      limit: Math.floor(limit),
      afterId: afterId || '',
      attributeNames: Array.from(GIFT_ATTRIBUTES),
    });

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
      price: r.get('price'),
      vendor: r.get('vendor'),
      attributeCount: typeof r.get('attributeCount') === 'object'
        ? r.get('attributeCount').toNumber()
        : Number(r.get('attributeCount')),
    }));
  } finally {
    await session.close();
  }
}

async function countProductsNeedingAttributes(): Promise<number> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WHERE p.isPractical IS NULL
         OR size([attr IN keys(p) WHERE attr IN $attributeNames AND p[attr] = true]) < 3
      RETURN count(p) as total
    `, { attributeNames: Array.from(GIFT_ATTRIBUTES) });

    const total = result.records[0].get('total');
    return typeof total === 'object' && total.toNumber ? total.toNumber() : Number(total);
  } finally {
    await session.close();
  }
}

// ============================================================================
// MAIN ENRICHMENT
// ============================================================================

async function runAttributeEnrichment(options: {
  dryRun: boolean;
  batchSize: number;
  concurrency: number;
  target?: number;
  verbose: boolean;
}) {
  const spinner = ora('Initializing...').start();

  // Check providers
  const availableProviders = Object.entries(providers)
    .filter(([_, p]) => p.available)
    .map(([name]) => name);

  if (availableProviders.length === 0) {
    spinner.fail('No LLM providers available');
    return;
  }

  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  ATTRIBUTE-FOCUSED PRODUCT ENRICHMENT'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

  console.log(`Mode: ${options.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`Providers: ${availableProviders.map(p => chalk.cyan(p)).join(', ')}`);
  console.log(`Batch size: ${chalk.white(options.batchSize)} | Concurrency: ${chalk.white(options.concurrency)}\n`);

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  // Count products
  spinner.text = 'Counting products needing attributes...';
  const totalToProcess = await countProductsNeedingAttributes();
  const targetCount = options.target ? Math.min(options.target, totalToProcess) : totalToProcess;

  spinner.succeed(`Found ${chalk.yellow(totalToProcess.toLocaleString())} products needing attribute enrichment`);

  if (totalToProcess === 0) {
    console.log(chalk.green('\n✅ All products already have attributes!'));
    await closeNeo4j();
    return;
  }

  const stats: Stats = {
    totalProcessed: 0,
    attributesAdded: 0,
    tokensUsed: 0,
    estimatedCost: 0,
    errors: 0,
    startTime: Date.now(),
    providerUsage: {},
  };

  console.log(chalk.bold('\n🚀 Starting attribute enrichment...\n'));

  let lastProcessedId: string | null = null;

  try {
    while (stats.totalProcessed < targetCount) {
      const remaining = targetCount - stats.totalProcessed;
      const fetchSize = Math.min(options.batchSize * options.concurrency * 2, remaining);

      spinner.text = `Fetching products (${stats.totalProcessed}/${targetCount})...`;
      const products = await fetchProductsNeedingAttributes(fetchSize, lastProcessedId);

      if (products.length === 0) {
        spinner.succeed('No more products to process');
        break;
      }

      // Process in concurrent batches
      for (let i = 0; i < products.length && stats.totalProcessed < targetCount; i += options.batchSize * options.concurrency) {
        const batches: Product[][] = [];

        for (let j = 0; j < options.concurrency; j++) {
          const start = i + (j * options.batchSize);
          const end = Math.min(start + options.batchSize, products.length, start + (targetCount - stats.totalProcessed));
          if (start < products.length && start < end) {
            batches.push(products.slice(start, end));
          }
        }

        // Process batches
        const results = await Promise.all(
          batches.map(batch => enrichAttributesWithRetry(batch, stats))
        );

        // Save results
        for (const batchResults of results) {
          for (const result of batchResults) {
            await saveAttributesToNeo4j(result.productId, result.attributes, options.dryRun);
            stats.attributesAdded += Object.keys(result.attributes).length;
            stats.totalProcessed++;
          }
        }

        // Update last ID
        const lastBatch = batches[batches.length - 1];
        if (lastBatch && lastBatch.length > 0) {
          lastProcessedId = lastBatch[lastBatch.length - 1].id;
        }

        // Progress display
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.totalProcessed / elapsed;
        const remaining = targetCount - stats.totalProcessed;
        const eta = remaining > 0 ? Math.ceil(remaining / rate) : 0;
        const etaStr = eta > 60 ? `${Math.floor(eta/60)}m ${eta%60}s` : `${eta}s`;

        spinner.succeed(
          `Progress: ${chalk.green(stats.totalProcessed.toLocaleString())}/${targetCount.toLocaleString()} ` +
          `(${chalk.cyan((stats.totalProcessed/targetCount*100).toFixed(1))}%) | ` +
          `Rate: ${chalk.white(rate.toFixed(1))}/s | ` +
          `Attrs: ${chalk.green(stats.attributesAdded.toLocaleString())} | ` +
          `Cost: ${chalk.yellow('$' + stats.estimatedCost.toFixed(3))} | ` +
          `ETA: ${chalk.cyan(etaStr)}`
        );

        await sleep(200);
      }
    }

    // Final summary
    const totalDuration = (Date.now() - stats.startTime) / 1000;

    console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  ENRICHMENT COMPLETE'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

    console.log(chalk.white('Results:'));
    console.log(`  Products processed: ${chalk.green(stats.totalProcessed.toLocaleString())}`);
    console.log(`  Attributes added: ${chalk.green(stats.attributesAdded.toLocaleString())}`);
    console.log(`  Avg per product: ${chalk.white((stats.attributesAdded / stats.totalProcessed).toFixed(1))}`);

    console.log(chalk.white('\nLLM Usage:'));
    console.log(`  Tokens: ${chalk.green(stats.tokensUsed.toLocaleString())}`);
    console.log(`  Cost: ${chalk.green('$' + stats.estimatedCost.toFixed(3))}`);
    console.log(`  Errors: ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green(stats.errors)}`);

    if (Object.keys(stats.providerUsage).length > 0) {
      console.log(chalk.white('\nProvider Usage:'));
      for (const [provider, count] of Object.entries(stats.providerUsage)) {
        console.log(`  ${provider}: ${chalk.white(count.toLocaleString())} products`);
      }
    }

    console.log(chalk.white('\nPerformance:'));
    console.log(`  Duration: ${chalk.green((totalDuration / 60).toFixed(1))} minutes`);
    console.log(`  Rate: ${chalk.green((stats.totalProcessed / totalDuration).toFixed(1))} products/s`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes saved'));
    } else {
      console.log(chalk.green('\n✅ All changes saved to database'));
    }

  } catch (error) {
    spinner.fail('Enrichment failed');
    console.error(chalk.red('\n❌ Error:'), error);
  } finally {
    await closeNeo4j();
  }
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

const options = {
  dryRun: !args.includes('--live'),
  batchSize: args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 20,
  concurrency: args.includes('--concurrency') ? parseInt(args[args.indexOf('--concurrency') + 1]) : 3,
  target: args.includes('--target') ? parseInt(args[args.indexOf('--target') + 1]) : undefined,
  verbose: args.includes('--verbose'),
};

runAttributeEnrichment(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
