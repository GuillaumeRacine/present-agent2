#!/usr/bin/env tsx
/**
 * Facet Ingestion Script
 *
 * Ingests all product facets from data/export/facets.json into Neo4j:
 * - 105,731+ facet relationships
 * - Interest facets → HAS_INTEREST relationships
 * - Occasion facets → HAS_OCCASION relationships
 * - Price band facets → price metadata
 * - Batch processing with progress tracking
 *
 * Usage:
 *   npx tsx scripts/ingest-facets.ts [options]
 *
 * Options:
 *   --batch-size <n>   Facets per batch (default: 500)
 *   --dry-run          Validate data without writing to Neo4j
 *   --limit <n>        Only ingest first N facets (testing)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';
import chalk from 'chalk';

// Configuration
const CONFIG = {
  batchSize: 500,
  dryRun: false,
  limit: null as number | null,
  dataPath: 'data/export/facets.json',
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        CONFIG.batchSize = parseInt(args[++i]);
        break;
      case '--dry-run':
        CONFIG.dryRun = true;
        break;
      case '--limit':
        CONFIG.limit = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Facet Ingestion Script

Usage: npx tsx scripts/ingest-facets.ts [options]

Options:
  --batch-size <n>   Facets per batch (default: 500)
  --dry-run          Validate data without writing to Neo4j
  --limit <n>        Only ingest first N facets (testing)
  --help             Show this help message
        `);
        process.exit(0);
    }
  }
}

interface Facet {
  product_id: string;
  facet_key: string;
  facet_value: string;
  source: string;
  confidence: string;
}

interface FacetStats {
  total: number;
  byKey: Record<string, number>;
  skipped: number;
  errors: number;
}

async function ingestFacetBatch(facets: Facet[], stats: FacetStats): Promise<void> {
  if (CONFIG.dryRun) {
    facets.forEach(f => {
      stats.byKey[f.facet_key] = (stats.byKey[f.facet_key] || 0) + 1;
    });
    return;
  }

  const session = getSession();

  try {
    // Group facets by type for efficient batch processing
    const interestFacets = facets.filter(f => f.facet_key === 'interest');
    const occasionFacets = facets.filter(f => f.facet_key === 'occasion');
    const priceBandFacets = facets.filter(f => f.facet_key === 'price_band');

    // Ingest interest facets (create MATCHES_INTEREST relationships)
    if (interestFacets.length > 0) {
      await session.run(`
        UNWIND $facets AS facet
        MATCH (p:Product {id: facet.product_id})
        MERGE (i:Interest {name: facet.facet_value})
        MERGE (p)-[r:MATCHES_INTEREST]->(i)
        SET r.confidence = toFloat(facet.confidence),
            r.source = facet.source
      `, { facets: interestFacets });

      stats.byKey['interest'] = (stats.byKey['interest'] || 0) + interestFacets.length;
    }

    // Ingest occasion facets (create SUITABLE_FOR relationships)
    if (occasionFacets.length > 0) {
      await session.run(`
        UNWIND $facets AS facet
        MATCH (p:Product {id: facet.product_id})
        MERGE (o:Occasion {name: facet.facet_value})
        MERGE (p)-[r:SUITABLE_FOR]->(o)
        SET r.confidence = toFloat(facet.confidence),
            r.source = facet.source
      `, { facets: occasionFacets });

      stats.byKey['occasion'] = (stats.byKey['occasion'] || 0) + occasionFacets.length;
    }

    // Ingest price band facets (set as product property)
    if (priceBandFacets.length > 0) {
      await session.run(`
        UNWIND $facets AS facet
        MATCH (p:Product {id: facet.product_id})
        SET p.priceBand = facet.facet_value
      `, { facets: priceBandFacets });

      stats.byKey['price_band'] = (stats.byKey['price_band'] || 0) + priceBandFacets.length;
    }

  } catch (error: any) {
    logger.error('Batch ingestion failed', { error: error.message });
    stats.errors++;
    throw error;
  } finally {
    await session.close();
  }
}

async function main() {
  parseArgs();

  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║           🎁 Ingest Product Facets                             ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.gray(`Mode: ${CONFIG.dryRun ? 'DRY RUN (no database changes)' : 'LIVE (will update database)'}`));
  console.log(chalk.gray(`Batch size: ${CONFIG.batchSize} facets`));
  if (CONFIG.limit) {
    console.log(chalk.yellow(`Limit: ${CONFIG.limit} facets (testing mode)`));
  }
  console.log();

  // Initialize Neo4j
  if (!CONFIG.dryRun) {
    await initNeo4j({
      uri: process.env.NEO4J_URL || '',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });
  }

  // Load facets from JSON file
  const spinner = ora('Loading facets.json...').start();

  let facets: Facet[];
  try {
    const facetsPath = path.join(process.cwd(), CONFIG.dataPath);
    const facetsData = fs.readFileSync(facetsPath, 'utf-8');
    facets = JSON.parse(facetsData);

    if (CONFIG.limit) {
      facets = facets.slice(0, CONFIG.limit);
    }

    spinner.succeed(`Loaded ${facets.length.toLocaleString()} facets`);
  } catch (error: any) {
    spinner.fail(`Failed to load facets: ${error.message}`);
    process.exit(1);
  }

  // Process facets in batches
  const stats: FacetStats = {
    total: facets.length,
    byKey: {},
    skipped: 0,
    errors: 0,
  };

  const batchCount = Math.ceil(facets.length / CONFIG.batchSize);
  console.log(chalk.cyan(`\nProcessing ${facets.length.toLocaleString()} facets in ${batchCount} batches...\n`));

  const progressSpinner = ora('Starting ingestion...').start();

  for (let i = 0; i < facets.length; i += CONFIG.batchSize) {
    const batch = facets.slice(i, Math.min(i + CONFIG.batchSize, facets.length));
    const batchNum = Math.floor(i / CONFIG.batchSize) + 1;

    try {
      progressSpinner.text = `Processing batch ${batchNum}/${batchCount} (${i + batch.length}/${facets.length})`;
      await ingestFacetBatch(batch, stats);
    } catch (error: any) {
      progressSpinner.fail(`Batch ${batchNum} failed: ${error.message}`);
      break;
    }
  }

  progressSpinner.succeed(`Processed ${facets.length.toLocaleString()} facets`);

  // Summary
  console.log(chalk.blue.bold('\n📊 Summary:\n'));
  console.log(chalk.white(`Total facets: ${stats.total.toLocaleString()}`));
  console.log(chalk.white(`Errors: ${stats.errors}`));
  console.log();
  console.log(chalk.cyan('Facets by type:'));

  const sortedKeys = Object.entries(stats.byKey).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedKeys) {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(chalk.white(`  - ${key}: ${count.toLocaleString()} (${percentage}%)`));
  }

  if (!CONFIG.dryRun) {
    await closeNeo4j();
  }

  console.log(chalk.green.bold('\n✓ Facet ingestion complete!\n'));
}

main().catch((error) => {
  console.error(chalk.red('\n✗ Fatal error:'), error);
  process.exit(1);
});
