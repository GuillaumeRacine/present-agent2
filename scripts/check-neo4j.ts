/**
 * Neo4j Health Check
 * Quick script to verify Neo4j connectivity
 */

import dotenv from 'dotenv';
import { initNeo4j, getDriver } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function checkNeo4j() {
  console.log('🔍 Checking Neo4j connection...\n');

  // Initialize connection
  await initNeo4j({
    uri: process.env.NEO4J_URL || process.env.NEO4J_URI || '',
    username: process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();

  try {
    // Test connectivity
    console.log('Testing connectivity...');
    await driver.verifyConnectivity();
    console.log('✅ Connected successfully\n');

    // Get server info
    console.log('Getting server info...');
    const serverInfo = await driver.getServerInfo();
    console.log(`  Neo4j Version: ${serverInfo.protocolVersion}`);
    console.log(`  Address: ${serverInfo.address}\n`);

    // Count products
    console.log('Querying database...');
    const session = driver.session({ database: 'neo4j' });

    try {
      const result = await session.run(`
        MATCH (p:Product)
        RETURN count(p) as productCount,
               count(p.product_embedding) as withEmbeddings
      `);

      const record = result.records[0];
      const productCount = record.get('productCount');
      const withEmbeddings = record.get('withEmbeddings');

      console.log(`  Products in database: ${productCount.toLocaleString()}`);
      console.log(`  With embeddings: ${withEmbeddings.toLocaleString()}`);
      console.log(`  Missing embeddings: ${(productCount - withEmbeddings).toLocaleString()}\n`);

      // Sample products
      const sampleResult = await session.run(`
        MATCH (p:Product)
        RETURN p.id, p.title, p.price
        ORDER BY p.id
        LIMIT 5
      `);

      console.log('Sample products:');
      sampleResult.records.forEach(record => {
        console.log(`  - ${record.get('p.id')}: ${record.get('p.title')} ($${record.get('p.price')})`);
      });

      console.log('\n✅ Neo4j is healthy and accessible!');

    } finally {
      await session.close();
    }

  } catch (error: any) {
    console.error('\n❌ Neo4j connection failed:');
    console.error(`  Error: ${error.message}`);
    console.error(`  Code: ${error.code || 'unknown'}`);

    if (error.message.includes('routing servers')) {
      console.error('\n💡 Possible causes:');
      console.error('  1. Neo4j instance is still provisioning after upgrade');
      console.error('  2. Firewall or network connectivity issue');
      console.error('  3. Neo4j credentials changed during upgrade');
      console.error('\n💡 Recommendations:');
      console.error('  - Wait 2-5 minutes for Neo4j Aura to complete provisioning');
      console.error('  - Check Neo4j Aura console for instance status');
      console.error('  - Verify .env.local credentials match the upgraded instance');
    }

    process.exit(1);

  } finally {
    await driver.close();
  }
}

checkNeo4j().catch(error => {
  logger.error('Health check failed', { error });
  process.exit(1);
});
