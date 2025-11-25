/**
 * Conversation History Management
 *
 * Stores and retrieves conversation turns from Neo4j for:
 * - Question deduplication (don't ask same question twice)
 * - Context accumulation across turns
 * - Analytics and debugging
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md Section 1
 */

import { Driver, int as neo4jInt } from 'neo4j-driver';
import {
  ConversationTurn,
  ConversationSession,
  ConversationHistoryError,
} from '../../types/dialogue';
import { logger } from '../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Conversation Turn Storage
// ============================================================================

/**
 * Store a conversation turn in Neo4j
 */
export async function storeConversationTurn(
  driver: Driver,
  turn: ConversationTurn
): Promise<void> {
  const session = driver.session();

  try {
    logger.debug('Storing conversation turn', {
      sessionId: turn.sessionId,
      turnNumber: turn.turnNumber,
    });

    const query = `
      // Create or match session node
      MERGE (session:ConversationSession {id: $sessionId})
      ON CREATE SET
        session.createdAt = datetime(),
        session.userId = $userId

      // Create turn node
      CREATE (turn:ConversationTurn {
        id: $turnId,
        sessionId: $sessionId,
        turnNumber: $turnNumber,
        timestamp: datetime($timestamp),
        userInput: $userInput,
        confidence: $confidence,
        recommendationsShown: $recommendationsShown,
        processingTimeMs: $processingTimeMs,

        // Store complex objects as JSON strings
        listenerOutputJson: $listenerOutputJson,
        dialogueDecisionJson: $dialogueDecisionJson,
        askedQuestionsJson: $askedQuestionsJson,
        receivedAnswersJson: $receivedAnswersJson
      })

      // Link turn to session
      CREATE (turn)-[:PART_OF]->(session)

      // Link to previous turn if exists
      WITH turn, session
      OPTIONAL MATCH (prev:ConversationTurn {
        sessionId: $sessionId,
        turnNumber: $prevTurnNumber
      })
      FOREACH (p IN CASE WHEN prev IS NOT NULL THEN [prev] ELSE [] END |
        CREATE (turn)-[:FOLLOWS]->(p)
      )

      RETURN turn.id as turnId
    `;

    const params = {
      turnId: turn.id,
      sessionId: turn.sessionId,
      userId: turn.sessionId.split('-')[0], // Extract userId from sessionId
      turnNumber: turn.turnNumber,
      prevTurnNumber: turn.turnNumber - 1,
      timestamp: turn.timestamp.toISOString(),
      userInput: turn.userInput,
      confidence: turn.confidence,
      recommendationsShown: turn.recommendationsShown,
      processingTimeMs: turn.processingTimeMs,
      listenerOutputJson: JSON.stringify(turn.listenerOutput),
      dialogueDecisionJson: JSON.stringify(turn.dialogueDecision),
      askedQuestionsJson: JSON.stringify(turn.askedQuestions),
      receivedAnswersJson: turn.receivedAnswers
        ? JSON.stringify(turn.receivedAnswers)
        : null,
    };

    await session.run(query, params);

    logger.info('Conversation turn stored successfully', {
      sessionId: turn.sessionId,
      turnId: turn.id,
      turnNumber: turn.turnNumber,
    });
  } catch (error) {
    logger.error('Failed to store conversation turn', {
      error,
      sessionId: turn.sessionId,
      turnNumber: turn.turnNumber,
    });
    throw new ConversationHistoryError('Failed to store conversation turn', {
      sessionId: turn.sessionId,
      error,
    });
  } finally {
    await session.close();
  }
}

// ============================================================================
// Conversation History Retrieval
// ============================================================================

/**
 * Retrieve conversation history for a session
 */
export async function getConversationHistory(
  driver: Driver,
  sessionId: string,
  limit: number = 10
): Promise<ConversationTurn[]> {
  const session = driver.session();

  try {
    logger.debug('Retrieving conversation history', { sessionId, limit });

    const query = `
      MATCH (session:ConversationSession {id: $sessionId})<-[:PART_OF]-(turn:ConversationTurn)
      WITH turn
      ORDER BY turn.turnNumber DESC
      LIMIT $limit
      RETURN turn
      ORDER BY turn.turnNumber ASC
    `;

    const result = await session.run(query, {
      sessionId,
      limit: neo4jInt(limit)
    });

    const turns: ConversationTurn[] = result.records.map((record) => {
      const turn = record.get('turn').properties;

      return {
        id: turn.id,
        sessionId: turn.sessionId,
        turnNumber: Number(turn.turnNumber),
        timestamp: new Date(turn.timestamp),
        userInput: turn.userInput,
        confidence: Number(turn.confidence),
        recommendationsShown: Boolean(turn.recommendationsShown),
        processingTimeMs: Number(turn.processingTimeMs),
        listenerOutput: JSON.parse(turn.listenerOutputJson),
        dialogueDecision: JSON.parse(turn.dialogueDecisionJson),
        askedQuestions: JSON.parse(turn.askedQuestionsJson),
        receivedAnswers: turn.receivedAnswersJson
          ? JSON.parse(turn.receivedAnswersJson)
          : undefined,
      };
    });

    logger.info('Conversation history retrieved', {
      sessionId,
      turnsRetrieved: turns.length,
    });

    return turns;
  } catch (error) {
    logger.error('Failed to retrieve conversation history', { error, sessionId });
    throw new ConversationHistoryError('Failed to retrieve conversation history', {
      sessionId,
      error,
    });
  } finally {
    await session.close();
  }
}

/**
 * Get last conversation turn for a session
 */
export async function getLastTurn(
  driver: Driver,
  sessionId: string
): Promise<ConversationTurn | null> {
  const session = driver.session();

  try {
    logger.debug('Retrieving last conversation turn', { sessionId });

    const query = `
      MATCH (session:ConversationSession {id: $sessionId})<-[:PART_OF]-(turn:ConversationTurn)
      RETURN turn
      ORDER BY turn.turnNumber DESC
      LIMIT 1
    `;

    const result = await session.run(query, { sessionId });

    if (result.records.length === 0) {
      return null;
    }

    const turn = result.records[0].get('turn').properties;

    return {
      id: turn.id,
      sessionId: turn.sessionId,
      turnNumber: Number(turn.turnNumber),
      timestamp: new Date(turn.timestamp),
      userInput: turn.userInput,
      confidence: Number(turn.confidence),
      recommendationsShown: Boolean(turn.recommendationsShown),
      processingTimeMs: Number(turn.processingTimeMs),
      listenerOutput: JSON.parse(turn.listenerOutputJson),
      dialogueDecision: JSON.parse(turn.dialogueDecisionJson),
      askedQuestions: JSON.parse(turn.askedQuestionsJson),
      receivedAnswers: turn.receivedAnswersJson
        ? JSON.parse(turn.receivedAnswersJson)
        : undefined,
    };
  } catch (error) {
    logger.error('Failed to retrieve last turn', { error, sessionId });
    throw new ConversationHistoryError('Failed to retrieve last turn', {
      sessionId,
      error,
    });
  } finally {
    await session.close();
  }
}

/**
 * Get all asked question IDs from session history
 */
export async function getAskedQuestions(
  driver: Driver,
  sessionId: string
): Promise<string[]> {
  const session = driver.session();

  try {
    logger.debug('Retrieving asked questions', { sessionId });

    const query = `
      MATCH (session:ConversationSession {id: $sessionId})<-[:PART_OF]-(turn:ConversationTurn)
      RETURN turn.askedQuestionsJson as askedQuestionsJson
      ORDER BY turn.turnNumber ASC
    `;

    const result = await session.run(query, { sessionId });

    const allAskedQuestions = new Set<string>();

    result.records.forEach((record) => {
      const askedQuestionsJson = record.get('askedQuestionsJson');
      if (askedQuestionsJson) {
        const questions = JSON.parse(askedQuestionsJson);
        questions.forEach((q: string) => allAskedQuestions.add(q));
      }
    });

    return Array.from(allAskedQuestions);
  } catch (error) {
    logger.error('Failed to retrieve asked questions', { error, sessionId });
    throw new ConversationHistoryError('Failed to retrieve asked questions', {
      sessionId,
      error,
    });
  } finally {
    await session.close();
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new conversation session
 */
export async function createConversationSession(
  driver: Driver,
  sessionId: string,
  userId: string
): Promise<void> {
  const session = driver.session();

  try {
    logger.debug('Creating conversation session', { sessionId, userId });

    const query = `
      CREATE (session:ConversationSession {
        id: $sessionId,
        userId: $userId,
        createdAt: datetime()
      })
      RETURN session.id as sessionId
    `;

    await session.run(query, { sessionId, userId });

    logger.info('Conversation session created', { sessionId, userId });
  } catch (error) {
    logger.error('Failed to create conversation session', {
      error,
      sessionId,
      userId,
    });
    throw new ConversationHistoryError('Failed to create conversation session', {
      sessionId,
      userId,
      error,
    });
  } finally {
    await session.close();
  }
}

/**
 * Complete a conversation session
 */
export async function completeConversationSession(
  driver: Driver,
  sessionId: string,
  outcome: 'recommendations_shown' | 'abandoned' | 'timed_out' | 'error'
): Promise<void> {
  const session = driver.session();

  try {
    logger.debug('Completing conversation session', { sessionId, outcome });

    const query = `
      MATCH (session:ConversationSession {id: $sessionId})
      SET
        session.completedAt = datetime(),
        session.outcome = $outcome,
        session.totalDurationMs = duration.between(session.createdAt, datetime()).milliseconds
      RETURN session.id as sessionId
    `;

    await session.run(query, { sessionId, outcome });

    logger.info('Conversation session completed', { sessionId, outcome });
  } catch (error) {
    logger.error('Failed to complete conversation session', {
      error,
      sessionId,
      outcome,
    });
    throw new ConversationHistoryError('Failed to complete conversation session', {
      sessionId,
      outcome,
      error,
    });
  } finally {
    await session.close();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique turn ID
 */
export function generateTurnId(sessionId: string, turnNumber: number): string {
  return `${sessionId}-turn-${turnNumber}`;
}

/**
 * Build a ConversationSession from history
 */
export async function buildConversationSession(
  driver: Driver,
  sessionId: string
): Promise<ConversationSession | null> {
  const turns = await getConversationHistory(driver, sessionId);

  if (turns.length === 0) {
    return null;
  }

  // Extract userId from sessionId or first turn
  const userId = sessionId.split('-')[0];

  const session: ConversationSession = {
    sessionId,
    userId,
    turns,
    startedAt: turns[0].timestamp,
  };

  // If last turn shows recommendations, mark as completed
  const lastTurn = turns[turns.length - 1];
  if (lastTurn.recommendationsShown) {
    session.completedAt = lastTurn.timestamp;
    session.outcome = 'recommendations_shown';
    session.totalDurationMs =
      session.completedAt.getTime() - session.startedAt.getTime();
  }

  return session;
}
