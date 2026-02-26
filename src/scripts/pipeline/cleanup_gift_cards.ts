#!/usr/bin/env tsx
/**
 * Cleanup gift card enrichment — remove over-linked interests from keyword matching
 * and add targeted manual interest links for underserved products.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../../src/lib/neo4j.js';

const LIVE = process.argv.includes('--live');

// Products with > 10 interests likely got keyword-spam.
// Keep only their brand-specific interests, remove the rest.
const BRAND_KEEP_INTERESTS: Record<string, string[]> = {
  'Lululemon Studio Gift Card': ['yoga', 'fitness', 'wellness', 'meditation', 'running'],
  'Lululemon Gift Card': ['yoga', 'fitness', 'fashion'],
  'ClassPass Gift Card': ['fitness', 'wellness', 'yoga', 'sports', 'cycling'],
  'Peloton Gift Card': ['fitness', 'cycling', 'wellness', 'running'],
};

// Products with 0-1 interests that need manual additions
const MANUAL_INTERESTS: Record<string, string[]> = {
  'Visa Gift Card': ['shopping'],
  'Amazon Gift Card': ['shopping'],
  'Walmart Gift Card': ['shopping'],
  'Costco Shop Card': ['shopping'],
  'DoorDash Gift Card': ['food', 'cooking'],
  'Chipotle Gift Card': ['food'],
  'HelloFresh Gift Card': ['cooking', 'food'],
  'Disney+ Gift Card': ['movies'],
  'H&M Gift Card': ['fashion'],
  'Bed Bath & Beyond Gift Card': ['home decor'],
  'Coursera Plus Gift Subscription': ['education'],
  'Hotels.com Gift Card': ['travel'],
  'Southwest Airlines Gift Card': ['travel'],
  'Delta Air Lines Gift Card': ['travel'],
  'Uber Gift Card': ['travel'],
};

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  CLEANUP GIFT CARD ENRICHMENT ${LIVE ? '(LIVE)' : '(DRY RUN)'}`);
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
    // 1. Fix over-linked products (>10 interests)
    console.log('--- Step 1: Fix over-linked products ---');
    for (const [title, keepInterests] of Object.entries(BRAND_KEEP_INTERESTS)) {
      // Count current
      const countResult = await session.run(`
        MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
        WHERE p.title = $title AND p.source = 'gift_card_manual'
        RETURN count(i) AS cnt
      `, { title });
      const currentCount = Number(countResult.records[0]?.get('cnt') || 0);

      if (LIVE) {
        // Delete ALL interest links for this product
        const deleteResult = await session.run(`
          MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
          WHERE p.title = $title AND p.source = 'gift_card_manual'
          DELETE r
          RETURN count(r) AS deleted
        `, { title });
        const deleted = Number(deleteResult.records[0]?.get('deleted') || 0);

        // Re-add only curated interests
        for (const interest of keepInterests) {
          await session.run(`
            MATCH (p:Product) WHERE p.title = $title AND p.source = 'gift_card_manual'
            MATCH (i:Interest {name: $interest})
            MERGE (p)-[r:MATCHES_INTEREST]->(i)
            ON CREATE SET r.relevance_score = 0.90
          `, { title, interest });
        }

        console.log(`  ${title}: ${currentCount} → ${keepInterests.length} interests (removed ${deleted})`);
      } else {
        console.log(`  ${title}: ${currentCount} interests → would keep ${keepInterests.length}`);
      }
    }

    // 2. Add missing interests for underserved products
    console.log('\n--- Step 2: Add missing interests for underserved products ---');
    for (const [title, interests] of Object.entries(MANUAL_INTERESTS)) {
      if (LIVE) {
        let added = 0;
        for (const interest of interests) {
          const result = await session.run(`
            MATCH (p:Product) WHERE p.title = $title AND p.source = 'gift_card_manual'
            MATCH (i:Interest {name: $interest})
            MERGE (p)-[r:MATCHES_INTEREST]->(i)
            ON CREATE SET r.relevance_score = 0.85
            RETURN type(r) AS t
          `, { title, interest });
          if (result.records.length > 0) added++;
        }
        console.log(`  ${title}: added/ensured ${added} interests`);
      } else {
        console.log(`  ${title}: would add ${interests.join(', ')}`);
      }
    }

    // 3. Verify
    if (LIVE) {
      console.log('\n--- Verification ---');
      const verifyResult = await session.run(`
        MATCH (p:Product) WHERE p.source = 'gift_card_manual'
        OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
        WITH p, count(i) AS iCount
        RETURN p.title AS title, iCount
        ORDER BY iCount ASC
        LIMIT 10
      `);
      console.log('Bottom 10 by interest count:');
      for (const rec of verifyResult.records) {
        console.log(`  ${rec.get('title')}: ${Number(rec.get('iCount'))} interests`);
      }

      const overlinked = await session.run(`
        MATCH (p:Product) WHERE p.source = 'gift_card_manual'
        OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
        WITH p, count(i) AS iCount
        WHERE iCount > 10
        RETURN p.title AS title, iCount
        ORDER BY iCount DESC
      `);
      if (overlinked.records.length > 0) {
        console.log('\nStill over-linked (>10):');
        for (const rec of overlinked.records) {
          console.log(`  ${rec.get('title')}: ${Number(rec.get('iCount'))} interests`);
        }
      } else {
        console.log('\nNo over-linked products (all ≤ 10 interests)');
      }
    } else {
      console.log('\nDry run complete. Use --live to apply changes.');
    }

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
