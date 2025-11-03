#!/usr/bin/env tsx

/**
 * Phase C Validation Testing
 * Tests recommendation quality with 12K enriched products vs Phase A & B baseline
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/recommend';

// Test queries (same as Phase A & B baseline)
const TEST_QUERIES = [
  {
    id: 'wine',
    query: 'gift for someone who loves wine',
    baseline: {
      confidence: 0.40,
      topProduct: 'Wine accessories',
      status: 'Fixed in Phase A/B',
    },
  },
  {
    id: 'coffee',
    query: 'gift for coffee enthusiast',
    baseline: {
      confidence: 0.46,
      topProduct: 'Coffee products',
      status: 'Working',
    },
  },
  {
    id: 'yoga',
    query: 'present for someone into yoga and wellness',
    baseline: {
      confidence: 0.45,
      topProduct: 'Yoga/wellness products',
      status: 'Working',
    },
  },
  {
    id: 'tech',
    query: 'gift for tech lover',
    baseline: {
      confidence: 0.35,
      topProduct: 'Tech accessories (limited)',
      status: 'Catalog gap',
    },
  },
  {
    id: 'sustainable',
    query: 'eco-friendly sustainable gift',
    baseline: {
      confidence: 0.37,
      topProduct: 'Sustainable products (limited)',
      status: 'Catalog gap',
    },
  },
];

interface TestResult {
  queryId: string;
  query: string;
  confidence: number;
  graphScore: number;
  recommendations: number;
  topProducts: Array<{
    title: string;
    confidence: number;
  }>;
  interests: string[];
  baseline: any;
  improvement: {
    confidenceDelta: number;
    confidencePercent: number;
  };
}

async function testQuery(queryData: typeof TEST_QUERIES[0]): Promise<TestResult> {
  console.log(`\n🔍 Testing: "${queryData.query}"`);

  try {
    const response = await axios.post(API_URL, {
      userQuery: queryData.query,
      userId: `phase-c-test-${queryData.id}`,
      sessionId: `phase-c-validation-${Date.now()}`,
    });

    const data = response.data;
    const recommendations = data.finalRecommendations?.recommendations || [];

    // Extract top 3 products
    const topProducts = recommendations.slice(0, 3).map((rec: any) => ({
      title: rec.product?.title || rec.title,
      confidence: rec.confidence,
    }));

    // Calculate metrics
    const avgConfidence = recommendations.length > 0
      ? recommendations.reduce((sum: number, r: any) => sum + r.confidence, 0) / recommendations.length
      : 0;

    const avgGraphScore = recommendations.length > 0
      ? recommendations.reduce((sum: number, r: any) => sum + (r.graphScore || 0), 0) / recommendations.length
      : 0;

    // Extract unique interests from reasoning
    const interests = new Set<string>();
    recommendations.slice(0, 5).forEach((rec: any) => {
      if (rec.reasoning) {
        const interestMatches = rec.reasoning.match(/interests?: ([^.]+)/gi);
        if (interestMatches) {
          interestMatches.forEach((match: string) => {
            const extracted = match.split(':')[1]?.trim().split(',').map((i: string) => i.trim());
            extracted?.forEach((i: string) => interests.add(i));
          });
        }
      }
    });

    const confidenceDelta = avgConfidence - queryData.baseline.confidence;
    const confidencePercent = (confidenceDelta / queryData.baseline.confidence) * 100;

    console.log(`   ✓ Confidence: ${(avgConfidence * 100).toFixed(1)}% (baseline: ${(queryData.baseline.confidence * 100).toFixed(1)}%)`);
    console.log(`   ✓ Improvement: ${confidenceDelta >= 0 ? '+' : ''}${(confidenceDelta * 100).toFixed(1)}pp (${confidencePercent >= 0 ? '+' : ''}${confidencePercent.toFixed(1)}%)`);
    console.log(`   ✓ Results: ${recommendations.length} products`);

    return {
      queryId: queryData.id,
      query: queryData.query,
      confidence: avgConfidence,
      graphScore: avgGraphScore,
      recommendations: recommendations.length,
      topProducts,
      interests: Array.from(interests),
      baseline: queryData.baseline,
      improvement: {
        confidenceDelta,
        confidencePercent,
      },
    };
  } catch (error: any) {
    console.error(`   ✗ Failed: ${error.message}`);
    throw error;
  }
}

async function runValidation() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║            Phase C Validation Testing (12K Products)           ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Testing 5 queries and comparing against Phase A & B baseline...');

  const results: TestResult[] = [];

  for (const queryData of TEST_QUERIES) {
    try {
      const result = await testQuery(queryData);
      results.push(result);

      // Brief pause between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to test query: ${queryData.id}`);
    }
  }

  // Generate summary
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     VALIDATION SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const avgBaselineConfidence = TEST_QUERIES.reduce((sum, q) => sum + q.baseline.confidence, 0) / TEST_QUERIES.length;
  const avgPhaseCConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const overallImprovement = avgPhaseCConfidence - avgBaselineConfidence;
  const overallImprovementPercent = (overallImprovement / avgBaselineConfidence) * 100;

  console.log('📊 Overall Performance:');
  console.log(`   Phase A & B Baseline: ${(avgBaselineConfidence * 100).toFixed(1)}% avg confidence`);
  console.log(`   Phase C (12K):        ${(avgPhaseCConfidence * 100).toFixed(1)}% avg confidence`);
  console.log(`   Improvement:          ${overallImprovement >= 0 ? '+' : ''}${(overallImprovement * 100).toFixed(1)}pp (${overallImprovementPercent >= 0 ? '+' : ''}${overallImprovementPercent.toFixed(1)}%)\n`);

  console.log('📈 Query Performance:');
  results.forEach(result => {
    const symbol = result.improvement.confidenceDelta >= 0 ? '📈' : '📉';
    const trend = result.improvement.confidenceDelta >= 0 ? 'UP' : 'DOWN';
    console.log(`   ${symbol} ${result.queryId.padEnd(12)} ${(result.confidence * 100).toFixed(1)}% (${trend} ${Math.abs(result.improvement.confidenceDelta * 100).toFixed(1)}pp)`);
  });

  console.log('\n🎯 Interest Coverage:');
  const totalUniqueInterests = new Set(results.flatMap(r => r.interests)).size;
  console.log(`   Unique interests extracted: ${totalUniqueInterests}`);
  console.log(`   Interests per query: ${(results.reduce((sum, r) => sum + r.interests.length, 0) / results.length).toFixed(1)} avg`);

  console.log('\n🏆 Top Performers:');
  const topPerformers = results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  topPerformers.forEach((result, idx) => {
    console.log(`   ${idx + 1}. ${result.queryId}: ${(result.confidence * 100).toFixed(1)}% confidence`);
  });

  console.log('\n⚠️  Areas for Improvement:');
  const needsWork = results
    .filter(r => r.confidence < 0.55)
    .sort((a, b) => a.confidence - b.confidence);
  if (needsWork.length === 0) {
    console.log('   None - all queries above target threshold!');
  } else {
    needsWork.forEach(result => {
      console.log(`   • ${result.queryId}: ${(result.confidence * 100).toFixed(1)}% (target: 55%+)`);
    });
  }

  // Save detailed results
  const outputPath = path.join(__dirname, '../data/phase-c-validation-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      dataset: '12,000 products with Phase C enrichment',
      summary: {
        avgBaselineConfidence,
        avgPhaseCConfidence,
        overallImprovement,
        overallImprovementPercent,
        totalUniqueInterests,
      },
      results,
    }, null, 2)
  );

  console.log(`\n💾 Detailed results saved to: ${outputPath}`);
  console.log('');
}

// Run validation
runValidation().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
