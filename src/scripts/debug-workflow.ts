/**
 * Debug version of test workflow with detailed logging
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { createOrchestrator } from '../src/services/orchestrator.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  try {
    console.log('\n🔍 DEBUG: Testing Recommendation Workflow\n');

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

    // Display detailed results
    console.log('\n✅ Workflow Complete!\n');
    console.log('=== EXECUTION TRACE ===\n');

    console.log('1. LISTENER:');
    console.log(`   Recipient: ${result.executionTrace.listener.recipient}`);
    console.log(`   Occasion: ${result.executionTrace.listener.occasion}`);
    console.log(`   Budget: $${result.executionTrace.listener.budget?.min}-$${result.executionTrace.listener.budget?.max}`);

    console.log('\n2. MEMORY:');
    console.log(`   Past conversations: ${result.executionTrace.memory.relevantHistory?.length || 0}`);
    console.log(`   Recipients: ${result.executionTrace.memory.recipientProfiles?.length || 0}`);
    console.log(`   Patterns: ${result.executionTrace.memory.recognizedPatterns?.length || 0}`);

    console.log('\n3. RELATIONSHIP:');
    console.log(`   Type: ${result.executionTrace.relationship.relationshipAnalysis.type}`);
    console.log(`   Intimacy: ${result.executionTrace.relationship.relationshipAnalysis.intimacyLevel}`);

    console.log('\n4. CONSTRAINTS:');
    console.log(`   Budget: $${result.executionTrace.constraints.hardConstraints.budget?.min}-$${result.executionTrace.constraints.hardConstraints.budget?.max}`);
    console.log(`   Required: ${result.executionTrace.constraints.hardConstraints.requiredAttributes?.length || 0}`);

    console.log('\n5. MEANING:');
    console.log(`   Gift archetype: ${result.executionTrace.meaning.meaningFramework.giftArchetype}`);
    console.log(`   Core values: ${result.executionTrace.meaning.meaningFramework.coreValues.join(', ')}`);
    console.log(`   Discovery hints: ${result.executionTrace.meaning.discoveryHints.semanticQueries.length} queries`);

    console.log('\n6. EXPLORER:');
    console.log(`   Candidates found: ${result.executionTrace.explorer.candidates.length}`);
    console.log(`   Total evaluated: ${result.executionTrace.explorer.searchMetadata.totalEvaluated}`);
    console.log(`   Diversity score: ${result.executionTrace.explorer.searchMetadata.diversityScore.toFixed(2)}`);
    console.log(`   Coverage score: ${result.executionTrace.explorer.searchMetadata.coverageScore.toFixed(2)}`);
    console.log(`   Avg confidence: ${result.executionTrace.explorer.searchMetadata.avgConfidence.toFixed(2)}`);

    if (result.executionTrace.explorer.candidates.length > 0) {
      console.log('\n   Top candidates:');
      result.executionTrace.explorer.candidates.slice(0, 3).forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. ${c.product.title} - $${c.product.price}`);
        console.log(`      Hybrid: ${c.scores.hybridScore.toFixed(3)} | Graph: ${c.scores.graphScore.toFixed(3)} | Vector: ${c.scores.vectorScore.toFixed(3)}`);
        console.log(`      Confidence: ${c.scores.confidenceScore.toFixed(3)}`);
      });
    }

    console.log('\n7. VALIDATOR:');
    console.log(`   Total candidates: ${result.executionTrace.validator.validationSummary.totalCandidates}`);
    console.log(`   Passed: ${result.executionTrace.validator.validationSummary.passed}`);
    console.log(`   Rejected: ${result.executionTrace.validator.validationSummary.rejected}`);
    console.log(`   Avg validation score: ${result.executionTrace.validator.validationSummary.avgValidationScore.toFixed(2)}`);

    if (result.executionTrace.validator.rejectedCandidates.length > 0) {
      console.log('\n   Rejected candidates:');
      result.executionTrace.validator.rejectedCandidates.forEach((r: any) => {
        console.log(`   - ${r.candidate.product.title}: ${r.validation.failReasons?.join(', ')}`);
      });
    }

    console.log('\n8. STORYTELLER:');
    console.log(`   Stories created: ${result.executionTrace.storyteller.stories.length}`);

    console.log('\n9. PRESENTER:');
    console.log(`   Final recommendations: ${result.finalRecommendations.totalRecommendations}`);
    console.log(`   Ordering: ${result.finalRecommendations.orderingStrategy}`);
    console.log(`   Tone: ${result.finalRecommendations.tone}`);

    if (result.finalRecommendations.recommendations.length > 0) {
      console.log('\n   Final recommendations:');
      result.finalRecommendations.recommendations.forEach((rec: any) => {
        console.log(`\n   ${rec.rank}. ${rec.product.title} - $${rec.product.price}`);
        console.log(`      Confidence: ${rec.confidence.toFixed(2)}`);
        console.log(`      Tags: ${rec.tags.join(', ')}`);
        console.log(`      ${rec.reasoning.substring(0, 150)}...`);
      });
    } else {
      console.log('\n   ⚠️ NO FINAL RECOMMENDATIONS!');
    }

    console.log('\n=== PERFORMANCE ===');
    console.log(`Total time: ${result.performance.totalExecutionTimeMs}ms`);
    console.log('Agent timings:');
    Object.entries(result.performance.agentTimings).forEach(([agent, time]) => {
      console.log(`  ${agent}: ${time}ms`);
    });

    console.log('\n✨ Debug complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('Test workflow failed', { error });
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
