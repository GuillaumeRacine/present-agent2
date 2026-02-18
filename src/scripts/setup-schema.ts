/**
 * Setup Neo4j Schema Script
 *
 * Initializes the database with:
 * - Constraints for data integrity
 * - Indexes for query performance
 * - Vector index for similarity search
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { setupSchema, verifySchema, dropSchema } from '../src/db/schema.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldDrop = args.includes('--drop') || args.includes('--drop-all');
    const shouldVerifyOnly = args.includes('--verify');
    const skipTestData = args.includes('--skip-test-data');
    const verbose = args.includes('--verbose');

    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
🎁 Neo4j Schema Setup Script

Usage:
  npx tsx scripts/setup-schema.ts [options]

Options:
  --drop-all         Drop all existing data, constraints, and indexes before setup
  --drop             Alias for --drop-all
  --skip-test-data   Create schema without ingesting test data
  --verbose          Show detailed progress during setup
  --verify           Only verify existing schema (no setup)
  --help, -h         Show this help message

Examples:
  npx tsx scripts/setup-schema.ts                    # Setup with test data
  npx tsx scripts/setup-schema.ts --drop-all         # Clean setup (drops everything first)
  npx tsx scripts/setup-schema.ts --skip-test-data   # Setup schema only
  npx tsx scripts/setup-schema.ts --verify           # Verify current schema
  npx tsx scripts/setup-schema.ts --verbose          # Detailed output
      `);
      return;
    }

    // Initialize Neo4j connection
    console.log('\n🔌 Connecting to Neo4j...');
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });
    console.log('✅ Connected to Neo4j\n');

    // Drop existing schema if requested
    if (shouldDrop) {
      console.log('⚠️  WARNING: Dropping all existing data...');
      await dropSchema();
      console.log('✅ Schema dropped successfully\n');
    }

    // Verify only mode
    if (shouldVerifyOnly) {
      const schema = await verifySchema();
      console.log('\n📊 Schema Verification Results:');
      console.log('='.repeat(50));
      console.log('\n📝 Constraints:');
      schema.constraints.forEach(c => console.log(`  ✅ ${c}`));
      console.log('\n📇 Property Indexes:');
      schema.indexes.forEach(i => console.log(`  ✅ ${i}`));
      console.log('\n🧮 Vector Indexes:');
      schema.vectorIndexes.forEach(v => console.log(`  ✅ ${v}`));
      console.log('\n' + '='.repeat(50));
      console.log(`\nTotal: ${schema.constraints.length} constraints, ${schema.indexes.length} indexes, ${schema.vectorIndexes.length} vector indexes\n`);
      return;
    }

    // Setup schema
    console.log('🚀 Starting schema setup...\n');
    await setupSchema({ skipTestData, verbose });

    // Verify setup
    console.log('\n🔍 Verifying schema...');
    const schema = await verifySchema();

    // Display results
    console.log('\n' + '='.repeat(50));
    console.log('✅ Schema Setup Complete!');
    console.log('='.repeat(50));
    console.log(`\n📝 Constraints: ${schema.constraints.length}`);
    console.log(`📇 Property Indexes: ${schema.indexes.length}`);
    console.log(`🧮 Vector Indexes: ${schema.vectorIndexes.length}`);

    if (!skipTestData) {
      console.log(`\n🎲 Test Data: Ingested`);
      console.log(`  - 2 test users`);
      console.log(`  - 7 interests`);
      console.log(`  - 5 values`);
      console.log(`  - 5 occasions`);
      console.log(`  - 2 recipients`);
      console.log(`  - 8 products with relationships`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n💡 Next Steps:');
    console.log('  - Run: npx tsx scripts/cli.ts (when ready)');
    console.log('  - Or test Explorer agent directly');
    console.log('\n');

    logger.info('Schema setup completed successfully ✅');

  } catch (error) {
    logger.error('Schema setup failed', { error });
    console.error('\n❌ Schema setup failed:', error);
    console.error('\nPlease check:');
    console.error('  - Neo4j connection details in .env.local');
    console.error('  - Neo4j database is running');
    console.error('  - Neo4j version supports vector indexes (5.x+)');
    console.error('');
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

// Run main function
main();
