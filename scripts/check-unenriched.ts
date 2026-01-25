#!/usr/bin/env tsx
/**
 * Quick check for unenriched products
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';

async function main() {
  try {
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const session = getSession();

    try {
      // Find products with no enrichment at all
      const result = await session.run(`
        MATCH (p:Product)
        WHERE NOT exists((p)-[:MATCHES_INTEREST]->())
          AND NOT exists((p)-[:SUITABLE_FOR]->())
          AND p.is_practical IS NULL
          AND p.is_experiential IS NULL
          AND p.is_luxury IS NULL
          AND p.is_personalized IS NULL
        RETURN p.id as id, p.title as title, p.price as price
        LIMIT 5
      `);

      console.log('\n🔍 Sample products with NO enrichment:\n');
      result.records.forEach(r => {
        console.log(`  - ${r.get('title')}`);
        console.log(`    ID: ${r.get('id')}, Price: $${r.get('price')}\n`);
      });

      // Count totally unenriched products
      const countResult = await session.run(`
        MATCH (p:Product)
        WHERE NOT exists((p)-[:MATCHES_INTEREST]->())
          AND NOT exists((p)-[:SUITABLE_FOR]->())
          AND p.is_practical IS NULL
          AND p.is_experiential IS NULL
          AND p.is_luxury IS NULL
          AND p.is_personalized IS NULL
        RETURN count(p) as total
      `);

      const total = countResult.records[0].get('total');
      console.log(`Total products with NO enrichment: ${total}`);
      console.log(`Percentage: ${((total / 88674) * 100).toFixed(1)}%\n`);

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
