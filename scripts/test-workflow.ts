/**
 * Simple non-interactive test of the recommendation workflow
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { createOrchestrator } from '../src/services/orchestrator.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  try {
    console.log('\n🎁 Testing Recommendation Workflow\n');

    // Initialize Neo4j
    console.log('Connecting to Neo4j...');
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });
    console.log('✓ Connected\n');

    // Create orchestrator
    console.log('Creating orchestrator...');
    const orchestrator = await createOrchestrator();
    console.log('✓ Orchestrator created\n');

    // Run test query
    const testQuery = 'Birthday gift for my dad who loves coffee and reading. Budget $40-65.';
    console.log(`Query: "${testQuery}"\n`);
    console.log('Running workflow...\n');

    const result = await orchestrator.execute({
      userQuery: testQuery,
      userId: 'user_test_001',
      sessionId: `session_${Date.now()}`,
    });

    // Display results
    console.log('\n✅ Workflow Complete!\n');
    console.log(`Total time: ${result.performance.totalExecutionTimeMs}ms`);
    console.log(`\nAgent timings:`);
    Object.entries(result.performance.agentTimings).forEach(([agent, time]) => {
      console.log(`  ${agent}: ${time}ms`);
    });

    console.log(`\nRecommendations: ${result.finalRecommendations.totalRecommendations}`);
    result.finalRecommendations.recommendations.forEach((rec, idx) => {
      console.log(`\n${idx + 1}. ${rec.product.title} - $${rec.product.price}`);
      console.log(`   Confidence: ${rec.confidence.toFixed(2)}`);
      console.log(`   ${rec.reasoning.substring(0, 100)}...`);
    });

    console.log('\n✨ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('Test workflow failed', { error });
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
