import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

async function main() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->()
      WITH p, count(*) AS interestCount
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->()
      WITH p, interestCount, count(*) AS occasionCount
      WHERE interestCount < 2 OR occasionCount < 1
      RETURN
        count(p) AS productsNeedingGapFill,
        sum(CASE WHEN interestCount < 2 THEN 1 ELSE 0 END) AS needingMoreInterests,
        sum(CASE WHEN occasionCount < 1 THEN 1 ELSE 0 END) AS needingOccasions
    `);

    const record = result.records[0];
    const total = record.get('productsNeedingGapFill');
    const interests = record.get('needingMoreInterests');
    const occasions = record.get('needingOccasions');

    console.log('\n=== PRODUCTS NEEDING LLM GAP-FILL ===\n');
    console.log('Total products needing gap-fill: ' + total);
    console.log('  - Needing more interests (< 2): ' + interests);
    console.log('  - Needing occasions (< 1): ' + occasions);
    console.log('');
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
