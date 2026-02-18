#!/usr/bin/env tsx
/**
 * Cleanup Orphaned Interests
 * Deletes Interest nodes that have no MATCHES_INTEREST relationships
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

function toInt(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value.toInt === 'function') return value.toInt();
  return 0;
}

async function cleanup(dryRun: boolean = true) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🧹 Cleanup Orphaned Interests                        ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will delete)'}
${dryRun ? '\nUse --live flag to apply changes' : ''}
`);

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Find orphaned interests
    const findResult = await session.run(`
      MATCH (i:Interest)
      WHERE NOT (i)<-[:MATCHES_INTEREST]-()
      RETURN i.name as name
      ORDER BY i.name
    `);

    const orphaned = findResult.records.map(r => r.get('name'));

    console.log(`Found ${orphaned.length} orphaned interests:\n`);
    orphaned.forEach((name, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${name}`);
    });

    if (orphaned.length === 0) {
      console.log('\n✅ No orphaned interests to clean up!');
      return;
    }

    if (dryRun) {
      console.log(`\n⚠️  DRY RUN: Would delete ${orphaned.length} interests`);
    } else {
      console.log(`\n🗑️  Deleting ${orphaned.length} orphaned interests...`);

      const deleteResult = await session.run(`
        MATCH (i:Interest)
        WHERE NOT (i)<-[:MATCHES_INTEREST]-()
        DELETE i
        RETURN count(i) as deleted
      `);

      const deleted = toInt(deleteResult.records[0]?.get('deleted'));
      console.log(`✅ Deleted ${deleted} orphaned interests`);
    }

  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

cleanup(dryRun).catch(console.error);
