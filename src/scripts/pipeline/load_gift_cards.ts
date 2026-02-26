#!/usr/bin/env tsx
/**
 * Load Gift Cards into Neo4j
 *
 * Reads curated gift card products from JSONL and loads them into Neo4j.
 * Supports price ranges (min_price / max_price) for flexible denominations.
 *
 * Usage:
 *   npx tsx scripts/pipeline/load_gift_cards.ts              # Dry run
 *   npx tsx scripts/pipeline/load_gift_cards.ts --live        # Load products
 *   npx tsx scripts/pipeline/load_gift_cards.ts --live --embed # Load + generate embeddings
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initNeo4j, getDriver, closeNeo4j } from '../../src/lib/neo4j.js';
import { generateEmbedding } from '../../src/lib/llm.js';
import { logger } from '../../src/lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE = process.argv.includes('--live');
const EMBED = process.argv.includes('--embed');

const JSONL_PATH = path.resolve(__dirname, '../../../data/pipeline/gift_cards_manual.jsonl');

const BATCH_SIZE = 50;
const EMBED_BATCH_SIZE = 20;

interface GiftCardProduct {
  source: string;
  source_product_id: string;
  canonical_url: string;
  product_url: string;
  title: string;
  description: string;
  brand: string;
  brand_url: string;
  price: number;
  min_price: number;
  max_price: number;
  currency: string;
  availability: string;
  images: string[];
  categories_raw: string[];
  tags_raw: string[];
  is_bestseller: boolean;
  gift_proven: boolean;
  popularity_score: number;
  is_digital: boolean;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  LOAD GIFT CARDS ${LIVE ? (EMBED ? '(LIVE + EMBED)' : '(LIVE)') : '(DRY RUN)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Read JSONL
  if (!fs.existsSync(JSONL_PATH)) {
    console.error(`JSONL not found: ${JSONL_PATH}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(JSONL_PATH, 'utf-8')
    .split('\n')
    .filter(line => line.trim().length > 0);

  const products: GiftCardProduct[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const product = JSON.parse(lines[i]) as GiftCardProduct;
      products.push(product);
    } catch (err) {
      console.error(`Line ${i + 1}: Invalid JSON — ${(err as Error).message}`);
    }
  }

  console.log(`Read ${products.length} gift card products from JSONL`);

  // Summary by category
  const categoryCounts = new Map<string, number>();
  for (const p of products) {
    const cat = p.categories_raw?.[1] || p.categories_raw?.[0] || 'Unknown';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  console.log(`\nCategories:`);
  for (const [cat, count] of [...categoryCounts.entries()].sort()) {
    console.log(`  ${count.toString().padStart(3)} — ${cat}`);
  }

  // Price range summary
  const priceRanges = products.map(p => `$${p.min_price}-$${p.max_price}`);
  const uniqueRanges = [...new Set(priceRanges)].sort();
  console.log(`\nPrice ranges: ${uniqueRanges.join(', ')}`);
  console.log(`Avg popularity: ${Math.round(products.reduce((s, p) => s + p.popularity_score, 0) / products.length)}`);
  console.log(`Bestsellers: ${products.filter(p => p.is_bestseller).length}/${products.length}`);

  if (!LIVE) {
    console.log(`\nDry run complete. Use --live to load into Neo4j.`);
    return;
  }

  // Connect to Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  const driver = getDriver();
  const session = driver.session();

  try {
    // Load products in batches
    console.log(`\nLoading ${products.length} gift cards into Neo4j...`);
    let loaded = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      const params = batch.map(p => ({
        product_url: p.product_url,
        title: p.title,
        description: p.description,
        price: p.price,
        min_price: p.min_price,
        max_price: p.max_price,
        brand_url: p.brand_url,
        currency: p.currency || 'USD',
        images: (p.images || []).join('|'),
        tags: (p.tags_raw || []).join(', '),
        categories: (p.categories_raw || []).join(', '),
        gift_suitability_score: 85, // Gift cards are inherently gift-suitable
        popularity_score: p.popularity_score,
        gift_proven: p.gift_proven,
        is_bestseller: p.is_bestseller,
        is_digital: p.is_digital,
        source: p.source,
        source_product_id: p.source_product_id,
      }));

      await session.run(
        `UNWIND $products AS p
         MERGE (product:Product {product_url: p.product_url})
         ON CREATE SET
           product.title = p.title,
           product.description = p.description,
           product.price = p.price,
           product.min_price = p.min_price,
           product.max_price = p.max_price,
           product.brand_url = p.brand_url,
           product.currency = p.currency,
           product.images = p.images,
           product.tags = p.tags,
           product.categories = p.categories,
           product.gift_suitability_score = p.gift_suitability_score,
           product.popularity_score = p.popularity_score,
           product.gift_proven = p.gift_proven,
           product.is_bestseller = p.is_bestseller,
           product.is_digital = p.is_digital,
           product.source = p.source,
           product.source_product_id = p.source_product_id,
           product.available = true,
           product.ingested_at = datetime()
         ON MATCH SET
           product.title = p.title,
           product.description = p.description,
           product.price = p.price,
           product.min_price = p.min_price,
           product.max_price = p.max_price,
           product.gift_proven = p.gift_proven,
           product.is_bestseller = p.is_bestseller,
           product.is_digital = p.is_digital,
           product.available = true`,
        { products: params }
      );

      loaded += batch.length;
      console.log(`  Loaded ${loaded}/${products.length} products`);
    }

    console.log(`\nProduct loading complete: ${loaded} products`);

    // Generate embeddings if requested
    if (EMBED) {
      console.log(`\nGenerating embeddings for gift card products...`);

      // Find gift card products without embeddings
      const noEmbedResult = await session.run(
        `MATCH (p:Product)
         WHERE p.source = 'gift_card_manual' AND p.embedding IS NULL
         RETURN p.product_url AS url, p.title AS title, p.description AS desc, p.tags AS tags
         LIMIT 200`
      );

      const toEmbed = noEmbedResult.records.map(r => ({
        url: r.get('url'),
        title: r.get('title') || '',
        desc: (r.get('desc') || '').slice(0, 500),
        tags: r.get('tags') || '',
      }));

      console.log(`Products needing embeddings: ${toEmbed.length}`);

      let embedded = 0;
      for (let i = 0; i < toEmbed.length; i += EMBED_BATCH_SIZE) {
        const batch = toEmbed.slice(i, i + EMBED_BATCH_SIZE);

        // Enriched embedding text: title + description + tags for better vector quality
        const texts = batch.map(p =>
          `${p.title} gift card. ${p.desc}. Perfect gift for: ${p.tags}`.trim()
        );
        const embeddings: number[][] = [];

        for (const text of texts) {
          try {
            const emb = await generateEmbedding(text);
            embeddings.push(emb);
          } catch (err) {
            logger.warn(`Embedding failed for "${text.slice(0, 50)}"`, { error: err });
            embeddings.push([]);
          }
        }

        // Write embeddings to Neo4j
        const updateParams = batch.map((p, idx) => ({
          url: p.url,
          embedding: embeddings[idx],
        })).filter(p => p.embedding.length > 0);

        if (updateParams.length > 0) {
          await session.run(
            `UNWIND $items AS item
             MATCH (p:Product {product_url: item.url})
             SET p.embedding = item.embedding`,
            { items: updateParams }
          );
        }

        embedded += updateParams.length;
        console.log(`  Embedded ${embedded}/${toEmbed.length} products`);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`\nEmbedding generation complete: ${embedded} products`);
    }

    // Verify
    const countResult = await session.run(
      `MATCH (p:Product) WHERE p.source = 'gift_card_manual'
       RETURN count(p) AS total,
              count(CASE WHEN p.embedding IS NOT NULL THEN 1 END) AS embedded,
              count(CASE WHEN p.min_price IS NOT NULL THEN 1 END) AS withPriceRange`
    );
    const totals = countResult.records[0];
    console.log(`\nVerification:`);
    console.log(`  Total gift cards: ${totals.get('total')}`);
    console.log(`  With embeddings: ${totals.get('embedded')}`);
    console.log(`  With price range: ${totals.get('withPriceRange')}`);

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
