/**
 * Neo4j Driver - Database Connection Management
 *
 * Provides connection to Neo4j Aura instance with:
 * - Connection pooling
 * - Error handling
 * - Graceful shutdown
 * - Logging integration
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from './logger.js';

let driver: Driver | null = null;

interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
}

/**
 * Initialize Neo4j driver connection
 */
export async function initNeo4j(config: Neo4jConfig): Promise<Driver> {
  if (driver) {
    logger.warn('Neo4j driver already initialized');
    return driver;
  }

  try {
    logger.info('Initializing Neo4j driver', {
      uri: config.uri,
      database: config.database
    });

    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
        maxTransactionRetryTime: 30000
      }
    );

    // Verify connectivity
    await driver.verifyConnectivity();

    logger.info('Neo4j driver initialized successfully');
    return driver;

  } catch (error) {
    logger.error('Failed to initialize Neo4j driver', { error });
    throw error;
  }
}

/**
 * Get existing driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initNeo4j() first.');
  }
  return driver;
}

/**
 * Get a new session for database operations
 */
export function getSession(database?: string): Session {
  const driver = getDriver();
  return driver.session({
    database: database || process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.WRITE
  });
}

/**
 * Execute a read query with automatic session management
 */
export async function executeRead<T>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();

  try {
    logger.debug('Executing read query', { query, params });

    const result = await session.executeRead(tx =>
      tx.run(query, params)
    );

    logger.debug('Query executed successfully', {
      records: result.records.length
    });

    return result.records as T[];

  } catch (error) {
    logger.error('Read query failed', { query, params, error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a write query with automatic session management
 */
export async function executeWrite<T>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();

  try {
    logger.debug('Executing write query', { query, params });

    const result = await session.executeWrite(tx =>
      tx.run(query, params)
    );

    logger.debug('Query executed successfully', {
      records: result.records.length
    });

    return result.records as T[];

  } catch (error) {
    logger.error('Write query failed', { query, params, error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Close driver connection gracefully
 */
export async function closeNeo4j(): Promise<void> {
  if (!driver) {
    logger.warn('Neo4j driver not initialized, nothing to close');
    return;
  }

  try {
    logger.info('Closing Neo4j driver');
    await driver.close();
    driver = null;
    logger.info('Neo4j driver closed successfully');
  } catch (error) {
    logger.error('Failed to close Neo4j driver', { error });
    throw error;
  }
}

// Graceful shutdown on process exit
process.on('SIGINT', async () => {
  await closeNeo4j();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeNeo4j();
  process.exit(0);
});
