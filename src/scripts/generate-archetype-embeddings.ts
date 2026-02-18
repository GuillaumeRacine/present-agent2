#!/usr/bin/env tsx
/**
 * Generate Archetype Embeddings for Products
 *
 * Creates semantic embeddings from active is_* attribute flags, enabling
 * semantic similarity matching based on gift archetypes.
 *
 * Phase 3: Archetype Embeddings for Semantic Search
 *
 * Usage:
 *   tsx scripts/generate-archetype-embeddings.ts              # Dry run
 *   tsx scripts/generate-archetype-embeddings.ts --live       # Apply changes
 *   tsx scripts/generate-archetype-embeddings.ts --limit 100  # Test mode
 *   tsx scripts/generate-archetype-embeddings.ts --resume     # Resume from checkpoint
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { generateEmbedding } from '../src/lib/llm.js';
import { logger } from '../src/lib/logger.js';
import { GiftAttributes } from '../src/types/gift-attributes.js';
import ora from 'ora';
import * as fs from 'fs';

interface Product {
  id: string;
  title: string;
  attributes: Partial<GiftAttributes>;
}

interface CheckpointData {
  processedIds: string[];
  stats: {
    processed: number;
    withEmbeddings: number;
    withoutAttributes: number;
    failed: number;
    totalTokens: number;
  };
  timestamp: string;
}

const CHECKPOINT_FILE = '.archetype-embeddings-checkpoint.json';

/**
 * Load checkpoint data for resuming
 */
function loadCheckpoint(): CheckpointData | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      const checkpoint = JSON.parse(data);
      logger.info(`Loaded checkpoint from ${checkpoint.timestamp}`, {
        processed: checkpoint.stats.processed
      });
      return checkpoint;
    }
  } catch (error) {
    logger.warn('Failed to load checkpoint, starting fresh', { error });
  }
  return null;
}

/**
 * Save checkpoint data
 */
function saveCheckpoint(data: CheckpointData) {
  try {
    data.timestamp = new Date().toISOString();
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
    logger.debug('Checkpoint saved', { processed: data.stats.processed });
  } catch (error) {
    logger.warn('Failed to save checkpoint', { error });
  }
}

/**
 * Clear checkpoint file
 */
function clearCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
      logger.info('Checkpoint cleared');
    }
  } catch (error) {
    logger.warn('Failed to clear checkpoint', { error });
  }
}

/**
 * Extract active is_* attributes from product properties
 */
function extractActiveAttributes(properties: Record<string, any>): string[] {
  const activeAttrs: string[] = [];

  for (const [key, value] of Object.entries(properties)) {
    // Look for is_* properties that are true
    if (key.startsWith('is_') && value === true) {
      // Convert snake_case to readable text: is_experiential -> experiential
      const attrName = key.replace(/^is_/, '').replace(/_/g, ' ');
      activeAttrs.push(attrName);
    }
  }

  return activeAttrs;
}

/**
 * Generate archetype text from active attributes
 *
 * Converts boolean attributes like [isPractical, isLuxury, isDurable]
 * into semantic text: "practical luxury durable"
 */
function generateArchetypeText(activeAttributes: string[]): string {
  if (activeAttributes.length === 0) {
    return '';
  }

  // Join attributes with commas for better semantic understanding
  return activeAttributes.join(', ');
}

/**
 * Generate and store archetype embeddings for all products
 */
async function generateArchetypeEmbeddings(
  limit?: number,
  dryRun: boolean = false,
  resume: boolean = false
) {
  const spinner = ora('Initializing...').start();

  // Load checkpoint if resuming
  let checkpoint: CheckpointData | null = null;
  if (resume) {
    checkpoint = loadCheckpoint();
    if (checkpoint) {
      spinner.succeed(`Resuming from checkpoint (${checkpoint.processedIds.length} products already processed)`);
    } else {
      spinner.info('No checkpoint found, starting fresh');
    }
  }

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Fetch products
    spinner.text = 'Fetching products...';
    const query = limit
      ? `MATCH (p:Product) RETURN p LIMIT ${limit}`
      : `MATCH (p:Product) RETURN p`;

    const result = await session.run(query);
    let products = result.records.map(r => {
      const props = r.get('p').properties;
      return {
        id: props.id,
        title: props.title,
        properties: props,
      };
    });

    // Filter out already processed products if resuming
    if (checkpoint) {
      const processedIds = new Set(checkpoint.processedIds);
      products = products.filter(p => !processedIds.has(p.id));
      spinner.succeed(`Found ${products.length} products to process (${checkpoint.processedIds.length} already done)`);
    } else {
      spinner.succeed(`Found ${products.length} products`);
    }

    if (products.length === 0) {
      console.log('\n✅ No products to process!');
      return;
    }

    console.log(`\n${dryRun ? '🧪 DRY RUN' : '🔄 LIVE'} - Processing ${products.length} products\n`);

    let processed = checkpoint?.stats.processed || 0;
    let withEmbeddings = checkpoint?.stats.withEmbeddings || 0;
    let withoutAttributes = checkpoint?.stats.withoutAttributes || 0;
    let failed = checkpoint?.stats.failed || 0;
    let totalTokens = checkpoint?.stats.totalTokens || 0;
    const processedIds: string[] = checkpoint?.processedIds || [];

    // Processing configuration
    const BATCH_SIZE = 50; // Process 50 at a time for checkpoint saving
    const CHECKPOINT_INTERVAL = 100; // Save checkpoint every 100 products

    const startTime = Date.now();

    // Process products sequentially (embeddings API doesn't support true batching)
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        spinner.start(`Processing: ${processed + 1}/${products.length + (checkpoint?.stats.processed || 0)} - ${product.title.substring(0, 50)}...`);

        // Extract active attributes
        const activeAttributes = extractActiveAttributes(product.properties);

        if (activeAttributes.length === 0) {
          // No attributes - skip this product
          withoutAttributes++;
          processed++;
          processedIds.push(product.id);
          spinner.succeed(`Skipped (no attributes): ${product.title.substring(0, 50)}...`);
          continue;
        }

        // Generate archetype text
        const archetypeText = generateArchetypeText(activeAttributes);

        // Estimate tokens (rough: ~1 token per 4 characters)
        const estimatedTokens = Math.ceil(archetypeText.length / 4);
        totalTokens += estimatedTokens;

        if (dryRun) {
          // Dry run - just log what we would do
          spinner.succeed(`[DRY RUN] Would embed: "${archetypeText.substring(0, 80)}..." (${activeAttributes.length} attrs)`);
        } else {
          // Generate embedding
          const embedding = await generateEmbedding(archetypeText);

          // Store in Neo4j
          const updateSession = driver.session();
          try {
            await updateSession.run(
              `MATCH (p:Product {id: $productId})
               SET p.archetype_embedding = $embedding,
                   p.archetype_text = $archetypeText,
                   p.archetype_attribute_count = $attributeCount,
                   p.archetype_updated_at = datetime()
               RETURN p`,
              {
                productId: product.id,
                embedding: embedding,
                archetypeText: archetypeText,
                attributeCount: activeAttributes.length
              }
            );

            withEmbeddings++;
            spinner.succeed(`Embedded (${activeAttributes.length} attrs): ${product.title.substring(0, 50)}...`);
          } finally {
            await updateSession.close();
          }
        }

        processed++;
        processedIds.push(product.id);

        // Save checkpoint periodically
        if (!dryRun && processed % CHECKPOINT_INTERVAL === 0) {
          saveCheckpoint({
            processedIds,
            stats: { processed, withEmbeddings, withoutAttributes, failed, totalTokens },
            timestamp: new Date().toISOString()
          });
        }

      } catch (error: any) {
        failed++;
        processed++;
        spinner.fail(`Failed: ${product.title.substring(0, 50)}... - ${error.message}`);
        logger.error('Failed to generate archetype embedding', {
          productId: product.id,
          error: error.message
        });
      }

      // Rate limiting - avoid overwhelming the API
      if (i < products.length - 1 && !dryRun) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    // Final statistics
    const totalProducts = products.length + (checkpoint?.stats.processed || 0);
    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

    console.log('\n📊 Summary:\n');
    console.log(`Total products: ${totalProducts}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Products with embeddings: ${withEmbeddings} (${((withEmbeddings / totalProducts) * 100).toFixed(1)}%)`);
    console.log(`Products without attributes: ${withoutAttributes} (${((withoutAttributes / totalProducts) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Time: ${elapsedMin}m ${elapsedSec}s`);

    if (!dryRun) {
      // Estimate cost (OpenAI: $0.02/1M tokens for text-embedding-3-small)
      const estimatedCost = (totalTokens * 0.02) / 1000000;
      console.log(`\n💰 Embedding Usage:`);
      console.log(`Estimated tokens: ${totalTokens.toLocaleString()}`);
      console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);
      console.log(`Avg attributes per product: ${(withEmbeddings > 0 ? totalTokens / withEmbeddings : 0).toFixed(1)}`);

      // Clear checkpoint on successful completion
      clearCheckpoint();
      console.log('\n✅ Checkpoint cleared (run completed successfully)');
    } else {
      console.log('\n⚠️  This was a DRY RUN. Use --live to apply changes.');
    }

  } catch (error) {
    spinner.fail('Process failed');
    logger.error('Archetype embedding generation failed', { error });
    throw error;
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined;
const dryRun = !args.includes('--live');
const resume = args.includes('--resume');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🎯 Generate Archetype Embeddings (Phase 3)            ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}
${limit ? `Limit: First ${limit} products` : 'Processing: ALL products'}
${resume ? 'Resume: Yes (will continue from checkpoint)' : 'Resume: No (fresh start)'}

Process:
1. Extract active is_* attributes from each product
2. Convert to semantic text (e.g., "practical, luxury, durable")
3. Generate text-embedding-3-small embeddings
4. Store as product.archetype_embedding for semantic search

${dryRun ? '\nUse --live flag to apply changes' : ''}
${!resume ? '\nUse --resume flag to continue from checkpoint' : ''}
`);

generateArchetypeEmbeddings(limit, dryRun, resume).catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
