#!/usr/bin/env tsx
/**
 * Clean Coffee Interest Taxonomy
 *
 * The "coffee" Interest matches 3,500+ products including coffee tables,
 * furniture, and other non-coffee-beverage items. This script removes
 * MATCHES_INTEREST relationships for furniture products.
 *
 * Usage:
 *   tsx scripts/clean-coffee-interest.ts           # Dry run
 *   tsx scripts/clean-coffee-interest.ts --live     # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

const LIVE = process.argv.includes('--live');

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  CLEAN COFFEE INTEREST ${LIVE ? '(LIVE)' : '(DRY RUN)'}`);
  console.log(`${'='.repeat(60)}\n`);

  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  const driver = getDriver();
  const session = driver.session();

  try {
    // Count current coffee interest products
    const beforeResult = await session.run(
      `MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
       RETURN count(p) AS total`
    );
    const before = beforeResult.records[0]?.get('total')?.toNumber?.() || beforeResult.records[0]?.get('total') || 0;
    console.log(`Current coffee interest products: ${before}`);

    // Find furniture products linked to coffee
    const furniturePattern = '.*(coffee table|end table|side table|console|bench|ottoman|desk|nightstand|dresser|shelf|cabinet|credenza|bookcase|bookshelf|tv stand|media stand|storage|wardrobe|vanity|hutch|armoire|sideboard|buffet).*';

    const previewResult = await session.run(
      `MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
       WHERE toLower(p.title) =~ $pattern
       RETURN p.title AS title, p.price AS price
       ORDER BY p.price DESC
       LIMIT 20`,
      { pattern: furniturePattern }
    );

    console.log(`\nSample furniture products to remove from coffee interest:`);
    for (const record of previewResult.records) {
      const title = record.get('title');
      const price = record.get('price');
      console.log(`  $${price} — ${title}`);
    }

    // Count how many would be removed
    const countResult = await session.run(
      `MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
       WHERE toLower(p.title) =~ $pattern
       RETURN count(r) AS toRemove`,
      { pattern: furniturePattern }
    );
    const toRemove = countResult.records[0]?.get('toRemove')?.toNumber?.() || countResult.records[0]?.get('toRemove') || 0;
    console.log(`\nFurniture products to unlink: ${toRemove}`);

    if (LIVE) {
      // Remove furniture from coffee interest
      const deleteResult = await session.run(
        `MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
         WHERE toLower(p.title) =~ $pattern
         DELETE r
         RETURN count(r) AS removed`,
        { pattern: furniturePattern }
      );
      const removed = deleteResult.records[0]?.get('removed')?.toNumber?.() || deleteResult.records[0]?.get('removed') || 0;
      console.log(`Removed: ${removed} relationships`);

      // Count after
      const afterResult = await session.run(
        `MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
         RETURN count(p) AS total`
      );
      const after = afterResult.records[0]?.get('total')?.toNumber?.() || afterResult.records[0]?.get('total') || 0;
      console.log(`Coffee interest products after cleanup: ${after}`);
    } else {
      console.log(`\nWould remain: ${before - toRemove} products`);
      console.log(`\nRun with --live to apply changes.`);
    }

    // Also show top coffee products after (or preview of what would remain)
    console.log(`\nTop 10 coffee products (by price, excluding furniture):`);
    const topResult = await session.run(
      `MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
       WHERE NOT toLower(p.title) =~ $pattern
       RETURN p.title AS title, p.price AS price
       ORDER BY p.price DESC
       LIMIT 10`,
      { pattern: furniturePattern }
    );
    for (const record of topResult.records) {
      const title = record.get('title');
      const price = record.get('price');
      console.log(`  $${price} — ${title}`);
    }
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
