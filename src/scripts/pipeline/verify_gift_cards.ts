#!/usr/bin/env tsx
/**
 * Verify gift card enrichment quality
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../../src/lib/neo4j.js';

async function main() {
  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  const driver = getDriver();
  const session = driver.session();

  // 1. Overall counts
  const counts = await session.run(`
    MATCH (p:Product) WHERE p.source = 'gift_card_manual'
    RETURN count(p) AS total,
           count(CASE WHEN p.embedding IS NOT NULL THEN 1 END) AS embedded,
           count(CASE WHEN p.min_price IS NOT NULL THEN 1 END) AS withPriceRange,
           count(CASE WHEN p.is_digital = true THEN 1 END) AS digital,
           count(CASE WHEN p.available = true THEN 1 END) AS available,
           count(CASE WHEN p.is_practical = true THEN 1 END) AS withAttributes
  `);
  const c = counts.records[0];
  console.log(`\n=== Gift Card Database Status ===`);
  console.log(`Total: ${c.get('total')}`);
  console.log(`Embedded: ${c.get('embedded')}`);
  console.log(`With price range: ${c.get('withPriceRange')}`);
  console.log(`Digital: ${c.get('digital')}`);
  console.log(`Available: ${c.get('available')}`);
  console.log(`With attributes: ${c.get('withAttributes')}`);

  // 2. Enrichment coverage
  const enrichment = await session.run(`
    MATCH (p:Product) WHERE p.source = 'gift_card_manual'
    OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
    OPTIONAL MATCH (p)-[:IN_CATEGORY]->(cat:Category)
    OPTIONAL MATCH (p)-[:GIFT_FOR_OCCASION]->(o:GiftOccasion)
    OPTIONAL MATCH (p)-[:GIFT_FOR_RELATIONSHIP]->(r:GiftRelationship)
    RETURN p.title AS title,
           count(DISTINCT i) AS interests,
           count(DISTINCT cat) AS categories,
           count(DISTINCT o) AS occasions,
           count(DISTINCT r) AS relationships
    ORDER BY interests ASC
  `);

  console.log(`\n=== Per-Product Enrichment ===`);
  let lowInterest = 0;
  for (const rec of enrichment.records) {
    const toNum = (v: any) => typeof v === 'object' && v.toNumber ? v.toNumber() : Number(v);
    const i = toNum(rec.get('interests'));
    const cat = toNum(rec.get('categories'));
    const o = toNum(rec.get('occasions'));
    const r = toNum(rec.get('relationships'));
    if (i <= 1) lowInterest++;
    console.log(`  ${rec.get('title').padEnd(42)} I:${String(i).padStart(2)} C:${String(cat).padStart(2)} O:${String(o).padStart(2)} R:${String(r).padStart(2)}`);
  }
  console.log(`\nLow-interest (<=1): ${lowInterest} products`);

  // 3. Top interests
  const topInterests = await session.run(`
    MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
    WHERE p.source = 'gift_card_manual'
    RETURN i.name AS interest, count(p) AS cnt
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.log(`\n=== Top Interests Across Gift Cards ===`);
  for (const rec of topInterests.records) {
    console.log(`  ${rec.get('interest').padEnd(20)} ${rec.get('cnt')} products`);
  }

  // 4. Price range distribution
  const priceRanges = await session.run(`
    MATCH (p:Product) WHERE p.source = 'gift_card_manual'
    RETURN p.min_price AS minP, p.max_price AS maxP, count(p) AS cnt
    ORDER BY minP, maxP
  `);
  console.log(`\n=== Price Range Distribution ===`);
  for (const rec of priceRanges.records) {
    console.log(`  $${rec.get('minP')}-$${rec.get('maxP')}: ${rec.get('cnt')} products`);
  }

  await session.close();
  await closeNeo4j();
}
main().catch(console.error);
