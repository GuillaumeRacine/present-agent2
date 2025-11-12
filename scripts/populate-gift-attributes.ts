#!/usr/bin/env tsx
/**
 * Populate Gift Attributes for Products
 *
 * Infers gift attributes (experiential, practical, sentimental, etc.)
 * from product titles, descriptions, and interests.
 *
 * Supports two modes:
 * - Keyword-based (fast, 39.2% coverage)
 * - LLM-based (slower, 95%+ coverage)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { inferAttributesFromProduct, inferAttributesFromProductLLM } from '../src/types/gift-attributes.js';
import ora from 'ora';
import fs from 'fs';

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  interests: string[];
}

interface CheckpointData {
  processedIds: string[];
  stats: {
    processed: number;
    withAttributes: number;
    failed: number;
    totalTokens: number;
  };
}

const CHECKPOINT_FILE = '.gift-attributes-checkpoint.json';

function loadCheckpoint(): CheckpointData | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load checkpoint, starting fresh');
  }
  return null;
}

function saveCheckpoint(data: CheckpointData) {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Failed to save checkpoint');
  }
}

function clearCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    console.warn('Failed to clear checkpoint');
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function populateGiftAttributes(
  limit?: number,
  dryRun: boolean = false,
  useLLM: boolean = false,
  resume: boolean = false
) {
  const spinner = ora('Initializing...').start();

  // Load checkpoint if resuming
  let checkpoint: CheckpointData | null = null;
  if (resume && useLLM) {
    checkpoint = loadCheckpoint();
    if (checkpoint) {
      spinner.succeed(`Resuming from checkpoint (${checkpoint.processedIds.length} products already processed)`);
    } else {
      spinner.info('No checkpoint found, starting fresh');
    }
  }

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Get products
    spinner.text = 'Fetching products...';
    const query = limit
      ? `MATCH (p:Product)
         OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
         WITH p, COLLECT(i.name) AS interests
         RETURN p, interests
         LIMIT ${limit}`
      : `MATCH (p:Product)
         OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
         WITH p, COLLECT(i.name) AS interests
         RETURN p, interests`;

    const result = await session.run(query);
    let products = result.records.map(r => {
      const props = r.get('p').properties;
      return {
        id: props.id,
        title: props.title,
        description: props.description || '',
        price: props.price,
        vendor: props.vendor,
        interests: r.get('interests') || [],
      } as Product;
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
      console.log('\n✅ No products found!');
      return;
    }

    console.log(`\n${dryRun ? '🧪 DRY RUN' : '🔄 LIVE'} - Processing ${products.length} products`);
    console.log(`Mode: ${useLLM ? '🤖 LLM-based inference' : '🔤 Keyword-based inference'}\n`);

    let processed = checkpoint?.stats.processed || 0;
    let withAttributes = checkpoint?.stats.withAttributes || 0;
    let failed = checkpoint?.stats.failed || 0;
    let totalTokens = checkpoint?.stats.totalTokens || 0;
    const processedIds: string[] = checkpoint?.processedIds || [];

    // LLM rate limiting (100 requests per minute = 600ms per request)
    const LLM_DELAY_MS = 600;
    const CHECKPOINT_INTERVAL = 100; // Save checkpoint every 100 products

    // Process products
    const startTime = Date.now();
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        spinner.start(`${useLLM ? 'LLM inference' : 'Processing'}: ${processed + 1}/${products.length + (checkpoint?.stats.processed || 0)}`);

        // Infer attributes (LLM or keyword-based)
        let attributes;
        if (useLLM) {
          attributes = await inferAttributesFromProductLLM(product);

          // Rate limiting for LLM
          if (i < products.length - 1) {
            await sleep(LLM_DELAY_MS);
          }

          // Estimate tokens (rough: ~3 tokens per word)
          const estimatedTokens = Math.ceil(
            (product.title.split(' ').length +
             (product.description || '').split(' ').length) * 3
          );
          totalTokens += estimatedTokens;
        } else {
          attributes = inferAttributesFromProduct(product);
        }

        if (Object.keys(attributes).length > 0) {
          withAttributes++;

          if (!dryRun) {
            // Update product in Neo4j
            await session.run(`
              MATCH (p:Product {id: $productId})
              SET p.is_experiential = $isExperiential,
                  p.is_memory_making = $isMemoryMaking,
                  p.is_sentimental = $isSentimental,
                  p.is_personalized = $isPersonalized,
                  p.is_practical = $isPractical,
                  p.is_luxury = $isLuxury,
                  p.is_aspirational = $isAspirational,
                  p.is_educational = $isEducational,
                  p.is_shared = $isShared,
                  p.is_conversation_starter = $isConversationStarter,
                  p.is_lasting_value = $isLastingValue,
                  p.is_consumable = $isConsumable,
                  p.is_artistic = $isArtistic,
                  p.is_minimalist = $isMinimalist,
                  p.attributes_updated_at = datetime()
            `, {
              productId: product.id,
              isExperiential: attributes.isExperiential || false,
              isMemoryMaking: attributes.isMemoryMaking || false,
              isSentimental: attributes.isSentimental || false,
              isPersonalized: attributes.isPersonalized || false,
              isPractical: attributes.isPractical || false,
              isLuxury: attributes.isLuxury || false,
              isAspirational: attributes.isAspirational || false,
              isEducational: attributes.isEducational || false,
              isShared: attributes.isShared || false,
              isConversationStarter: attributes.isConversationStarter || false,
              isLastingValue: attributes.isLastingValue || false,
              isConsumable: attributes.isConsumable || false,
              isArtistic: attributes.isArtistic || false,
              isMinimalist: attributes.isMinimalist || false,
            });
          } else {
            // Dry run - log sample
            if (processed < 5) {
              const attrNames = Object.keys(attributes).filter(k => attributes[k as keyof typeof attributes]);
              console.log(`  [DRY RUN] ${product.title.substring(0, 50)}... → [${attrNames.join(', ')}]`);
            }
          }
        }

        processed++;
        processedIds.push(product.id);

        // Save checkpoint periodically (only for LLM mode)
        if (useLLM && !dryRun && processed % CHECKPOINT_INTERVAL === 0) {
          saveCheckpoint({
            processedIds,
            stats: { processed, withAttributes, failed, totalTokens }
          });
        }

        spinner.succeed(`Processed ${processed}/${products.length + (checkpoint?.stats.processed || 0)} products`);

      } catch (error) {
        spinner.fail(`Product failed: ${error}`);
        failed++;
      }
    }

    const totalProducts = products.length + (checkpoint?.stats.processed || 0);
    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

    console.log('\n📊 Summary:\n');
    console.log(`Total products: ${totalProducts}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Products with attributes: ${withAttributes} (${((withAttributes / totalProducts) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Time: ${elapsedMin}m ${elapsedSec}s`);

    if (useLLM) {
      // Estimate cost (GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens)
      // Assuming ~500 input tokens + 100 output tokens per product
      const estimatedCost = (totalTokens * 0.15 / 1000000) + (processed * 100 * 0.60 / 1000000);
      console.log(`\n💰 LLM Usage:`);
      console.log(`Estimated tokens: ${totalTokens.toLocaleString()}`);
      console.log(`Estimated cost: $${estimatedCost.toFixed(2)}`);
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. Use --live to apply changes.');
    } else if (useLLM) {
      // Clear checkpoint on successful completion
      clearCheckpoint();
      console.log('\n✅ Checkpoint cleared (run completed successfully)');
    }

  } catch (error) {
    spinner.fail('Process failed');
    console.error(error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined;
const dryRun = !args.includes('--live');
const useLLM = args.includes('--use-llm');
const resume = args.includes('--resume');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🎁 Populate Gift Attributes                          ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}
Method: ${useLLM ? '🤖 LLM-based inference (gpt-4o-mini)' : '🔤 Keyword-based inference'}
${limit ? `Limit: First ${limit} products` : 'Processing: ALL products'}
${resume ? 'Resume: Yes (will continue from checkpoint)' : ''}
${dryRun ? '\nUse --live flag to apply changes' : ''}
${!useLLM ? '\nUse --use-llm flag to enable LLM-based inference' : ''}
`);

populateGiftAttributes(limit, dryRun, useLLM, resume).catch(console.error);
