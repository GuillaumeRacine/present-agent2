#!/usr/bin/env tsx
/**
 * Fix Products Without Interests
 * Re-extracts interests for products that don't have any
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { InterestExtractor } from '../src/services/interest-extractor.js';
import ora from 'ora';

function toInt(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value.toInt === 'function') return value.toInt();
  return 0;
}

async function fixOrphanedProducts(limit?: number, dryRun: boolean = false) {
  const spinner = ora('Initializing...').start();

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const extractor = new InterestExtractor(openai);
  const driver = getDriver();
  const session = driver.session();

  try {
    // Find orphaned products
    spinner.text = 'Finding products without interests...';
    const query = limit
      ? `MATCH (p:Product) WHERE NOT (p)-[:MATCHES_INTEREST]->() RETURN p LIMIT ${limit}`
      : `MATCH (p:Product) WHERE NOT (p)-[:MATCHES_INTEREST]->() RETURN p`;

    const result = await session.run(query);
    const products = result.records.map(r => r.get('p').properties);

    spinner.succeed(`Found ${products.length} products without interests`);

    if (products.length === 0) {
      console.log('\n✅ All products have interests!');
      return;
    }

    console.log(`\n${dryRun ? '🧪 DRY RUN' : '🔄 LIVE'} - Processing ${products.length} products\n`);

    let processed = 0;
    let failed = 0;

    // Process in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      spinner.start(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);

      try {
        // Extract interests
        const results = await extractor.extractBatch(batch);

        // Store in Neo4j
        if (!dryRun) {
          for (const extractResult of results) {
            if (extractResult.interests.length > 0) {
              await session.run(`
                UNWIND $interests AS interest
                MERGE (i:Interest {name: interest.name})
                ON CREATE SET i.category = interest.category, i.created_at = datetime()

                WITH i, interest
                MATCH (p:Product {id: $productId})
                MERGE (p)-[r:MATCHES_INTEREST]->(i)
                SET r.relevance_score = interest.relevanceScore,
                    r.confidence = interest.confidence,
                    r.reasoning = interest.reasoning,
                    r.extracted_at = datetime(),
                    r.extraction_method = 'llm_v2'
              `, {
                productId: extractResult.productId,
                interests: extractResult.interests,
              });
              processed++;
            } else {
              failed++;
            }
          }
        } else {
          // Dry run - just count
          results.forEach(r => {
            if (r.interests.length > 0) {
              processed++;
              console.log(`  [DRY RUN] Would add ${r.interests.length} interests to product ${r.productId.substring(0, 20)}...`);
            } else {
              failed++;
            }
          });
        }

        spinner.succeed(`Processed ${processed + failed}/${products.length} products`);

      } catch (error) {
        spinner.fail(`Batch failed: ${error}`);
        failed += batch.length;
      }
    }

    console.log('\n📊 Summary:\n');
    console.log(`Total products: ${products.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${failed}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. Use --live to apply changes.');
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

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🔧 Fix Products Without Interests                    ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}
${limit ? `Limit: First ${limit} products` : 'Processing: ALL orphaned products'}
${dryRun ? '\nUse --live flag to apply changes' : ''}
`);

fixOrphanedProducts(limit, dryRun).catch(console.error);
