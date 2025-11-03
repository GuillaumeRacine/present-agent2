#!/usr/bin/env tsx
/**
 * Investigate Interest Count Discrepancy
 *
 * Expected: 12,370 interests after normalization
 * Actual: 14,117 interests
 * Difference: +1,747 interests
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import fs from 'fs';
import path from 'path';

// Helper to convert Neo4j Integer or number to JS number
function toInt(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value.toInt === 'function') return value.toInt();
  return 0;
}

async function investigate() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           🔍 Interest Count Investigation                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. Total interest count
    console.log('1️⃣  Total Interest Nodes:\n');
    const totalResult = await session.run('MATCH (i:Interest) RETURN count(i) as count');
    const totalCount = toInt(totalResult.records[0].get('count'));
    console.log(`   Total: ${totalCount} interests`);

    // 2. Interests WITH relationships (should be used)
    console.log('\n2️⃣  Interests WITH Product Relationships:\n');
    const usedResult = await session.run(`
      MATCH (i:Interest)<-[:MATCHES_INTEREST]-()
      RETURN count(DISTINCT i) as count
    `);
    const usedCount = toInt(usedResult.records[0].get('count'));
    console.log(`   Used: ${usedCount} interests`);

    // 3. Orphaned interests WITHOUT relationships (should be cleaned up)
    console.log('\n3️⃣  Orphaned Interests (NO Product Relationships):\n');
    const orphanedResult = await session.run(`
      MATCH (i:Interest)
      WHERE NOT (i)<-[:MATCHES_INTEREST]-()
      RETURN count(i) as count
    `);
    const orphanedCount = toInt(orphanedResult.records[0].get('count'));
    console.log(`   Orphaned: ${orphanedCount} interests`);
    console.log(`   ${orphanedCount > 0 ? '⚠️  These should be deleted!' : '✅ No orphaned interests'}`);

    // 4. Show sample orphaned interests
    if (orphanedCount > 0) {
      console.log('\n   Sample orphaned interests:');
      const sampleResult = await session.run(`
        MATCH (i:Interest)
        WHERE NOT (i)<-[:MATCHES_INTEREST]-()
        RETURN i.name as name
        ORDER BY i.name
        LIMIT 20
      `);
      sampleResult.records.forEach((record, i) => {
        console.log(`     ${(i + 1).toString().padStart(2)}. ${record.get('name')}`);
      });
      if (orphanedCount > 20) {
        console.log(`     ... and ${orphanedCount - 20} more`);
      }
    }

    // 5. Expected vs actual after cleanup
    console.log('\n4️⃣  Expected State After Cleanup:\n');
    const expectedAfterCleanup = totalCount - orphanedCount;
    console.log(`   Current total: ${totalCount}`);
    console.log(`   Orphaned (to remove): ${orphanedCount}`);
    console.log(`   Expected after cleanup: ${expectedAfterCleanup}`);
    console.log(`   Original expectation: 12,370`);
    console.log(`   Difference: ${expectedAfterCleanup - 12370}`);

    // 6. Check for remaining duplicates
    console.log('\n5️⃣  Checking for Remaining Duplicates:\n');
    const duplicatesResult = await session.run(`
      MATCH (i:Interest)
      WITH toLower(replace(i.name, '-', ' ')) as normalized, collect(i.name) as variants
      WHERE size(variants) > 1
      RETURN normalized, variants, size(variants) as count
      ORDER BY count DESC
      LIMIT 10
    `);

    if (duplicatesResult.records.length > 0) {
      console.log('   Found potential duplicates:\n');
      duplicatesResult.records.forEach((record, i) => {
        const variants = record.get('variants');
        const count = toInt(record.get('count'));
        console.log(`   ${i + 1}. ${count} variants:`);
        variants.forEach((v: string) => console.log(`      - "${v}"`));
      });
    } else {
      console.log('   ✅ No obvious duplicates found (by name normalization)');
    }

    // 7. Summary
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Expected after normalization: 12,370`);
    console.log(`Current interest count: ${totalCount}`);
    console.log(`  - Used interests: ${usedCount}`);
    console.log(`  - Orphaned interests: ${orphanedCount}`);
    console.log(`After cleanup would have: ${expectedAfterCleanup}`);
    console.log(`Remaining discrepancy: ${expectedAfterCleanup - 12370} interests\n`);

    if (orphanedCount > 0) {
      console.log('⚠️  RECOMMENDATION: Delete orphaned interests');
      console.log('   Run: npx tsx scripts/cleanup-orphaned-interests.ts --live\n');
    }

    if (expectedAfterCleanup > 12370) {
      console.log('ℹ️  NOTE: Additional interests beyond expected may be due to:');
      console.log('   1. New products processed since analysis');
      console.log('   2. Interests that couldn\'t be normalized');
      console.log('   3. Different normalization rules in analysis vs merge\n');
    }

  } catch (error) {
    console.error('Investigation failed:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

investigate().catch(console.error);
