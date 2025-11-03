import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

const sessionId = 'session_1761762250981_bfmo6jo';

async function queryConversation() {
  // Initialize Neo4j connection
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (c:Conversation {sessionId: $sessionId})
      OPTIONAL MATCH (c)-[:RECOMMENDED]->(r:Recommendation)
      OPTIONAL MATCH (r)-[:FOR_PRODUCT]->(p:Product)
      WITH c, r, p
      ORDER BY r.rank
      RETURN c.query as query,
             c.timestamp as timestamp,
             c.executionTimeMs as executionTime,
             c.conversationalIntro as intro,
             c.conversationalOutro as outro,
             collect({
               rank: r.rank,
               product: p.title,
               price: p.price,
               reasoning: r.reasoning,
               confidence: r.confidence
             }) as recommendations
      ORDER BY c.timestamp
      `,
      { sessionId }
    );

    console.log(`\nFound ${result.records.length} conversations:\n`);

    result.records.forEach((record, i) => {
      console.log(`=== Query ${i + 1} ===`);
      console.log('Query:', record.get('query'));
      const timestamp = record.get('timestamp');
      console.log('Timestamp:', new Date(timestamp).toLocaleString());
      console.log('Execution time:', record.get('executionTime'), 'ms');

      const intro = record.get('intro');
      if (intro) {
        console.log('\nIntro:', intro);
      }

      console.log('\nRecommendations:');
      const recs = record.get('recommendations').filter((r: any) => r.rank !== null);
      recs.sort((a: any, b: any) => a.rank - b.rank);
      recs.slice(0, 5).forEach((rec: any) => {
        console.log(`  #${rec.rank}. ${rec.product} - $${rec.price}`);
        console.log(`      Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
        console.log(`      Reasoning: ${rec.reasoning.substring(0, 100)}...`);
      });
      console.log('');
    });
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

queryConversation().catch(console.error);
