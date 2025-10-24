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
    const shouldDrop = args.includes('--drop');
    const shouldVerifyOnly = args.includes('--verify');

    // Initialize Neo4j connection
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    // Drop existing schema if requested
    if (shouldDrop) {
      logger.warn('Dropping existing schema...');
      await dropSchema();
      logger.info('Schema dropped successfully ✅');
    }

    // Verify only mode
    if (shouldVerifyOnly) {
      const schema = await verifySchema();
      console.log('\n📊 Schema Verification Results:');
      console.log('================================');
      console.log('\nConstraints:');
      schema.constraints.forEach(c => console.log(`  ✅ ${c}`));
      console.log('\nIndexes:');
      schema.indexes.forEach(i => console.log(`  ✅ ${i}`));
      console.log('\nVector Indexes:');
      schema.vectorIndexes.forEach(v => console.log(`  ✅ ${v}`));
      console.log('\n================================\n');
      return;
    }

    // Setup schema
    logger.info('🚀 Starting schema setup...');
    await setupSchema();

    // Verify setup
    logger.info('🔍 Verifying schema...');
    const schema = await verifySchema();

    // Display results
    console.log('\n✅ Schema Setup Complete!');
    console.log('========================');
    console.log(`Constraints: ${schema.constraints.length}`);
    console.log(`Indexes: ${schema.indexes.length}`);
    console.log(`Vector Indexes: ${schema.vectorIndexes.length}`);
    console.log('========================\n');

    logger.info('Schema setup completed successfully ✅');

  } catch (error) {
    logger.error('Schema setup failed', { error });
    console.error('\n❌ Schema setup failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

// Run main function
main();
