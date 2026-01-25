#!/usr/bin/env tsx
/**
 * Product Ingestion Script
 *
 * Ingests all products and facets from data/export/ into Neo4j:
 * - 41,686 products with embeddings
 * - 105,731 facets mapped to graph relationships
 * - Batch processing with progress tracking
 * - Automatic embedding generation (real or mock)
 *
 * Usage:
 *   npx tsx scripts/ingest-products.ts [options]
 *
 * Options:
 *   --batch-size <n>      Products per batch (default: 100)
 *   --skip-embeddings     Skip embedding generation (faster, testing only)
 *   --dry-run             Validate data without writing to Neo4j
 *   --limit <n>           Only ingest first N products (testing)
 *   --progress            Show progress bar
 */

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { initNeo4j, getDriver, getSession } from '../src/lib/neo4j.js';
import { generateEmbedding, generateEmbeddingsBatch } from '../src/lib/llm.js';
import { buildProductId } from '../src/lib/product-id.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';
import chalk from 'chalk';
import Chain from 'stream-chain';
import StreamJson from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration
const CONFIG = {
  batchSize: 10, // Small batches to avoid memory issues with embeddings
  skipEmbeddings: false,
  dryRun: false,
  limit: null as number | null,
  showProgress: true,
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        CONFIG.batchSize = parseInt(args[++i]);
        break;
      case '--skip-embeddings':
        console.error('ERROR: --skip-embeddings flag is disabled.');
        console.error('Mock embeddings destroy recommendation quality.');
        console.error('You must provide a valid OPENAI_API_KEY to generate real embeddings.');
        process.exit(1);
      case '--dry-run':
        CONFIG.dryRun = true;
        break;
      case '--limit':
        CONFIG.limit = parseInt(args[++i]);
        break;
      case '--progress':
        CONFIG.showProgress = true;
        break;
      case '--help':
        console.log(`
Product Ingestion Script

Usage: npx tsx scripts/ingest-products.ts [options]

Options:
  --batch-size <n>      Products per batch (default: 10, small for memory)
  --dry-run             Validate data without writing to Neo4j
  --limit <n>           Only ingest first N products (testing)
  --progress            Show progress bar
  --help                Show this help message

Note: --skip-embeddings flag has been REMOVED. Mock embeddings destroy
recommendation quality. Real OpenAI embeddings are required.
        `);
        process.exit(0);
    }
  }
}

// Product interface matching data structure
interface Product {
  id: string;
  vendor_id: number;
  category_id: number;
  source_website: string;
  handle: string;
  sku: string;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  available: boolean;
  image_url: string;
  product_url: string;
  tags: string[];
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Facet interface
interface Facet {
  product_id: string;
  facet_key: string;
  facet_value: string;
  source: string;
  confidence: string;
}

// Stream product data (memory-efficient)
async function* streamProducts(limit?: number): AsyncGenerator<Product> {
  const productsPath = path.join(process.cwd(), 'data/export/products.json');

  const pipeline = new Chain([
    fs.createReadStream(productsPath),
    StreamJson.parser(),
    new StreamArray(),
  ]);

  let count = 0;
  for await (const { value } of pipeline) {
    if (limit && count >= limit) break;
    yield value as Product;
    count++;
  }
}

// Stream facet data (memory-efficient)
async function* streamFacets(productIds?: Set<string>): AsyncGenerator<Facet> {
  const facetsPath = path.join(process.cwd(), 'data/export/facets.json');

  const pipeline = new Chain([
    fs.createReadStream(facetsPath),
    StreamJson.parser(),
    new StreamArray(),
  ]);

  for await (const { value } of pipeline) {
    const facet = value as Facet;

    // Filter facets if products are limited
    if (productIds && !productIds.has(facet.product_id)) {
      continue;
    }

    yield facet;
  }
}

// Generate semantic query for each embedding type
function generateSemanticQueries(product: Product) {
  const title = product.title || '';
  const description = product.description || '';
  const tags = product.tags?.join(', ') || '';

  // Product embedding: Complete description
  const productQuery = `${title}. ${description}. Tags: ${tags}`;

  // Style embedding: Aesthetic/presentation
  const styleQuery = `Style and aesthetic of: ${title}. Visual presentation: ${tags}`;

  // Sentiment embedding: Emotional tone
  const sentimentQuery = `Emotional tone and sentiment of: ${title}. ${description}`;

  // Use case embedding: Practical applications
  const useCaseQuery = `Use cases and applications for: ${title}. Suitable for: ${tags}`;

  return {
    productQuery: productQuery.slice(0, 500), // Truncate to reasonable length
    styleQuery: styleQuery.slice(0, 500),
    sentimentQuery: sentimentQuery.slice(0, 500),
    useCaseQuery: useCaseQuery.slice(0, 500),
  };
}

// Generate embeddings for a batch of products
async function generateProductEmbeddings(products: Product[]) {
  if (CONFIG.skipEmbeddings) {
    throw new Error('CRITICAL: --skip-embeddings flag is disabled. Mock embeddings destroy recommendation quality. Must use real OpenAI embeddings.');
  }

  // Build all queries
  const allQueries = products.flatMap(p => {
    const queries = generateSemanticQueries(p);
    return [
      queries.productQuery,
      queries.styleQuery,
      queries.sentimentQuery,
      queries.useCaseQuery,
    ];
  });

  // Generate all embeddings in one batch
  const allEmbeddings = await generateEmbeddingsBatch(allQueries, 100);

  // Split back into product sets
  const productEmbeddings = [];
  for (let i = 0; i < products.length; i++) {
    const baseIdx = i * 4;
    productEmbeddings.push({
      product_embedding: allEmbeddings[baseIdx],
      style_embedding: allEmbeddings[baseIdx + 1],
      sentiment_embedding: allEmbeddings[baseIdx + 2],
      use_case_embedding: allEmbeddings[baseIdx + 3],
    });
  }

  return productEmbeddings;
}

// Sleep utility for backoff
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if a product exists in Neo4j (for resume capability)
async function productExists(productId: string): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      'MATCH (p:Product {id: $id}) RETURN p LIMIT 1',
      { id: productId }
    );
    return result.records.length > 0;
  } catch (error) {
    logger.warn('Failed to check product existence', { productId, error });
    return false;
  } finally {
    await session.close();
  }
}

// Get all existing product IDs from Neo4j (for efficient resume)
async function getExistingProductIds(): Promise<Set<string>> {
  const session = getSession();
  const existingIds = new Set<string>();

  try {
    logger.info('Loading existing product IDs from Neo4j...');
    const result = await session.run('MATCH (p:Product) RETURN p.id AS id');

    for (const record of result.records) {
      const id = record.get('id');
      if (id) {
        existingIds.add(id);
      }
    }

    logger.info(`Found ${existingIds.size} existing products`);
    return existingIds;
  } catch (error) {
    logger.warn('Failed to load existing product IDs', { error });
    return existingIds;
  } finally {
    await session.close();
  }
}

// Execute Neo4j query with retry logic
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const errorMessage = error?.message || '';
      const isRetryable =
        errorMessage.includes('Could not perform discovery') ||
        errorMessage.includes('Session expired') ||
        errorMessage.includes('Connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Neo4jError');

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      logger.warn(`Retrying after ${delay.toFixed(0)}ms (attempt ${attempt + 1}/${maxRetries})`, { error: errorMessage });
      await sleep(delay);
    }
  }

  throw lastError;
}

// Health check for Neo4j connection
async function checkNeo4jHealth(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run('RETURN 1 AS health');
    return true;
  } catch (error) {
    logger.error('Neo4j health check failed', { error });
    return false;
  } finally {
    await session.close();
  }
}

// Save checkpoint to track progress
async function saveCheckpoint(productId: string, batchNum: number, successCount: number) {
  const checkpointPath = path.join(process.cwd(), 'data/.ingestion-checkpoint.json');
  const checkpoint = {
    lastProductId: productId,
    batchNum,
    successCount,
    timestamp: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    logger.warn('Failed to save checkpoint', { error });
  }
}

// Load checkpoint to resume from
async function loadCheckpoint(): Promise<{ lastProductId: string; batchNum: number; successCount: number } | null> {
  const checkpointPath = path.join(process.cwd(), 'data/.ingestion-checkpoint.json');

  try {
    if (fs.existsSync(checkpointPath)) {
      const data = fs.readFileSync(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(data);
      logger.info('Resuming from checkpoint', checkpoint);
      return checkpoint;
    }
  } catch (error) {
    logger.warn('Failed to load checkpoint', { error });
  }

  return null;
}

// Clear checkpoint after successful completion
async function clearCheckpoint() {
  const checkpointPath = path.join(process.cwd(), 'data/.ingestion-checkpoint.json');
  try {
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      logger.info('Checkpoint cleared');
    }
  } catch (error) {
    logger.warn('Failed to clear checkpoint', { error });
  }
}

// Ingest products from stream in batches
async function ingestProducts(productStream: AsyncGenerator<Product>, productIds?: Set<string>) {
  const spinner = ora('Ingesting products...').start();

  let successCount = 0;
  let errorCount = 0;
  let batchNum = 0;
  let skippedCount = 0;

  // Load checkpoint to resume from
  const checkpoint = await loadCheckpoint();
  let existingProductIds: Set<string> | null = null;

  if (checkpoint) {
    spinner.info(`Resuming from checkpoint: batch ${checkpoint.batchNum}, ${checkpoint.successCount} products ingested`);
    batchNum = checkpoint.batchNum;
    successCount = checkpoint.successCount;

    // Load all existing product IDs once (much faster than checking each product individually)
    existingProductIds = await getExistingProductIds();
  }

  try {
    let batch: Product[] = [];

    for await (const product of productStream) {
      // Skip products already ingested (resume capability)
      if (existingProductIds && existingProductIds.has(product.id)) {
        skippedCount++;
        if (productIds) {
          productIds.add(product.id);
        }
        continue;
      }

      // Track product IDs for facet filtering
      if (productIds) {
        productIds.add(product.id);
      }

      batch.push(product);

      // Process when batch is full
      if (batch.length >= CONFIG.batchSize) {
        batchNum++;
        spinner.text = `Processing batch ${batchNum} (${successCount} ingested, ${skippedCount} skipped)...`;

        // Health check every 100 batches
        if (batchNum % 100 === 0) {
          const healthy = await checkNeo4jHealth();
          if (!healthy) {
            spinner.warn('Neo4j health check failed, retrying in 5s...');
            await sleep(5000);

            // Retry health check
            const retryHealthy = await checkNeo4jHealth();
            if (!retryHealthy) {
              throw new Error('Neo4j is not healthy after retry. Stopping ingestion.');
            }
          }
        }

        try {
          // Generate embeddings for this batch
          const embeddings = await generateProductEmbeddings(batch);

          // Create Cypher query for batch insert
          const params = batch.map((product, idx) => ({
            id: product.id,
            vendor: product.source_website,
            title: product.title,
            description: product.description || '',
            price: parseFloat(product.price),
            currency: product.currency,
            available: product.available,
            imageUrl: product.image_url,
            url: product.product_url,
            tags: product.tags || [],
            sku: product.sku,
            product_embedding: embeddings[idx].product_embedding,
            style_embedding: embeddings[idx].style_embedding,
            sentiment_embedding: embeddings[idx].sentiment_embedding,
            use_case_embedding: embeddings[idx].use_case_embedding,
          }));

          if (!CONFIG.dryRun) {
            // Create a NEW session for each batch to prevent memory leaks
            await executeWithRetry(async () => {
              const session = getSession();
              try {
                // Use UNWIND for efficient batch insert
                await session.run(`
                  UNWIND $products AS p
                  MERGE (product:Product {id: p.id})
                  SET product.vendor = p.vendor,
                      product.title = p.title,
                      product.description = p.description,
                      product.price = p.price,
                      product.currency = p.currency,
                      product.available = p.available,
                      product.imageUrl = p.imageUrl,
                      product.url = p.url,
                      product.tags = p.tags,
                      product.sku = p.sku,
                      product.product_embedding = p.product_embedding,
                      product.style_embedding = p.style_embedding,
                      product.sentiment_embedding = p.sentiment_embedding,
                      product.use_case_embedding = p.use_case_embedding,
                      product.updated_at = datetime()
                `, { products: params });
              } finally {
                // CRITICAL: Close session immediately after use
                await session.close();
              }
            });
          }

          successCount += batch.length;

          // Save checkpoint every 10 batches
          if (batchNum % 10 === 0) {
            await saveCheckpoint(batch[batch.length - 1].id, batchNum, successCount);
          }

          // Force garbage collection every 10 batches
          if (global.gc && batchNum % 10 === 0) {
            global.gc();
          }

        } catch (error) {
          errorCount += batch.length;
          logger.error(`Batch ${batchNum} failed after retries`, { error });

          // Save checkpoint before failing
          await saveCheckpoint(batch[batch.length - 1].id, batchNum, successCount);
          throw error; // Re-throw to stop processing
        }

        // Clear batch for next iteration
        batch = [];
      }
    }

    // Process remaining products in partial batch
    if (batch.length > 0) {
      batchNum++;
      spinner.text = `Processing final batch ${batchNum} (${batch.length} products)...`;

      try {
        const embeddings = await generateProductEmbeddings(batch);

        const params = batch.map((product, idx) => ({
          id: product.id,
          vendor: product.source_website,
          product_id: buildProductId({
            vendor: product.source_website,
            sku: product.sku,
            url: product.product_url,
            fallbackId: product.id,
          }),
          title: product.title,
          description: product.description || '',
          price: parseFloat(product.price),
          currency: product.currency,
          available: product.available,
          imageUrl: product.image_url,
          url: product.product_url,
          tags: product.tags || [],
          sku: product.sku,
          product_embedding: embeddings[idx].product_embedding,
          style_embedding: embeddings[idx].style_embedding,
          sentiment_embedding: embeddings[idx].sentiment_embedding,
          use_case_embedding: embeddings[idx].use_case_embedding,
        }));

        if (!CONFIG.dryRun) {
          // Create a NEW session for final batch
          await executeWithRetry(async () => {
            const session = getSession();
            try {
              await session.run(`
                UNWIND $products AS p
                MERGE (product:Product {product_id: p.product_id})
                SET product.id = coalesce(product.id, p.id),
                    product.vendor = p.vendor,
                    product.title = p.title,
                    product.description = p.description,
                    product.price = p.price,
                    product.currency = p.currency,
                    product.available = p.available,
                    product.imageUrl = p.imageUrl,
                    product.url = p.url,
                    product.tags = p.tags,
                    product.sku = p.sku,
                    product.product_embedding = p.product_embedding,
                    product.style_embedding = p.style_embedding,
                    product.sentiment_embedding = p.sentiment_embedding,
                    product.use_case_embedding = p.use_case_embedding,
                    product.updated_at = datetime()
              `, { products: params });
            } finally {
              // CRITICAL: Close session immediately after use
              await session.close();
            }
          });
        }

        successCount += batch.length;

        // Force garbage collection for final batch
        if (global.gc) {
          global.gc();
        }

      } catch (error) {
        errorCount += batch.length;
        logger.error(`Final batch ${batchNum} failed after retries`, { error });
        throw error;
      }
    }

    // Clear checkpoint on successful completion
    await clearCheckpoint();

    if (errorCount === 0) {
      spinner.succeed(`Successfully ingested ${chalk.green(successCount)} products${skippedCount > 0 ? ` (${skippedCount} already existed)` : ''}`);
    } else {
      spinner.warn(`Ingested ${chalk.green(successCount)} products, ${chalk.red(errorCount)} failed`);
    }

  } catch (error) {
    spinner.fail('Ingestion stopped due to errors');
    throw error;
  }

  return { successCount, errorCount, skippedCount };
}

// Facet key to relationship type mapping
const FACET_MAPPING: Record<string, {
  nodeLabel: string;
  relationshipType: string;
  property: string;
}> = {
  // Interests (from data: 43,433 facets)
  'interest': {
    nodeLabel: 'Interest',
    relationshipType: 'MATCHES_INTEREST',
    property: 'name',
  },

  // Values (from data: 11,081 facets)
  'value': {
    nodeLabel: 'Value',
    relationshipType: 'ALIGNS_WITH',
    property: 'name',
  },

  // Occasions (from data: 31,662 facets)
  'occasion': {
    nodeLabel: 'Occasion',
    relationshipType: 'SUITABLE_FOR',
    property: 'name',
  },

  // Recipients (from data: 43,057 facets) - these might be useful
  'recipient': {
    nodeLabel: 'RecipientType',
    relationshipType: 'SUITABLE_FOR_RECIPIENT',
    property: 'name',
  },
};

// Ingest facets from stream as graph relationships
async function ingestFacets(facetStream: AsyncGenerator<Facet>) {
  const spinner = ora('Mapping facets to graph relationships...').start();

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  try {
    // Group facets by type
    const facetsByType = new Map<string, Facet[]>();

    for await (const facet of facetStream) {
      const mapping = FACET_MAPPING[facet.facet_key];
      if (!mapping) {
        skippedCount++;
        continue; // Skip unmapped facet types
      }

      if (!facetsByType.has(facet.facet_key)) {
        facetsByType.set(facet.facet_key, []);
      }
      facetsByType.get(facet.facet_key)!.push(facet);

      // Process in batches of 5000 per type to avoid memory buildup
      if (facetsByType.get(facet.facet_key)!.length >= 5000) {
        const facetKey = facet.facet_key;
        const facetList = facetsByType.get(facetKey)!;
        const mapping = FACET_MAPPING[facetKey];

        spinner.text = `Mapping ${facetKey} facets (${successCount} total so far)...`;

        try {
          const params = facetList.map(f => ({
            productId: f.product_id,
            value: f.facet_value,
            confidence: parseFloat(f.confidence),
            source: f.source,
          }));

          if (!CONFIG.dryRun) {
            // Create a NEW session for each batch to prevent memory leaks
            await executeWithRetry(async () => {
              const session = getSession();
              try {
                await session.run(`
                  UNWIND $facets AS f
                  MATCH (product:Product {id: f.productId})
                  MERGE (node:${mapping.nodeLabel} {${mapping.property}: f.value})
                  MERGE (product)-[rel:${mapping.relationshipType}]->(node)
                  SET rel.relevance_score = f.confidence,
                      rel.source = f.source
                `, { facets: params });
              } finally {
                // CRITICAL: Close session immediately after use
                await session.close();
              }
            });
          }

          successCount += facetList.length;

        } catch (error) {
          errorCount += facetList.length;
          logger.error(`Failed to process ${facetKey} facets`, { error });
        }

        // Clear processed batch
        facetsByType.set(facetKey, []);
      }
    }

    spinner.text = `Processing remaining facets...`;

    // Process remaining facets
    for (const [facetKey, facetList] of facetsByType.entries()) {
      if (facetList.length === 0) continue;

      const mapping = FACET_MAPPING[facetKey];

      spinner.text = `Mapping final ${facetKey} facets...`;

      try {
        const params = facetList.map(facet => ({
          productId: facet.product_id,
          value: facet.facet_value,
          confidence: parseFloat(facet.confidence),
          source: facet.source,
        }));

        if (!CONFIG.dryRun) {
          // Create a NEW session for final batch
          await executeWithRetry(async () => {
            const session = getSession();
            try {
              await session.run(`
                UNWIND $facets AS f
                MATCH (product:Product {id: f.productId})
                MERGE (node:${mapping.nodeLabel} {${mapping.property}: f.value})
                MERGE (product)-[rel:${mapping.relationshipType}]->(node)
                SET rel.relevance_score = f.confidence,
                    rel.source = f.source
              `, { facets: params });
            } finally {
              // CRITICAL: Close session immediately after use
              await session.close();
            }
          });
        }

        successCount += facetList.length;

      } catch (error) {
        errorCount += facetList.length;
        logger.error(`Failed to process ${facetKey} facets`, { error });
      }
    }

    spinner.succeed(
      `Mapped ${chalk.green(successCount)} facets, ` +
      `${chalk.yellow(skippedCount)} skipped (unmapped types), ` +
      `${errorCount > 0 ? chalk.red(errorCount) + ' failed' : ''}`
    );

  } catch (error) {
    spinner.fail('Facet mapping stopped due to errors');
    throw error;
  }

  return { successCount, errorCount, skippedCount };
}

// Main ingestion flow
async function main() {
  parseArgs();

  console.log(chalk.bold.cyan('\n🎁 Product Ingestion Script\n'));

  console.log('Configuration:');
  console.log(`  Batch size: ${chalk.cyan(CONFIG.batchSize)}`);
  console.log(`  Skip embeddings: ${CONFIG.skipEmbeddings ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Dry run: ${CONFIG.dryRun ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Limit: ${CONFIG.limit ? chalk.cyan(CONFIG.limit) : chalk.gray('None')}\n`);

  const startTime = Date.now();

  try {
    // Initialize Neo4j connection
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    // Step 1: Ingest products with embeddings (streaming)
    // Note: We track product IDs during ingestion for facet filtering
    const productIds = new Set<string>();
    const productStats = await ingestProducts(streamProducts(CONFIG.limit), productIds);

    console.log(); // Spacing

    // Step 2: Map facets to relationships (streaming)
    const facetStats = await ingestFacets(
      streamFacets(CONFIG.limit ? productIds : undefined)
    );

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(chalk.bold.green('\n✅ Ingestion Complete!\n'));
    console.log('Summary:');
    console.log(`  Products: ${chalk.green(productStats.successCount)} ingested, ${productStats.errorCount > 0 ? chalk.red(productStats.errorCount) + ' failed' : chalk.green('0 failed')}`);
    console.log(`  Facets: ${chalk.green(facetStats.successCount)} mapped, ${chalk.yellow(facetStats.skippedCount)} skipped, ${facetStats.errorCount > 0 ? chalk.red(facetStats.errorCount) + ' failed' : chalk.green('0 failed')}`);
    console.log(`  Total time: ${chalk.cyan(totalTime + 's')}`);

    if (CONFIG.dryRun) {
      console.log(chalk.yellow('\n⚠️  Dry run mode - no data was written to Neo4j\n'));
    }

    if (!CONFIG.skipEmbeddings && !CONFIG.dryRun) {
      console.log(chalk.dim('\nNote: Real embeddings were generated. Check logs for any OpenAI fallback messages.\n'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Ingestion failed:\n'));
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
// Note: import.meta.url check for ESM
const isMainModule = process.argv[1]?.includes('ingest-products');
if (isMainModule) {
  main().catch((error) => {
    console.error(chalk.red('\n❌ Fatal error:\n'));
    console.error(error);
    process.exit(1);
  });
}

export { main as ingestProducts };
