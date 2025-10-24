/**
 * Structured Logging System
 *
 * Winston-based logger with:
 * - JSON structured output
 * - Multiple log levels
 * - Context enrichment
 * - Console and file transports
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'present-agent2',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        devFormat
      )
    }),
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json()
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json()
    })
  ]
});

/**
 * Log recommendation search event
 */
export function logSearch(context: {
  query: string;
  budget?: { min: number; max: number };
  recipient?: string;
  occasion?: string;
  interests?: string[];
}) {
  logger.info('SEARCH_INITIATED', {
    event: 'search',
    ...context
  });
}

/**
 * Log vector search execution
 */
export function logVectorSearch(context: {
  queryEmbedding: number[];
  topK: number;
  resultsCount: number;
  executionTimeMs: number;
}) {
  logger.info('VECTOR_SEARCH_EXECUTED', {
    event: 'vector_search',
    embeddingDimensions: context.queryEmbedding.length,
    topK: context.topK,
    resultsCount: context.resultsCount,
    executionTimeMs: context.executionTimeMs
  });
}

/**
 * Log graph traversal execution
 */
export function logGraphTraversal(context: {
  startNode: string;
  relationshipTypes: string[];
  resultsCount: number;
  executionTimeMs: number;
}) {
  logger.info('GRAPH_TRAVERSAL_EXECUTED', {
    event: 'graph_traversal',
    ...context
  });
}

/**
 * Log hybrid scoring
 */
export function logHybridScoring(context: {
  vectorWeight: number;
  graphWeight: number;
  candidatesCount: number;
  finalCount: number;
  executionTimeMs: number;
}) {
  logger.info('HYBRID_SCORING_COMPLETED', {
    event: 'hybrid_scoring',
    ...context
  });
}

/**
 * Log LLM context extraction
 */
export function logLLMExtraction(context: {
  query: string;
  extractedContext: Record<string, any>;
  model: string;
  tokensUsed?: number;
  executionTimeMs: number;
}) {
  logger.info('LLM_CONTEXT_EXTRACTED', {
    event: 'llm_extraction',
    ...context
  });
}

/**
 * Log rationale generation
 */
export function logRationaleGeneration(context: {
  productId: string;
  userContext: Record<string, any>;
  rationale: string;
  model: string;
  tokensUsed?: number;
  executionTimeMs: number;
}) {
  logger.info('RATIONALE_GENERATED', {
    event: 'rationale_generation',
    ...context
  });
}

/**
 * Log recommendation results
 */
export function logRecommendations(context: {
  query: string;
  recommendationsCount: number;
  avgScore: number;
  avgConfidence: number;
  totalExecutionTimeMs: number;
  recommendations: Array<{
    productId: string;
    title: string;
    score: number;
    confidence: number;
  }>;
}) {
  logger.info('RECOMMENDATIONS_GENERATED', {
    event: 'recommendations',
    ...context
  });
}

/**
 * Log data ingestion progress
 */
export function logIngestionProgress(context: {
  stage: 'products' | 'categories' | 'relationships' | 'embeddings';
  processed: number;
  total: number;
  batchNumber?: number;
  executionTimeMs?: number;
}) {
  logger.info('INGESTION_PROGRESS', {
    event: 'ingestion',
    ...context,
    percentComplete: ((context.processed / context.total) * 100).toFixed(2)
  });
}

/**
 * Log schema setup
 */
export function logSchemaSetup(context: {
  operation: 'constraint' | 'index' | 'vector_index';
  name: string;
  status: 'success' | 'failed' | 'exists';
  error?: string;
}) {
  const level = context.status === 'failed' ? 'error' : 'info';
  logger[level]('SCHEMA_SETUP', {
    event: 'schema',
    ...context
  });
}

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (err) {
  // Directory might already exist, ignore error
}

export default logger;
