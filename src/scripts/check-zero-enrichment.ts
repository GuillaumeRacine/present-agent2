#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';

dotenv.config({ path: '.env.local' });

async function main() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const session = getSession();

  try {
    // Check products WITHOUT any enrichment
    const result = await session.run(`
      MATCH (p:Product)
      WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest)
        AND NOT (p)-[:SUITABLE_FOR]->(:Occasion)
        AND p.isPractical IS NULL
        AND p.isExperiential IS NULL
        AND p.isLuxury IS NULL
        AND p.isPersonalized IS NULL
      RETURN count(p) as zeroEnrichment
    `);

    const zeroEnrichmentVal = result.records[0].get('zeroEnrichment');
    const zeroEnrichment = typeof zeroEnrichmentVal === 'object' && zeroEnrichmentVal.toNumber
      ? zeroEnrichmentVal.toNumber()
      : Number(zeroEnrichmentVal);

    // Check products with any interests
    const result2 = await session.run(`
      MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
      RETURN count(DISTINCT p) as withInterests
    `);

    const withInterestsVal = result2.records[0].get('withInterests');
    const withInterests = typeof withInterestsVal === 'object' && withInterestsVal.toNumber
      ? withInterestsVal.toNumber()
      : Number(withInterestsVal);

    // Check extraction methods
    const result3 = await session.run(`
      MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
      WHERE r.extraction_method IS NOT NULL
      RETURN r.extraction_method as method, count(*) as count
      ORDER BY count DESC
    `);

    console.log('Products with ZERO enrichment:', zeroEnrichment);
    console.log('Products with interests:', withInterests);
    console.log('\nExtraction methods:');
    result3.records.forEach(r => {
      const countVal = r.get('count');
      const count = typeof countVal === 'object' && countVal.toNumber
        ? countVal.toNumber()
        : Number(countVal);
      console.log(`  ${r.get('method')}: ${count}`);
    });

    // Sample products with zero enrichment
    const result4 = await session.run(`
      MATCH (p:Product)
      WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest)
        AND NOT (p)-[:SUITABLE_FOR]->(:Occasion)
        AND p.isPractical IS NULL
      RETURN p.id as id, p.title as title, p.description as description
      LIMIT 10
    `);

    console.log('\nSample products with ZERO enrichment:');
    result4.records.forEach((r, i) => {
      console.log(`\n${i+1}. ${r.get('title')}`);
      console.log(`   ID: ${r.get('id')}`);
      console.log(`   Desc: ${r.get('description')?.substring(0, 100)}...`);
    });

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
