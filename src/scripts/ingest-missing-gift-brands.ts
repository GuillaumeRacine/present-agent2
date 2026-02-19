#!/usr/bin/env tsx
/**
 * Ingest Missing Gift Brands
 *
 * Loads gift-curated products from all_gifts_skus.csv for brands
 * not yet in Neo4j. Generates embeddings and links to graph nodes.
 *
 * Source: ~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/all_gifts_skus.csv
 * Contains 20 missing brands with ~3,400 gift-specific products.
 *
 * Usage:
 *   tsx scripts/ingest-missing-gift-brands.ts                # Dry run
 *   tsx scripts/ingest-missing-gift-brands.ts --live          # Load products
 *   tsx scripts/ingest-missing-gift-brands.ts --live --embed  # Load + generate embeddings
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { generateEmbedding } from '../src/lib/llm.js';
import { logger } from '../src/lib/logger.js';

/** Simple CSV parser — handles quoted fields with commas */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }
    records.push(record);
  }

  return records;
}

const LIVE = process.argv.includes('--live');
const EMBED = process.argv.includes('--embed');

const CSV_PATH = path.join(
  process.env.HOME || '/Users/gui',
  'Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/all_gifts_skus.csv'
);

// Batch size for Neo4j operations
const BATCH_SIZE = 100;
// Batch size for embedding generation (OpenAI limit)
const EMBED_BATCH_SIZE = 20;

interface GiftProduct {
  brandUrl: string;
  productUrl: string;
  title: string;
  description: string;
  price: number;
  priceUsd: number;
  category: string;
  materialTags: string[];
  styleTags: string[];
  budgetCategory: string;
  inStock: boolean;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  INGEST MISSING GIFT BRANDS ${LIVE ? (EMBED ? '(LIVE + EMBED)' : '(LIVE)') : '(DRY RUN)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`Read ${records.length} records from CSV`);

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
    // Get existing brand domains from Neo4j
    const existingResult = await session.run(
      `MATCH (p:Product) RETURN DISTINCT p.brand_url AS brand`
    );
    const existingBrands = new Set<string>();
    for (const record of existingResult.records) {
      const b = record.get('brand');
      if (b) {
        existingBrands.add(normalizeDomain(b));
      }
    }
    console.log(`Existing brands in Neo4j: ${existingBrands.size}`);

    // Get existing product URLs to avoid duplicates
    const existingProductsResult = await session.run(
      `MATCH (p:Product) RETURN DISTINCT p.product_url AS url`
    );
    const existingProducts = new Set<string>();
    for (const record of existingProductsResult.records) {
      const url = record.get('url');
      if (url) existingProducts.add(url.toLowerCase());
    }
    console.log(`Existing products in Neo4j: ${existingProducts.size}`);

    // Parse and filter products
    const products: GiftProduct[] = [];
    const skippedBrands = new Set<string>();
    const skippedDupes = new Set<string>();

    for (const row of records) {
      const brandUrl = (row['Brand Url'] || '').trim();
      const productUrl = (row['Product Url'] || '').trim();
      const title = (row['Product Title'] || '').trim();
      const price = parseFloat(row['Price'] || '0');
      const priceUsd = parseFloat(row['Price USD'] || row['Price'] || '0');

      if (!brandUrl || !productUrl || !title) continue;

      const brandDomain = normalizeDomain(brandUrl);

      // Skip if brand already in Neo4j
      if (existingBrands.has(brandDomain)) {
        skippedBrands.add(brandDomain);
        continue;
      }

      // Skip if product already in Neo4j
      if (existingProducts.has(productUrl.toLowerCase())) {
        skippedDupes.add(productUrl);
        continue;
      }

      // Skip out of stock
      if ((row['Stock'] || '').toUpperCase() === 'FALSE') continue;

      // Skip products with no meaningful title
      if (title.length < 3) continue;

      // Parse tags
      const materialTags = (row['Material Tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      const styleTags = (row['Style Tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean);

      products.push({
        brandUrl,
        productUrl,
        title,
        description: (row['Description'] || '').trim().slice(0, 1000),
        price: priceUsd > 0 ? priceUsd : price,
        priceUsd,
        category: (row['Category'] || '').trim(),
        materialTags,
        styleTags,
        budgetCategory: (row['Budget Category'] || '').trim(),
        inStock: true,
      });
    }

    console.log(`\nSkipped ${skippedBrands.size} brands already in Neo4j`);
    console.log(`Skipped ${skippedDupes.size} duplicate products`);
    console.log(`Products to load: ${products.length}`);

    // Group by brand for reporting
    const brandGroups = new Map<string, GiftProduct[]>();
    for (const p of products) {
      const domain = normalizeDomain(p.brandUrl);
      if (!brandGroups.has(domain)) brandGroups.set(domain, []);
      brandGroups.get(domain)!.push(p);
    }

    console.log(`\nBrands to load (${brandGroups.size}):`);
    const sortedBrands = [...brandGroups.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [domain, prods] of sortedBrands) {
      const prices = prods.map(p => p.price).filter(p => p > 0);
      const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      console.log(`  ${prods.length.toString().padStart(4)} products — ${domain} (avg $${avgPrice.toFixed(0)})`);
    }

    if (!LIVE) {
      console.log(`\nRun with --live to load products into Neo4j.`);
      console.log(`Run with --live --embed to also generate embeddings.`);
      await session.close();
      await closeNeo4j();
      return;
    }

    // LOAD PRODUCTS into Neo4j
    console.log(`\nLoading ${products.length} products into Neo4j...`);
    let loaded = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      const params = batch.map(p => ({
        product_url: p.productUrl,
        title: p.title,
        description: p.description,
        price: p.price,
        brand_url: p.brandUrl,
        currency: 'USD',
        tags: [...p.materialTags, ...p.styleTags].join(', '),
        materials: p.materialTags.join(', '),
        category_source: p.category,
        budget_category: p.budgetCategory,
        gift_suitability_score: 70, // Gift-curated products start at 70
        popularity_score: 50,
        gift_proven: true, // They're in a gift-curated list
      }));

      await session.run(
        `UNWIND $products AS p
         MERGE (product:Product {product_url: p.product_url})
         ON CREATE SET
           product.title = p.title,
           product.description = p.description,
           product.price = p.price,
           product.brand_url = p.brand_url,
           product.currency = p.currency,
           product.tags = p.tags,
           product.materials = p.materials,
           product.gift_suitability_score = p.gift_suitability_score,
           product.popularity_score = p.popularity_score,
           product.gift_proven = p.gift_proven,
           product.source = 'gift_skus_csv',
           product.ingested_at = datetime()
         ON MATCH SET
           product.gift_proven = true`,
        { products: params }
      );

      loaded += batch.length;
      if (loaded % 500 === 0 || loaded === products.length) {
        console.log(`  Loaded ${loaded}/${products.length} products`);
      }
    }

    console.log(`\nProduct loading complete: ${loaded} products`);

    // GENERATE EMBEDDINGS if requested
    if (EMBED) {
      console.log(`\nGenerating embeddings for new products...`);

      // Find products without embeddings
      const noEmbedResult = await session.run(
        `MATCH (p:Product)
         WHERE p.source = 'gift_skus_csv' AND p.embedding IS NULL
         RETURN p.product_url AS url, p.title AS title, p.description AS desc
         LIMIT 5000`
      );

      const toEmbed = noEmbedResult.records.map(r => ({
        url: r.get('url'),
        title: r.get('title') || '',
        desc: (r.get('desc') || '').slice(0, 500),
      }));

      console.log(`Products needing embeddings: ${toEmbed.length}`);

      let embedded = 0;
      for (let i = 0; i < toEmbed.length; i += EMBED_BATCH_SIZE) {
        const batch = toEmbed.slice(i, i + EMBED_BATCH_SIZE);

        // Generate embeddings
        const texts = batch.map(p => `${p.title}. ${p.desc}`.trim());
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
        if (embedded % 100 === 0 || i + EMBED_BATCH_SIZE >= toEmbed.length) {
          console.log(`  Embedded ${embedded}/${toEmbed.length} products`);
        }

        // Rate limit: small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`\nEmbedding generation complete: ${embedded} products`);
    }

    // LINK TO GRAPH NODES
    console.log(`\nLinking new products to Interest/Category/Occasion/Relationship nodes...`);

    // Run the existing enrichment scripts' logic inline
    // Link to interests via text matching
    const interestResult = await session.run(
      `MATCH (i:Interest)
       MATCH (p:Product)
       WHERE p.source = 'gift_skus_csv'
         AND NOT (p)-[:MATCHES_INTEREST]->(i)
         AND (toLower(p.title) CONTAINS toLower(i.name)
              OR toLower(COALESCE(p.description, '')) CONTAINS toLower(i.name))
       CREATE (p)-[:MATCHES_INTEREST {relevance_score: 0.7, source: 'text-match-ingest'}]->(i)
       RETURN count(*) AS created`
    );
    const interestLinks = interestResult.records[0]?.get('created')?.toNumber?.() || interestResult.records[0]?.get('created') || 0;
    console.log(`  MATCHES_INTEREST links created: ${interestLinks}`);

    // Link to categories
    const categoryResult = await session.run(
      `MATCH (c:Category)
       MATCH (p:Product)
       WHERE p.source = 'gift_skus_csv'
         AND NOT (p)-[:IN_CATEGORY]->(c)
         AND (toLower(p.title) CONTAINS toLower(c.name)
              OR toLower(COALESCE(p.description, '')) CONTAINS toLower(c.name))
       CREATE (p)-[:IN_CATEGORY]->(c)
       RETURN count(*) AS created`
    );
    const categoryLinks = categoryResult.records[0]?.get('created')?.toNumber?.() || categoryResult.records[0]?.get('created') || 0;
    console.log(`  IN_CATEGORY links created: ${categoryLinks}`);

    // Link to occasions (gift-curated products → all occasions with universal relevance)
    const occasionResult = await session.run(
      `MATCH (occ:GiftOccasion)
       MATCH (p:Product)
       WHERE p.source = 'gift_skus_csv'
         AND NOT (p)-[:GIFT_FOR_OCCASION]->(occ)
         AND occ.name IN ['birthday', 'christmas', 'thank_you', 'just_because']
       CREATE (p)-[:GIFT_FOR_OCCASION {score: 0.7, source: 'gift-curated'}]->(occ)
       RETURN count(*) AS created`
    );
    const occasionLinks = occasionResult.records[0]?.get('created')?.toNumber?.() || occasionResult.records[0]?.get('created') || 0;
    console.log(`  GIFT_FOR_OCCASION links created: ${occasionLinks}`);

    // Link to relationships (gift products → universal relationships)
    const relationshipResult = await session.run(
      `MATCH (rel:GiftRelationship)
       MATCH (p:Product)
       WHERE p.source = 'gift_skus_csv'
         AND NOT (p)-[:GIFT_FOR_RELATIONSHIP]->(rel)
         AND rel.name IN ['friend', 'coworker', 'partner']
       CREATE (p)-[:GIFT_FOR_RELATIONSHIP {score: 0.6, source: 'gift-curated'}]->(rel)
       RETURN count(*) AS created`
    );
    const relationshipLinks = relationshipResult.records[0]?.get('created')?.toNumber?.() || relationshipResult.records[0]?.get('created') || 0;
    console.log(`  GIFT_FOR_RELATIONSHIP links created: ${relationshipLinks}`);

    // SUMMARY
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  SUMMARY`);
    console.log(`${'='.repeat(60)}`);

    const finalCount = await session.run(
      `MATCH (p:Product) WHERE p.source = 'gift_skus_csv' RETURN count(p) AS total`
    );
    const total = finalCount.records[0]?.get('total')?.toNumber?.() || finalCount.records[0]?.get('total') || 0;

    const embeddedCount = await session.run(
      `MATCH (p:Product) WHERE p.source = 'gift_skus_csv' AND p.embedding IS NOT NULL RETURN count(p) AS total`
    );
    const withEmbeddings = embeddedCount.records[0]?.get('total')?.toNumber?.() || embeddedCount.records[0]?.get('total') || 0;

    const totalProducts = await session.run(`MATCH (p:Product) RETURN count(p) AS total`);
    const grandTotal = totalProducts.records[0]?.get('total')?.toNumber?.() || totalProducts.records[0]?.get('total') || 0;

    console.log(`  New products loaded: ${loaded}`);
    console.log(`  With embeddings: ${withEmbeddings}`);
    console.log(`  Interest links: ${interestLinks}`);
    console.log(`  Category links: ${categoryLinks}`);
    console.log(`  Occasion links: ${occasionLinks}`);
    console.log(`  Relationship links: ${relationshipLinks}`);
    console.log(`  Total products in DB: ${grandTotal}`);

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

function normalizeDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
  }
}

main().catch(console.error);
