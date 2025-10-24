/**
 * Neo4j Schema Setup
 *
 * Ultra-simple schema with:
 * - Product nodes with vector embeddings
 * - Category nodes
 * - Single relationship type (IN_CATEGORY)
 * - NO Facets, NO Occasions - 100% inference-based
 */

import { getSession } from '../lib/neo4j.js';
import { logSchemaSetup, logger } from '../lib/logger.js';

/**
 * Create all constraints for data integrity
 */
export async function createConstraints(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating Neo4j constraints...');

    // Product ID uniqueness
    try {
      await session.run(`
        CREATE CONSTRAINT product_id IF NOT EXISTS
        FOR (p:Product) REQUIRE p.id IS UNIQUE
      `);
      logSchemaSetup({
        operation: 'constraint',
        name: 'product_id',
        status: 'success'
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
        logSchemaSetup({
          operation: 'constraint',
          name: 'product_id',
          status: 'exists'
        });
      } else {
        throw error;
      }
    }

    // No category constraint needed - we're doing pure vector similarity

    logger.info('Constraints created successfully');

  } catch (error) {
    logger.error('Failed to create constraints', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Create regular indexes for query optimization
 */
export async function createIndexes(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating Neo4j indexes...');

    // Index on product price for budget filtering
    try {
      await session.run(`
        CREATE INDEX product_price IF NOT EXISTS
        FOR (p:Product) ON (p.price)
      `);
      logSchemaSetup({
        operation: 'index',
        name: 'product_price',
        status: 'success'
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
        logSchemaSetup({
          operation: 'index',
          name: 'product_price',
          status: 'exists'
        });
      } else {
        throw error;
      }
    }

    // Index on product availability for filtering
    try {
      await session.run(`
        CREATE INDEX product_available IF NOT EXISTS
        FOR (p:Product) ON (p.available)
      `);
      logSchemaSetup({
        operation: 'index',
        name: 'product_available',
        status: 'success'
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
        logSchemaSetup({
          operation: 'index',
          name: 'product_available',
          status: 'exists'
        });
      } else {
        throw error;
      }
    }

    logger.info('Indexes created successfully');

  } catch (error) {
    logger.error('Failed to create indexes', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Create vector index for embedding similarity search
 */
export async function createVectorIndex(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating vector index for embeddings...');

    try {
      await session.run(`
        CREATE VECTOR INDEX product_embeddings IF NOT EXISTS
        FOR (p:Product) ON (p.embedding)
        OPTIONS {
          indexConfig: {
            \`vector.dimensions\`: 1536,
            \`vector.similarity_function\`: 'cosine'
          }
        }
      `);
      logSchemaSetup({
        operation: 'vector_index',
        name: 'product_embeddings',
        status: 'success'
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
        logSchemaSetup({
          operation: 'vector_index',
          name: 'product_embeddings',
          status: 'exists'
        });
      } else {
        throw error;
      }
    }

    logger.info('Vector index created successfully');

  } catch (error) {
    logger.error('Failed to create vector index', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Setup complete schema (constraints + indexes + vector index)
 */
export async function setupSchema(): Promise<void> {
  logger.info('Setting up Neo4j schema...');

  try {
    await createConstraints();
    await createIndexes();
    await createVectorIndex();

    logger.info('Schema setup complete ✅');
  } catch (error) {
    logger.error('Schema setup failed', { error });
    throw error;
  }
}

/**
 * Verify schema is correctly set up
 */
export async function verifySchema(): Promise<{
  constraints: string[];
  indexes: string[];
  vectorIndexes: string[];
}> {
  const session = getSession();

  try {
    logger.info('Verifying schema setup...');

    // Get all constraints
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    const constraints = constraintsResult.records.map(r =>
      r.get('name')
    );

    // Get all indexes
    const indexesResult = await session.run('SHOW INDEXES');
    const allIndexes = indexesResult.records.map(r => ({
      name: r.get('name'),
      type: r.get('type')
    }));

    const regularIndexes = allIndexes
      .filter(i => i.type !== 'VECTOR')
      .map(i => i.name);

    const vectorIndexes = allIndexes
      .filter(i => i.type === 'VECTOR')
      .map(i => i.name);

    logger.info('Schema verification complete', {
      constraints: constraints.length,
      indexes: regularIndexes.length,
      vectorIndexes: vectorIndexes.length
    });

    return {
      constraints,
      indexes: regularIndexes,
      vectorIndexes
    };

  } catch (error) {
    logger.error('Schema verification failed', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Drop all constraints and indexes (for clean restart)
 */
export async function dropSchema(): Promise<void> {
  const session = getSession();

  try {
    logger.warn('Dropping all schema elements...');

    // Drop constraints
    const constraints = await session.run('SHOW CONSTRAINTS');
    for (const record of constraints.records) {
      const name = record.get('name');
      await session.run(`DROP CONSTRAINT ${name} IF EXISTS`);
      logger.info(`Dropped constraint: ${name}`);
    }

    // Drop indexes
    const indexes = await session.run('SHOW INDEXES');
    for (const record of indexes.records) {
      const name = record.get('name');
      await session.run(`DROP INDEX ${name} IF EXISTS`);
      logger.info(`Dropped index: ${name}`);
    }

    logger.warn('Schema dropped successfully');

  } catch (error) {
    logger.error('Failed to drop schema', { error });
    throw error;
  } finally {
    await session.close();
  }
}
