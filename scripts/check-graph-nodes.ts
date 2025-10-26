/**
 * Check what graph nodes exist in Neo4j
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getDriver } from '../src/lib/neo4j.js';

async function main() {
  try {
    console.log('\n🔍 Checking Graph Nodes\n');

    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const driver = getDriver();
    const session = driver.session();

    try {
      // Check for different node types
      const queries = [
        { label: 'Product', query: 'MATCH (n:Product) RETURN count(n) as count' },
        { label: 'Interest', query: 'MATCH (n:Interest) RETURN count(n) as count' },
        { label: 'Value', query: 'MATCH (n:Value) RETURN count(n) as count' },
        { label: 'Occasion', query: 'MATCH (n:Occasion) RETURN count(n) as count' },
        { label: 'User', query: 'MATCH (n:User) RETURN count(n) as count' },
        { label: 'Recipient', query: 'MATCH (n:Recipient) RETURN count(n) as count' },
        { label: 'Recommendation', query: 'MATCH (n:Recommendation) RETURN count(n) as count' },
      ];

      console.log('Node counts:');
      for (const { label, query } of queries) {
        const result = await session.run(query);
        const count = result.records[0]?.get('count');
        const countNum = typeof count === 'number' ? count : (count?.toNumber ? count.toNumber() : 0);
        console.log(`  ${label}: ${countNum}`);
      }

      // Check for relationships
      console.log('\nRelationship counts:');
      const relQueries = [
        { type: 'MATCHES_INTEREST', query: 'MATCH ()-[r:MATCHES_INTEREST]->() RETURN count(r) as count' },
        { type: 'ALIGNS_WITH', query: 'MATCH ()-[r:ALIGNS_WITH]->() RETURN count(r) as count' },
        { type: 'SUITABLE_FOR', query: 'MATCH ()-[r:SUITABLE_FOR]->() RETURN count(r) as count' },
      ];

      for (const { type, query } of relQueries) {
        const result = await session.run(query);
        const count = result.records[0]?.get('count');
        const countNum = typeof count === 'number' ? count : (count?.toNumber ? count.toNumber() : 0);
        console.log(`  ${type}: ${countNum}`);
      }

      // Sample a product to see what it's connected to
      console.log('\nSample product connections:');
      const sampleResult = await session.run(`
        MATCH (p:Product)
        WHERE p.id = '1'
        OPTIONAL MATCH (p)-[mi:MATCHES_INTEREST]->(i:Interest)
        OPTIONAL MATCH (p)-[av:ALIGNS_WITH]->(v:Value)
        OPTIONAL MATCH (p)-[sf:SUITABLE_FOR]->(o:Occasion)
        RETURN p.title as title,
               collect(DISTINCT i.name) as interests,
               collect(DISTINCT v.name) as values,
               collect(DISTINCT o.name) as occasions
        LIMIT 1
      `);

      if (sampleResult.records.length > 0) {
        const record = sampleResult.records[0];
        console.log(`  Product: ${record.get('title')}`);
        console.log(`  Interests: ${record.get('interests')}`);
        console.log(`  Values: ${record.get('values')}`);
        console.log(`  Occasions: ${record.get('occasions')}`);
      }

    } finally {
      await session.close();
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
