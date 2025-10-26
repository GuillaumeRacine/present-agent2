/**
 * Test edge cases and error handling
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { createOrchestrator } from '../src/services/orchestrator.js';

async function runTest(name: string, query: string) {
  console.log(`\n=== ${name} ===`);
  console.log(`Query: "${query}"`);

  try {
    const orchestrator = await createOrchestrator();
    const startTime = Date.now();

    const result = await orchestrator.execute({
      userQuery: query,
      userId: 'user_test_edge',
      sessionId: `session_${Date.now()}`,
    });

    const executionTime = Date.now() - startTime;

    console.log(`✅ Success (${executionTime}ms)`);
    console.log(`   Candidates found: ${result.executionTrace.explorer.candidates.length}`);
    console.log(`   Passed validation: ${result.executionTrace.validator.validationSummary.passed}`);
    console.log(`   Final recommendations: ${result.finalRecommendations.totalRecommendations}`);

    if (result.finalRecommendations.recommendations.length > 0) {
      console.log(`   Top recommendation: ${result.finalRecommendations.recommendations[0].product.title}`);
    }

    return { success: true, executionTime, result };
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, error };
  }
}

async function main() {
  try {
    console.log('\n🧪 Testing Edge Cases\n');

    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const testCases = [
      // Valid cases
      { name: 'Simple query', query: 'Gift for coffee lover' },
      { name: 'Very specific budget', query: 'Something for $50 exactly' },
      { name: 'High budget', query: 'Luxury gift under $500' },
      { name: 'Low budget', query: 'Gift under $20' },

      // Edge cases
      { name: 'Empty query', query: '' },
      { name: 'Very long query', query: 'I need a gift for my dad who loves coffee and reading and also enjoys hiking on weekends and has a passion for photography especially landscape photography and he also likes to cook Italian food and has a great sense of humor and enjoys watching classic movies from the 1970s and 1980s and my budget is around $50 to $75 and it needs to arrive before next Tuesday' },
      { name: 'Only punctuation', query: '!!!' },
      { name: 'Numbers only', query: '12345' },
      { name: 'Non-English characters', query: '誕生日プレゼント' },
      { name: 'Special characters', query: 'Gift @#$%^&*()' },
    ];

    const results = [];

    for (const testCase of testCases) {
      const result = await runTest(testCase.name, testCase.query);
      results.push({ ...testCase, ...result });

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n\n=== SUMMARY ===');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Total tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${(successful / results.length * 100).toFixed(1)}%`);

    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });

    console.log('\n✨ Edge case testing complete!\n');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
