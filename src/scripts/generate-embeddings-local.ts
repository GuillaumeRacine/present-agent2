/**
 * Generate Embeddings for Local Neo4j Products
 *
 * Finds all Product nodes without embeddings and generates them via OpenAI.
 * Works with products loaded by the Python enrichment pipeline (keyed by product_url).
 *
 * Generates 1 embedding per product (combined title + description + tags).
 * Creates a vector index for semantic search.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings-local.ts
 *   npx tsx scripts/generate-embeddings-local.ts --limit 100    # Test with 100
 *   npx tsx scripts/generate-embeddings-local.ts --batch-size 50
 *   npx tsx scripts/generate-embeddings-local.ts --check        # Show status only
 *
 * Cost estimate: ~65K products × ~100 tokens avg = ~6.5M tokens ≈ $0.13
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';
import { generateEmbeddingsBatch } from '../src/lib/openai.js';
import { logger } from '../src/lib/logger.js';

const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const CHECK_ONLY = process.argv.includes('--check');

async function createVectorIndex() {
  const session = getSession();
  try {
    // Create vector index for product embeddings (1536 dim, cosine)
    await session.run(`
      CREATE VECTOR INDEX product_embedding IF NOT EXISTS
      FOR (p:Product) ON (p.embedding)
      OPTIONS {indexConfig: {
        \`vector.dimensions\`: 1536,
        \`vector.similarity_function\`: 'cosine'
      }}
    `);
    console.log('  Vector index: product_embedding [OK]');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('equivalent')) {
      console.log('  Vector index: product_embedding [EXISTS]');
    } else {
      console.error('  Vector index error:', error.message);
    }
  } finally {
    await session.close();
  }
}

async function checkStatus() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (p:Product)
      RETURN
        count(p) AS total,
        count(p.embedding) AS with_embedding,
        count(p) - count(p.embedding) AS without_embedding
    `);
    const r = result.records[0];
    console.log(`\n  Total products:       ${r.get('total')}`);
    console.log(`  With embeddings:      ${r.get('with_embedding')}`);
    console.log(`  Without embeddings:   ${r.get('without_embedding')}`);
    return {
      total: r.get('total') as number,
      withEmbedding: r.get('with_embedding') as number,
      withoutEmbedding: r.get('without_embedding') as number,
    };
  } finally {
    await session.close();
  }
}

async function main() {
  const startTime = Date.now();

  await initNeo4j({
    uri: process.env.NEO4J_URL || process.env.NEO4J_URI!,
    username: process.env.NEO4J_USER || process.env.NEO4J_USERNAME!,
    password: process.env.NEO4J_PASSWORD!,
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  console.log('\n=== Generate Embeddings for Local Neo4j ===\n');

  // Create vector index
  await createVectorIndex();

  // Check status
  const status = await checkStatus();

  if (CHECK_ONLY) {
    await closeNeo4j();
    return;
  }

  if (status.withoutEmbedding === 0) {
    console.log('\n  All products already have embeddings!');
    await closeNeo4j();
    return;
  }

  const toProcess = LIMIT > 0 ? Math.min(LIMIT, status.withoutEmbedding) : status.withoutEmbedding;
  const estimatedTokens = toProcess * 100; // ~100 tokens per product
  const estimatedCost = estimatedTokens * 0.00000002; // $0.02 per 1M tokens

  console.log(`\n  Will process: ${toProcess} products`);
  console.log(`  Batch size:   ${BATCH_SIZE}`);
  console.log(`  Est. cost:    $${estimatedCost.toFixed(2)}`);
  console.log(`  Est. time:    ${Math.ceil(toProcess / BATCH_SIZE * 2 / 60)} minutes\n`);

  // Fetch products without embeddings
  const session = getSession();
  let processed = 0;

  try {
    const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : '';
    const result = await session.run(`
      MATCH (p:Product)
      WHERE p.embedding IS NULL
      RETURN p.product_url AS url, p.title AS title, p.description AS desc,
             p.tags AS tags, p.brand_url AS brand
      ORDER BY p.popularity_score DESC
      ${limitClause}
    `);

    const products = result.records.map(r => ({
      url: r.get('url') as string,
      title: r.get('title') as string || '',
      desc: r.get('desc') as string || '',
      tags: r.get('tags') as string[] || [],
      brand: r.get('brand') as string || '',
    }));

    console.log(`  Fetched ${products.length} products to embed\n`);

    // Process in batches
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batchStart = Date.now();

      // Build embedding text for each product
      const texts = batch.map(p => {
        const parts = [p.title];
        if (p.desc) parts.push(p.desc.substring(0, 500));
        if (p.tags && p.tags.length > 0) parts.push(`Tags: ${p.tags.join(', ')}`);
        return parts.join('. ').substring(0, 8000);
      });

      // Generate embeddings via OpenAI
      const embeddings = await generateEmbeddingsBatch(texts, BATCH_SIZE);

      // Store in Neo4j
      const writeSession = getSession();
      try {
        for (let j = 0; j < batch.length; j++) {
          await writeSession.run(`
            MATCH (p:Product {product_url: $url})
            SET p.embedding = $embedding
          `, {
            url: batch[j].url,
            embedding: embeddings[j],
          });
        }
      } finally {
        await writeSession.close();
      }

      processed += batch.length;
      const batchTime = Date.now() - batchStart;
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = (products.length - processed) / rate;

      process.stdout.write(
        `\r  Batch ${batchNum}/${totalBatches} | ` +
        `${processed}/${products.length} | ` +
        `${batchTime}ms | ` +
        `${rate.toFixed(0)}/sec | ` +
        `ETA: ${Math.ceil(eta)}s`
      );
    }

  } finally {
    await session.close();
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n\n  Done! ${processed} embeddings in ${totalTime.toFixed(1)}s`);

  // Final status
  await checkStatus();
  await closeNeo4j();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
