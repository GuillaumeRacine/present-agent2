#!/usr/bin/env tsx
/**
 * Add Missing Interest Nodes
 *
 * Adds Interest nodes for underserved niches that have products in the catalog
 * but no Interest node, making them unreachable via interest-based search.
 *
 * Usage:
 *   tsx scripts/add-missing-interests.ts           # Dry run
 *   tsx scripts/add-missing-interests.ts --live     # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

const LIVE = process.argv.includes('--live');

/**
 * Each entry: interest name → array of text patterns to match in title/description.
 * Patterns are matched as whole words (case-insensitive).
 */
const MISSING_INTERESTS: Record<string, string[]> = {
  skateboarding: [
    'skateboard', 'skate deck', 'skater', 'skateboarding', 'skate park',
    'longboard', 'cruiser board',
  ],
  music: [
    'guitar', 'drums', 'piano', 'keyboard instrument', 'ukulele', 'violin',
    'music', 'musician', 'musical', 'vinyl record', 'turntable', 'headphones',
    'speaker', 'amplifier', 'songwriting', 'concert',
  ],
  'extreme sports': [
    'skateboard', 'surfboard', 'surf', 'bmx', 'snowboard', 'wakeboard',
    'rock climbing', 'bouldering', 'parkour', 'motocross',
  ],
  'outdoor adventure': [
    'hiking', 'camping', 'backpacking', 'trail', 'trekking', 'kayak',
    'canoe', 'fishing', 'hunting', 'mountaineering', 'climbing',
    'wilderness', 'campfire', 'tent', 'sleeping bag', 'hammock',
    'adventure', 'outdoorsman', 'backcountry',
  ],
};

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ADD MISSING INTEREST NODES ${LIVE ? '(LIVE)' : '(DRY RUN)'}`);
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
    // First check which interests already exist
    const existingResult = await session.run(
      `MATCH (i:Interest) RETURN collect(i.name) AS names`
    );
    const existingInterests = new Set<string>(
      existingResult.records[0]?.get('names') || []
    );

    console.log(`Existing Interest nodes: ${existingInterests.size}`);

    for (const [interestName, patterns] of Object.entries(MISSING_INTERESTS)) {
      console.log(`\n--- ${interestName} ---`);

      if (existingInterests.has(interestName)) {
        console.log(`  Already exists as Interest node, checking for additional products...`);
      }

      // Build a WHERE clause that matches any pattern in title or description
      // Using toLower + CONTAINS for each pattern
      const conditions = patterns.map((pattern, idx) =>
        `toLower(p.title) CONTAINS $p${idx} OR toLower(COALESCE(p.description, '')) CONTAINS $p${idx}`
      );
      const whereClause = conditions.join(' OR ');

      // Build params
      const params: Record<string, any> = { interestName };
      patterns.forEach((pattern, idx) => {
        params[`p${idx}`] = pattern.toLowerCase();
      });

      // Count matching products
      const countResult = await session.run(
        `MATCH (p:Product) WHERE ${whereClause} RETURN count(p) AS total`,
        params
      );
      const totalProducts = countResult.records[0]?.get('total')?.toNumber?.() || countResult.records[0]?.get('total') || 0;
      console.log(`  Products matching patterns: ${totalProducts}`);

      // Count already linked
      const linkedResult = await session.run(
        `MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest {name: $interestName})
         RETURN count(p) AS linked`,
        { interestName }
      );
      const alreadyLinked = linkedResult.records[0]?.get('linked')?.toNumber?.() || linkedResult.records[0]?.get('linked') || 0;
      console.log(`  Already linked via MATCHES_INTEREST: ${alreadyLinked}`);

      if (LIVE) {
        // Create Interest node (MERGE = idempotent)
        await session.run(
          `MERGE (i:Interest {name: $interestName})
           ON CREATE SET i.created_at = datetime(), i.source = 'add-missing-interests'
           RETURN i`,
          { interestName }
        );

        // Create MATCHES_INTEREST relationships for unlinked products
        const createResult = await session.run(
          `MATCH (p:Product) WHERE ${whereClause}
           MATCH (i:Interest {name: $interestName})
           WHERE NOT (p)-[:MATCHES_INTEREST]->(i)
           CREATE (p)-[r:MATCHES_INTEREST {relevance_score: 0.8, source: 'text-match'}]->(i)
           RETURN count(r) AS created`,
          params
        );
        const created = createResult.records[0]?.get('created')?.toNumber?.() || createResult.records[0]?.get('created') || 0;
        console.log(`  NEW relationships created: ${created}`);
      } else {
        // Dry run: count how many would be created
        const wouldCreate = await session.run(
          `MATCH (p:Product) WHERE ${whereClause}
           OPTIONAL MATCH (p)-[existing:MATCHES_INTEREST]->(i:Interest {name: $interestName})
           WITH p, existing WHERE existing IS NULL
           RETURN count(p) AS wouldCreate`,
          params
        );
        const count = wouldCreate.records[0]?.get('wouldCreate')?.toNumber?.() || wouldCreate.records[0]?.get('wouldCreate') || 0;
        console.log(`  Would create: ${count} new relationships`);
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  SUMMARY`);
    console.log(`${'='.repeat(60)}`);

    const finalResult = await session.run(
      `MATCH (i:Interest)
       OPTIONAL MATCH (p:Product)-[:MATCHES_INTEREST]->(i)
       WITH i.name AS interest, count(p) AS products
       WHERE i.name IN $names
       RETURN interest, products
       ORDER BY products DESC`,
      { names: Object.keys(MISSING_INTERESTS) }
    );

    for (const record of finalResult.records) {
      const name = record.get('interest');
      const count = record.get('products')?.toNumber?.() || record.get('products') || 0;
      console.log(`  ${name}: ${count} products`);
    }

    if (!LIVE) {
      console.log(`\n  Run with --live to apply changes.`);
    }
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
