/**
 * Conversation Persistence Service
 *
 * Handles storing and retrieving conversation history in Neo4j
 */

import neo4j from 'neo4j-driver';
import { getDriver } from '../lib/neo4j';
import { logger } from '../lib/logger';
import type { OrchestratorOutput } from '../types/agents';

export interface ConversationRecord {
  sessionId: string;
  userId: string;
  timestamp: Date;
  query: string;
  success: boolean;
  executionTimeMs: number;
  recommendationCount: number;
  contextExtracted?: any;
  memoryRecalled?: any;
  relationshipAnalysis?: any;
  constraintsValidated?: any;
  meaningCriteria?: any;
  candidatesFound?: number;
  recommendations?: any[];
  conversationalIntro?: string;
  conversationalOutro?: string;
  agentTimings?: Record<string, number>;
  error?: string;
}

export interface ConversationQuery {
  userId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Persist a conversation to Neo4j
 */
export async function persistConversation(
  result: OrchestratorOutput,
  userQuery: string,
  userId: string,
  sessionId: string
): Promise<void> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const timestamp = new Date();
    const executionTimeMs = result.performance.totalExecutionTimeMs;

    // Extract mode-specific data with type guards
    let success = true;
    let recommendationCount = 0;
    let conversationalIntro: string | null = null;
    let conversationalOutro: string | null = null;
    let contextExtraction: any = null;
    let errorMessage: string | null = null;

    if (result.mode === 'recommendations' || result.mode === 'recommendations_with_refinement') {
      recommendationCount = result.recommendations?.recommendations?.length || 0;
      conversationalIntro = result.intro || result.recommendations?.conversationalIntro || null;
      conversationalOutro = result.recommendations?.conversationalOutro || null;
      contextExtraction = result.executionTrace?.listener || null;
    } else if (result.mode === 'clarifying') {
      // Clarifying mode - no recommendations yet
      recommendationCount = 0;
      contextExtraction = result.partialContext || null;
    }

    // Ensure we always have a valid query string
    // Try multiple sources with fallbacks
    const queryToStore =
      userQuery ||
      contextExtraction?.userQuery ||
      conversationalIntro?.slice(0, 100) ||
      'Query not captured';

    // Log warning if query is missing or invalid
    if (!userQuery || userQuery.trim() === '') {
      logger.warn('Conversation persisted with missing or empty userQuery', {
        sessionId,
        userId,
        hadResult: !!result,
        fallbackUsed: queryToStore !== userQuery,
        storedQuery: queryToStore,
      });
    }

    // Extract agent timings
    const agentTimings: Record<string, number> = {};
    if (result.performance.agentTimings) {
      if (Array.isArray(result.performance.agentTimings)) {
        result.performance.agentTimings.forEach((timing: any) => {
          agentTimings[timing.agent] = timing.durationMs;
        });
      } else {
        // agentTimings is already a Record<string, number>
        Object.assign(agentTimings, result.performance.agentTimings);
      }
    }

    // Create Conversation node and link to User
    await session.run(
      `
      // Ensure User exists
      MERGE (u:User {userId: $userId})
      ON CREATE SET u.createdAt = datetime()

      // Create Conversation node
      CREATE (c:Conversation {
        sessionId: $sessionId,
        userId: $userId,
        timestamp: datetime($timestamp),
        userQuery: $userQuery,
        success: $success,
        executionTimeMs: $executionTimeMs,
        recommendationCount: $recommendationCount,
        conversationalIntro: $conversationalIntro,
        conversationalOutro: $conversationalOutro,
        agentTimings: $agentTimings,
        error: $error
      })

      // Link User to Conversation
      CREATE (u)-[:HAD_CONVERSATION]->(c)

      // Store context extraction if available
      WITH c
      WHERE $contextJson IS NOT NULL
      CREATE (ctx:ConversationContext {
        sessionId: $sessionId,
        data: $contextJson
      })
      CREATE (c)-[:EXTRACTED_CONTEXT]->(ctx)

      RETURN c.sessionId as sessionId
      `,
      {
        userId,
        sessionId,
        timestamp: timestamp.toISOString(),
        userQuery: queryToStore,
        success,
        executionTimeMs,
        recommendationCount,
        conversationalIntro,
        conversationalOutro,
        agentTimings: JSON.stringify(agentTimings),
        error: errorMessage,
        contextJson: contextExtraction ? JSON.stringify(contextExtraction) : null,
      }
    );

    // Store each recommendation and link to products
    const recommendations =
      result.mode === 'recommendations' || result.mode === 'recommendations_with_refinement'
        ? result.recommendations?.recommendations
        : undefined;

    if (recommendations) {
      for (const rec of recommendations) {
        await session.run(
          `
          MATCH (c:Conversation {sessionId: $sessionId})
          MATCH (p:Product {product_id: $productId})

          CREATE (r:Recommendation {
            sessionId: $sessionId,
            productId: $productId,
            rank: $rank,
            reasoning: $reasoning,
            confidenceScore: $confidenceScore,
            tags: $tags,
            timestamp: datetime($timestamp)
          })

          CREATE (c)-[:INCLUDES_RECOMMENDATION]->(r)
          CREATE (r)-[:RECOMMENDS_PRODUCT]->(p)

          RETURN r.productId as productId
          `,
          {
            sessionId,
            productId: rec.product.id,
            rank: rec.rank,
            reasoning: rec.reasoning || '',
            confidenceScore: rec.confidence || 0,
            tags: rec.tags || [],
            timestamp: timestamp.toISOString(),
          }
        );
      }
    }

    logger.info('Conversation persisted successfully', {
      sessionId,
      userId,
      recommendationCount,
      queryStored: queryToStore.substring(0, 50) + (queryToStore.length > 50 ? '...' : ''),
      hadOriginalQuery: !!userQuery,
    });
  } catch (error) {
    logger.error('Failed to persist conversation', {
      sessionId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - persistence failure shouldn't break the API response
  } finally {
    await session.close();
  }
}

/**
 * Retrieve conversation history for a user
 */
export async function getConversationHistory(
  query: ConversationQuery
): Promise<ConversationRecord[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const cypherQuery = `
      MATCH (u:User)-[:HAD_CONVERSATION]->(c:Conversation)
      WHERE 1=1
      ${query.userId ? 'AND u.userId = $userId' : ''}
      ${query.sessionId ? 'AND c.sessionId = $sessionId' : ''}
      ${query.success !== undefined ? 'AND c.success = $success' : ''}
      ${query.startDate ? 'AND c.timestamp >= datetime($startDate)' : ''}
      ${query.endDate ? 'AND c.timestamp <= datetime($endDate)' : ''}

      RETURN c.sessionId as sessionId,
             u.userId as userId,
             c.timestamp as timestamp,
             c.userQuery as query,
             c.success as success,
             c.executionTimeMs as executionTimeMs,
             c.recommendationCount as recommendationCount,
             c.conversationalIntro as conversationalIntro,
             c.conversationalOutro as conversationalOutro,
             c.agentTimings as agentTimings,
             c.error as error

      ORDER BY c.timestamp DESC
      SKIP $offset
      LIMIT $limit
    `;

    const result = await session.run(cypherQuery, {
      userId: query.userId || null,
      sessionId: query.sessionId || null,
      success: query.success,
      startDate: query.startDate?.toISOString() || null,
      endDate: query.endDate?.toISOString() || null,
      offset: neo4j.int(query.offset || 0),
      limit: neo4j.int(query.limit || 50),
    });

    return result.records.map((record) => {
      const timestamp = record.get('timestamp');
      return {
        sessionId: record.get('sessionId'),
        userId: record.get('userId'),
        timestamp: new Date(timestamp.toString()),
        query: record.get('query'),
        success: record.get('success'),
        executionTimeMs: record.get('executionTimeMs'),
        recommendationCount: record.get('recommendationCount'),
        conversationalIntro: record.get('conversationalIntro'),
        conversationalOutro: record.get('conversationalOutro'),
        agentTimings: record.get('agentTimings')
          ? JSON.parse(record.get('agentTimings'))
          : {},
        error: record.get('error'),
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Get detailed conversation with recommendations
 */
export async function getConversationDetails(
  sessionId: string
): Promise<ConversationRecord | null> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Get conversation details
    const convResult = await session.run(
      `
      MATCH (u:User)-[:HAD_CONVERSATION]->(c:Conversation {sessionId: $sessionId})

      OPTIONAL MATCH (c)-[:EXTRACTED_CONTEXT]->(ctx:ConversationContext)

      RETURN c.sessionId as sessionId,
             u.userId as userId,
             c.timestamp as timestamp,
             c.userQuery as query,
             c.success as success,
             c.executionTimeMs as executionTimeMs,
             c.recommendationCount as recommendationCount,
             c.conversationalIntro as conversationalIntro,
             c.conversationalOutro as conversationalOutro,
             c.agentTimings as agentTimings,
             c.error as error,
             ctx.data as contextData
      `,
      { sessionId }
    );

    if (convResult.records.length === 0) {
      return null;
    }

    const record = convResult.records[0];
    const timestamp = record.get('timestamp');

    // Get recommendations
    const recsResult = await session.run(
      `
      MATCH (c:Conversation {sessionId: $sessionId})-[:INCLUDES_RECOMMENDATION]->(r:Recommendation)
      MATCH (r)-[:RECOMMENDS_PRODUCT]->(p:Product)

      RETURN r.rank as rank,
             r.reasoning as reasoning,
             r.confidenceScore as confidenceScore,
             r.tags as tags,
             p.product_id as productId,
             p.name as productName,
             p.description as productDescription,
             p.price as productPrice,
             p.vendor as productVendor

      ORDER BY r.rank ASC
      `,
      { sessionId }
    );

    const recommendations = recsResult.records.map((rec) => ({
      rank: rec.get('rank'),
      product: {
        id: rec.get('productId'),
        title: rec.get('productName'),
        description: rec.get('productDescription') || '',
        price: rec.get('productPrice'),
        vendor: rec.get('productVendor'),
      },
      reasoning: rec.get('reasoning'),
      confidenceScore: rec.get('confidenceScore'),
      tags: rec.get('tags'),
    }));

    const contextData = record.get('contextData');

    return {
      sessionId: record.get('sessionId'),
      userId: record.get('userId'),
      timestamp: new Date(timestamp.toString()),
      query: record.get('query'),
      success: record.get('success'),
      executionTimeMs: record.get('executionTimeMs'),
      recommendationCount: record.get('recommendationCount'),
      conversationalIntro: record.get('conversationalIntro'),
      conversationalOutro: record.get('conversationalOutro'),
      agentTimings: record.get('agentTimings')
        ? JSON.parse(record.get('agentTimings'))
        : {},
      error: record.get('error'),
      recommendations,
      contextExtracted: contextData ? JSON.parse(contextData) : null,
    };
  } finally {
    await session.close();
  }
}

/**
 * Get conversation statistics for a user
 */
export async function getConversationStats(userId?: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)-[:HAD_CONVERSATION]->(c:Conversation)
      ${userId ? 'WHERE u.userId = $userId' : ''}

      WITH count(c) as totalConversations,
           sum(CASE WHEN c.success THEN 1 ELSE 0 END) as successfulConversations,
           sum(c.recommendationCount) as totalRecommendations,
           avg(c.executionTimeMs) as avgExecutionTimeMs

      RETURN totalConversations,
             successfulConversations,
             totalRecommendations,
             avgExecutionTimeMs
      `,
      { userId: userId || null }
    );

    if (result.records.length === 0) {
      return {
        totalConversations: 0,
        successfulConversations: 0,
        totalRecommendations: 0,
        avgExecutionTimeMs: 0,
      };
    }

    const record = result.records[0];
    return {
      totalConversations: record.get('totalConversations').toNumber(),
      successfulConversations: record.get('successfulConversations').toNumber(),
      totalRecommendations: record.get('totalRecommendations').toNumber(),
      avgExecutionTimeMs: record.get('avgExecutionTimeMs'),
    };
  } finally {
    await session.close();
  }
}
