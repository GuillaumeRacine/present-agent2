#!/usr/bin/env tsx
import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  const session = getSession();

  // Find coffee products
  const result = await session.run(`
    MATCH (p:Product)-[r:HAS_INTEREST]->(i:Interest {name: 'coffee'})
    RETURN p.id, p.title, p.price, r.confidence
    ORDER BY p.price
    LIMIT 10
  `);

  console.log('\n📋 Sample coffee products:');
  result.records.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.get('p.title')} - $${r.get('p.price')} (confidence: ${r.get('r.confidence')})`);
  });

  await session.close();
  await closeNeo4j();
}

main().catch(console.error);
