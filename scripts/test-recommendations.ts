#!/usr/bin/env tsx
/**
 * Test Recommendation Quality After Normalization
 *
 * Tests:
 * 1. Product data integrity
 * 2. Interest matching quality
 * 3. Recommendation scenarios
 * 4. Before/after comparison (using duplicate analysis)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import fs from 'fs';
import path from 'path';

interface TestResult {
  testName: string;
  passed: boolean;
  details: any;
}

const results: TestResult[] = [];

// Helper to convert Neo4j Integer or number to JS number
function toInt(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value.toInt === 'function') return value.toInt();
  return 0;
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        📊 Recommendation Quality Test Suite                    ║
║                                                                ║
║  Testing interest taxonomy after normalization                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Test 1: Data Integrity
    console.log('\n🔍 Test 1: Data Integrity Check\n');
    await testDataIntegrity(session);

    // Test 2: Interest Distribution
    console.log('\n📊 Test 2: Interest Distribution Analysis\n');
    await testInterestDistribution(session);

    // Test 3: Sample Product Interests
    console.log('\n🎁 Test 3: Sample Product Interest Quality\n');
    await testSampleProducts(session);

    // Test 4: Interest Matching Scenarios
    console.log('\n🎯 Test 4: Interest Matching Scenarios\n');
    await testInterestMatching(session);

    // Test 5: Duplicate Cleanup Verification
    console.log('\n🧹 Test 5: Duplicate Cleanup Verification\n');
    await testDuplicateCleanup(session);

    // Test 6: Recommendation Quality
    console.log('\n⭐ Test 6: Recommendation Quality Test\n');
    await testRecommendationQuality(session);

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('\n📋 TEST SUMMARY\n');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.testName}`);
    });

    console.log(`\nTotal: ${results.length} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

    // Save detailed report
    const reportFile = path.join(process.cwd(), 'data', 'test-results.json');
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: results.length, passed, failed },
      results,
    }, null, 2));

    console.log(`💾 Detailed report saved to: ${reportFile}\n`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

async function testDataIntegrity(session: any) {
  // Count products
  const productResult = await session.run('MATCH (p:Product) RETURN count(p) as count');
  const productCount = toInt(productResult.records[0].get('count'));
  console.log(`Products in database: ${productCount}`);

  // Count interests
  const interestResult = await session.run('MATCH (i:Interest) RETURN count(i) as count');
  const interestCount = toInt(interestResult.records[0].get('count'));
  console.log(`Unique interests: ${interestCount}`);

  // Count relationships
  const relResult = await session.run('MATCH ()-[r:MATCHES_INTEREST]->() RETURN count(r) as count');
  const relCount = toInt(relResult.records[0].get('count'));
  console.log(`Interest relationships: ${relCount}`);

  // Check for orphaned products
  const orphanResult = await session.run(`
    MATCH (p:Product)
    WHERE NOT (p)-[:MATCHES_INTEREST]->()
    RETURN count(p) as count
  `);
  const orphanCount = toInt(orphanResult.records[0].get('count'));
  console.log(`Products without interests: ${orphanCount}`);

  results.push({
    testName: 'Data Integrity',
    passed: interestCount === 12370 && orphanCount < 1000,
    details: { productCount, interestCount, relCount, orphanCount }
  });

  console.log(`\n${interestCount === 12370 ? '✅' : '⚠️'} Expected ~12,370 interests, found ${interestCount}`);
  console.log(`${orphanCount < 1000 ? '✅' : '⚠️'} Orphaned products: ${orphanCount} (expected < 1000)`);
}

async function testInterestDistribution(session: any) {
  // Get top 20 interests
  const topResult = await session.run(`
    MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
    RETURN i.name as interest, count(p) as productCount, avg(r.relevance_score) as avgRelevance
    ORDER BY productCount DESC
    LIMIT 20
  `);

  console.log('Top 20 interests:');
  const interests = topResult.records.map(r => ({
    name: r.get('interest'),
    count: toInt(r.get('productCount')),
    avgRelevance: parseFloat(r.get('avgRelevance').toFixed(2))
  }));

  interests.forEach((interest, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${interest.name.padEnd(30)} ${interest.count.toString().padStart(6)} products (avg: ${interest.avgRelevance})`);
  });

  // Check for quality
  const highQuality = interests.filter(i => i.avgRelevance >= 0.70).length;
  const passed = highQuality >= 15; // At least 15/20 should have good relevance

  results.push({
    testName: 'Interest Distribution',
    passed,
    details: { topInterests: interests, highQualityCount: highQuality }
  });

  console.log(`\n${passed ? '✅' : '⚠️'} ${highQuality}/20 top interests have avg relevance >= 0.70`);
}

async function testSampleProducts(session: any) {
  // Get 5 random products with their interests
  const sampleResult = await session.run(`
    MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
    WITH p, collect({interest: i.name, relevance: r.relevance_score}) as interests
    WHERE size(interests) >= 3
    RETURN p.id as id, p.title as title, interests
    ORDER BY rand()
    LIMIT 5
  `);

  const samples = sampleResult.records.map(r => ({
    id: r.get('id'),
    title: r.get('title'),
    interests: r.get('interests').map((i: any) => ({
      name: i.interest,
      relevance: i.relevance
    }))
  }));

  console.log('Sample products with interests:\n');
  samples.forEach((product, i) => {
    console.log(`${i + 1}. ${product.title}`);
    console.log(`   Interests (${product.interests.length}):`);
    product.interests.slice(0, 5).forEach((interest: any) => {
      console.log(`     - ${interest.name} (${interest.relevance.toFixed(2)})`);
    });
    console.log();
  });

  // Verify quality
  const avgInterestCount = samples.reduce((sum, p) => sum + p.interests.length, 0) / samples.length;
  const passed = avgInterestCount >= 3;

  results.push({
    testName: 'Sample Product Quality',
    passed,
    details: { samples, avgInterestCount: avgInterestCount.toFixed(1) }
  });

  console.log(`${passed ? '✅' : '⚠️'} Average interests per product: ${avgInterestCount.toFixed(1)} (expected >= 3)`);
}

async function testInterestMatching(session: any) {
  // Test scenarios
  const scenarios = [
    { query: 'coffee', expectedCount: 50, description: 'Coffee lovers' },
    { query: 'outdoor activities', expectedCount: 100, description: 'Outdoor enthusiasts' },
    { query: 'fashion', expectedCount: 500, description: 'Fashion interested' },
    { query: 'tech', expectedCount: 50, description: 'Tech enthusiasts' },
  ];

  console.log('Testing interest matching scenarios:\n');

  let passedScenarios = 0;

  for (const scenario of scenarios) {
    const result = await session.run(`
      MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: $interest})
      RETURN count(p) as count, avg(r.relevance_score) as avgRelevance
    `, { interest: scenario.query });

    const count = toInt(result.records[0]?.get('count') || 0);
    const avgRelevance = result.records[0]?.get('avgRelevance') || 0;
    const passed = count >= scenario.expectedCount;

    if (passed) passedScenarios++;

    console.log(`  ${passed ? '✅' : '⚠️'} ${scenario.description} ("${scenario.query}")`);
    console.log(`     Found: ${count} products (expected >= ${scenario.expectedCount})`);
    console.log(`     Avg relevance: ${avgRelevance ? avgRelevance.toFixed(2) : 'N/A'}`);
  }

  results.push({
    testName: 'Interest Matching Scenarios',
    passed: passedScenarios >= 3,
    details: { scenarios, passedCount: passedScenarios }
  });

  console.log(`\n${passedScenarios >= 3 ? '✅' : '⚠️'} ${passedScenarios}/${scenarios.length} scenarios passed`);
}

async function testDuplicateCleanup(session: any) {
  // Check for common duplicate patterns that should be cleaned
  const duplicatePatterns = [
    ['home-decor', 'home decor'],
    ['outdoor-activities', 'outdoor activities'],
    ['gift-giving', 'gift giving'],
  ];

  console.log('Verifying duplicate cleanup:\n');

  let foundDuplicates = 0;

  for (const [variant1, variant2] of duplicatePatterns) {
    const result = await session.run(`
      MATCH (i:Interest)
      WHERE i.name IN [$variant1, $variant2]
      RETURN collect(i.name) as names
    `, { variant1, variant2 });

    const names = result.records[0]?.get('names') || [];
    const hasBoth = names.length === 2;

    if (hasBoth) foundDuplicates++;

    console.log(`  ${!hasBoth ? '✅' : '❌'} "${variant1}" / "${variant2}"`);
    console.log(`     Found: ${names.length === 0 ? 'neither' : names.join(', ')}`);
    console.log(`     Status: ${hasBoth ? 'NOT MERGED ❌' : names.length === 1 ? 'MERGED ✅' : 'BOTH MISSING'}`);
  }

  results.push({
    testName: 'Duplicate Cleanup Verification',
    passed: foundDuplicates === 0,
    details: { duplicatePatternsFound: foundDuplicates }
  });

  console.log(`\n${foundDuplicates === 0 ? '✅' : '❌'} ${foundDuplicates} duplicate patterns still exist (expected 0)`);
}

async function testRecommendationQuality(session: any) {
  // Simulate a recommendation query
  const testQuery = {
    interests: ['coffee', 'reading', 'art'],
    description: 'Gift for someone who loves coffee, reading, and art'
  };

  console.log(`Query: "${testQuery.description}"`);
  console.log(`Interests: [${testQuery.interests.join(', ')}]\n`);

  // Find matching products
  const result = await session.run(`
    MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
    WHERE i.name IN $interests
    WITH p, collect({interest: i.name, relevance: r.relevance_score}) as matchedInterests,
         avg(r.relevance_score) as avgRelevance
    WHERE size(matchedInterests) >= 1
    RETURN p.id as id,
           p.title as title,
           p.price as price,
           matchedInterests,
           avgRelevance
    ORDER BY size(matchedInterests) DESC, avgRelevance DESC
    LIMIT 10
  `, { interests: testQuery.interests });

  const recommendations = result.records.map(r => ({
    id: r.get('id'),
    title: r.get('title'),
    price: r.get('price'),
    matchedInterests: r.get('matchedInterests'),
    avgRelevance: parseFloat(r.get('avgRelevance').toFixed(2))
  }));

  console.log(`Found ${recommendations.length} recommendations:\n`);

  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.title}`);
    console.log(`   Price: $${rec.price}`);
    console.log(`   Matched: ${rec.matchedInterests.map((m: any) => m.interest).join(', ')}`);
    console.log(`   Avg Relevance: ${rec.avgRelevance}`);
    console.log();
  });

  const passed = recommendations.length >= 5 && recommendations[0].avgRelevance >= 0.60;

  results.push({
    testName: 'Recommendation Quality',
    passed,
    details: { query: testQuery, recommendations, count: recommendations.length }
  });

  console.log(`${passed ? '✅' : '⚠️'} Found ${recommendations.length} recommendations (expected >= 5)`);
  console.log(`${passed ? '✅' : '⚠️'} Top result relevance: ${recommendations[0]?.avgRelevance || 0} (expected >= 0.60)`);
}

// Run tests
runTests().catch(console.error);
