/**
 * Test RecipientLearner with missing age/gender information
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
      userId: 'user_test_recipient',
      sessionId: `session_${Date.now()}`,
    });

    const executionTime = Date.now() - startTime;

    console.log(`✅ Success (${executionTime}ms)`);

    // Check recipient profile info
    const memoryContext = result.executionTrace.memory;
    if (memoryContext.enrichedRecipient) {
      const recipient = memoryContext.enrichedRecipient;
      console.log(`   Recipient: ${recipient.name}`);
      console.log(`   Age: ${recipient.age || 'NOT PROVIDED'}`);
      console.log(`   Gender: ${recipient.gender || 'NOT PROVIDED'}`);
      console.log(`   Interests: ${recipient.interests.length}`);
      console.log(`   Knowledge depth: ${recipient.knowledge_depth.toFixed(2)}`);

      if (memoryContext.recipientKnowledgeGaps) {
        console.log(`   Knowledge gaps: ${memoryContext.recipientKnowledgeGaps.join(', ')}`);
      }
    } else {
      console.log(`   ⚠️  No recipient profile created`);
    }

    console.log(`   Final recommendations: ${result.finalRecommendations.totalRecommendations}`);

    if (result.finalRecommendations.recommendations.length > 0) {
      console.log(`   Top recommendation: ${result.finalRecommendations.recommendations[0].product.title}`);
    }

    return { success: true, executionTime, result };
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return { success: false, error };
  }
}

async function main() {
  try {
    console.log('\n🧪 Testing RecipientLearner - Missing Age/Gender Scenarios\n');

    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const testCases = [
      // Test cases from user requirements
      {
        name: 'Query with age',
        query: 'Gift for my 58 year old mom',
        expectedAge: 58,
        expectedGender: 'female'
      },
      {
        name: 'Query without age',
        query: 'Gift for my mom',
        expectedAge: null,
        expectedGender: 'female'
      },
      {
        name: 'Query with gender (explicit)',
        query: 'Gift for my dad',
        expectedAge: null,
        expectedGender: 'male'
      },
      {
        name: 'Query without gender',
        query: 'Gift for my parent',
        expectedAge: null,
        expectedGender: null
      },
      {
        name: 'Query with both age and gender',
        query: 'Gift for my 45 year old brother',
        expectedAge: 45,
        expectedGender: 'male'
      },
      {
        name: 'Query with pronoun hints (she)',
        query: 'Gift for my friend, she loves gardening',
        expectedAge: null,
        expectedGender: 'female'
      },
      {
        name: 'Query with pronoun hints (he)',
        query: 'Need something for my colleague, he enjoys photography',
        expectedAge: null,
        expectedGender: 'male'
      },
      {
        name: 'Query with no recipient info',
        query: 'Looking for a coffee gift',
        expectedAge: null,
        expectedGender: null
      },
    ];

    const results = [];

    for (const testCase of testCases) {
      const result = await runTest(testCase.name, testCase.query);

      // Validate expectations
      if (result.success && result.result) {
        const recipient = result.result.executionTrace.memory.enrichedRecipient;
        let validationPass = true;

        if (testCase.expectedAge !== null && recipient?.age !== testCase.expectedAge) {
          console.log(`   ⚠️  Age mismatch: expected ${testCase.expectedAge}, got ${recipient?.age}`);
          validationPass = false;
        }

        if (testCase.expectedGender !== null && recipient?.gender !== testCase.expectedGender) {
          console.log(`   ⚠️  Gender mismatch: expected ${testCase.expectedGender}, got ${recipient?.gender}`);
          validationPass = false;
        }

        if (validationPass) {
          console.log(`   ✓ Validation passed`);
        }
      }

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

    if (failed > 0) {
      console.log('\nFailed tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.name}: ${r.error instanceof Error ? r.error.message : r.error}`);
      });
    }

    console.log('\n✨ RecipientLearner testing complete!\n');

    // Exit with error if any tests failed
    if (failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
