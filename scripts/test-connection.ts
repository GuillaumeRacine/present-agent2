/**
 * Test Neo4j Connection
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';

async function main() {
  console.log('Testing Neo4j connection...');
  console.log('URI:', process.env.NEO4J_URL);
  console.log('User:', process.env.NEO4J_USER);
  console.log('Database:', process.env.NEO4J_DATABASE || 'neo4j');

  try {
    const driver = await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    console.log('✅ Connection successful!');

    await closeNeo4j();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

main();
