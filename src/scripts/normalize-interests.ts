#!/usr/bin/env tsx
/**
 * Normalize and Merge Duplicate Interests
 *
 * This script:
 * 1. Loads duplicate analysis
 * 2. Merges duplicate interests in Neo4j
 * 3. Updates all MATCHES_INTEREST relationships to point to canonical interests
 * 4. Removes old interest nodes
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

interface DuplicateGroup {
  canonical: string;
  variants: Array<{
    name: string;
    count: number;
    avgRelevance: number;
  }>;
  totalProducts: number;
}

interface DuplicateReport {
  summary: {
    totalInterests: number;
    duplicateGroups: number;
    productsAffected: number;
    potentialReduction: number;
  };
  duplicates: DuplicateGroup[];
}

async function normalizeDuplicates(dryRun: boolean = true) {
  const spinner = ora('Loading duplicate analysis...').start();

  // Load duplicate report
  const reportFile = path.join(process.cwd(), 'data', 'duplicate-analysis.json');
  if (!fs.existsSync(reportFile)) {
    spinner.fail('Duplicate analysis not found. Run analyze-duplicates.ts first.');
    process.exit(1);
  }

  const report: DuplicateReport = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  spinner.succeed(`Loaded ${report.duplicates.length} duplicate groups`);

  // Initialize Neo4j
  spinner.start('Connecting to Neo4j...');
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();
  spinner.succeed('Connected to Neo4j');

  let mergedGroups = 0;
  let mergedInterests = 0;
  let updatedRelationships = 0;

  try {
    console.log(`\n${dryRun ? '🧪 DRY RUN MODE' : '🔄 LIVE MODE'} - Processing ${report.duplicates.length} duplicate groups\n`);

    for (const group of report.duplicates) {
      const canonical = group.canonical;
      const variantsToMerge = group.variants.slice(1); // Skip canonical (first one)

      if (variantsToMerge.length === 0) continue;

      spinner.start(`Processing: "${canonical}" (${variantsToMerge.length} variants)`);

      for (const variant of variantsToMerge) {
        // Find all products linked to this variant
        const findQuery = `
          MATCH (p:Product)-[r:MATCHES_INTEREST]->(old:Interest {name: $variantName})
          RETURN count(p) as productCount
        `;

        const findResult = await session.run(findQuery, {
          variantName: variant.name,
        });

        const productCountRaw = findResult.records[0]?.get('productCount');
        const productCount = typeof productCountRaw === 'number'
          ? productCountRaw
          : (productCountRaw?.toInt ? productCountRaw.toInt() : 0);

        if (productCount === 0) {
          spinner.info(`  Skipping "${variant.name}" - no relationships found`);
          continue;
        }

        if (!dryRun) {
          // Merge this variant into canonical
          const mergeQuery = `
            // Find all products linked to the variant
            MATCH (p:Product)-[oldRel:MATCHES_INTEREST]->(old:Interest {name: $variantName})

            // Ensure canonical interest exists
            MERGE (canonical:Interest {name: $canonicalName})
            ON CREATE SET
              canonical.created_at = datetime()

            // Create/update relationship to canonical
            MERGE (p)-[newRel:MATCHES_INTEREST]->(canonical)
            ON CREATE SET
              newRel.relevance_score = oldRel.relevance_score,
              newRel.confidence = oldRel.confidence,
              newRel.reasoning = oldRel.reasoning,
              newRel.extracted_at = oldRel.extracted_at,
              newRel.extraction_method = oldRel.extraction_method
            ON MATCH SET
              // Keep the relationship with higher relevance
              newRel.relevance_score = CASE
                WHEN oldRel.relevance_score > newRel.relevance_score
                THEN oldRel.relevance_score
                ELSE newRel.relevance_score
              END,
              newRel.confidence = CASE
                WHEN oldRel.confidence > newRel.confidence
                THEN oldRel.confidence
                ELSE newRel.confidence
              END

            // Delete old relationship
            DELETE oldRel

            RETURN count(newRel) as updatedCount
          `;

          const mergeResult = await session.run(mergeQuery, {
            variantName: variant.name,
            canonicalName: canonical,
          });

          const updatedRaw = mergeResult.records[0]?.get('updatedCount');
          const updated = typeof updatedRaw === 'number'
            ? updatedRaw
            : (updatedRaw?.toInt ? updatedRaw.toInt() : 0);
          updatedRelationships += updated;

          // Delete the old interest node if it has no more relationships
          const deleteQuery = `
            MATCH (old:Interest {name: $variantName})
            WHERE NOT (old)<-[:MATCHES_INTEREST]-()
            DELETE old
            RETURN count(old) as deletedCount
          `;

          const deleteResult = await session.run(deleteQuery, {
            variantName: variant.name,
          });

          const deletedRaw = deleteResult.records[0]?.get('deletedCount');
          const deleted = typeof deletedRaw === 'number'
            ? deletedRaw
            : (deletedRaw?.toInt ? deletedRaw.toInt() : 0);
          if (deleted > 0) {
            mergedInterests++;
          }

          spinner.succeed(`  ✓ Merged "${variant.name}" → "${canonical}" (${updated} relationships)`);
        } else {
          spinner.info(`  [DRY RUN] Would merge "${variant.name}" → "${canonical}" (${productCount} products)`);
          updatedRelationships += productCount;
          mergedInterests++;
        }
      }

      mergedGroups++;
    }

    spinner.succeed('Processing complete!');

    console.log('\n📊 Summary:\n');
    console.log(`Duplicate groups processed: ${mergedGroups}`);
    console.log(`Interests merged: ${mergedInterests}`);
    console.log(`Relationships updated: ${updatedRelationships}`);
    console.log(`\nExpected final interest count: ${report.summary.totalInterests - mergedInterests}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
    } else {
      console.log('\n✅ Normalization complete!\n');
    }

  } catch (error) {
    spinner.fail('Normalization failed');
    logger.error('Interest normalization failed', { error });
    throw error;
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           🔧 Interest Normalization & Deduplication            ║
║                                                                ║
║  Merges duplicate interests and updates relationships          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}
${dryRun ? '\nUse --live flag to apply changes' : ''}
`);

normalizeDuplicates(dryRun).catch(console.error);
