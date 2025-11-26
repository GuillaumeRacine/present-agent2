#!/usr/bin/env tsx
/**
 * HTTP API Server for Present-Agent2
 *
 * Provides REST API endpoints for the frontend to interact with
 * the gift recommendation system.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createOrchestrator } from './services/orchestrator';
import { initNeo4j, closeNeo4j, getDriver } from './lib/neo4j';
import { logger } from './lib/logger';
import {
  persistConversation,
  getConversationHistory,
  getConversationDetails,
  getConversationStats,
} from './services/conversation-persister';
import { generateMagicLinkToken, generateSessionToken, verifyToken } from './lib/jwt';
import { sendMagicLinkEmail } from './lib/email';

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Optional auth middleware (env-gated)
function requireAuthIfEnabled(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authRequired = process.env.AUTH_REQUIRED === 'true';
  if (!authRequired) return next();

  try {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.slice('Bearer '.length);
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'session') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    (req as any).auth = { userId: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ENDPOINTS ====================

// Send magic link
app.post('/api/auth/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Generate magic link token
    const token = generateMagicLinkToken(email);

    // Send email
    const emailResult = await sendMagicLinkEmail(email, token);

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    logger.info('Magic link sent:', { email, messageId: emailResult.messageId });

    res.json({
      success: true,
      message: 'Magic link sent to your email',
      // Include preview URL in development
      previewUrl: emailResult.previewUrl,
    });
  } catch (error) {
    logger.error('Send magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify magic link token
app.post('/api/auth/verify-magic-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'magic_link') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Generate or retrieve user ID
    const email = payload.email;
    const session = getDriver().session();

    try {
      // Find or create user in Neo4j
      const result = await session.run(
        `
        MERGE (u:User {email: $email})
        ON CREATE SET u.id = randomUUID(), u.createdAt = datetime()
        ON MATCH SET u.lastLoginAt = datetime()
        RETURN u.id as userId, u.email as email
        `,
        { email }
      );

      const record = result.records[0];
      const userId = record.get('userId');

      // Generate 30-day session token
      const sessionToken = generateSessionToken(userId, email);

      logger.info('User authenticated:', { email, userId });

      res.json({
        success: true,
        sessionToken,
        userId,
        email,
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Verify magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify session token
app.post('/api/auth/verify-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    const payload = verifyToken(sessionToken);

    if (!payload || payload.type !== 'session') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({
      success: true,
      userId: payload.userId,
      email: payload.email,
    });
  } catch (error) {
    logger.error('Verify session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== RECOMMENDATION ENDPOINTS ====================

// Main recommendation endpoint
app.post('/api/recommend', requireAuthIfEnabled, async (req, res) => {
  try {
    const { userQuery, userId, sessionId, clarifications, skipQuestions, originalQuery } = req.body;

    if (!userQuery) {
      return res.status(400).json({ error: 'userQuery is required' });
    }

    logger.info('API: Received recommendation request', {
      userId: userId || 'anonymous',
      sessionId,
      queryLength: userQuery.length,
    });

    // Create orchestrator and execute (with DialogueManager enabled)
    const orchestrator = await createOrchestrator(true);  // Enable conversational UX
    const finalUserId = userId || 'anonymous';
    const finalSessionId = sessionId || `session-${Date.now()}`;

    const result = await orchestrator.execute({
      userQuery,
      userId: finalUserId,
      sessionId: finalSessionId,
      clarifications,
      skipQuestions,
      originalQuery,
    });

    // Persist conversation to Neo4j (async, don't block response)
    // Use originalQuery if available (for clarification rounds), otherwise userQuery
    const queryToPersist = originalQuery || userQuery;
    persistConversation(result, queryToPersist, finalUserId, finalSessionId).catch(
      (err) => {
        logger.error('Failed to persist conversation (non-blocking)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    );

    // Log differently based on mode
    if ('mode' in result) {
      logger.info('API: Dialogue-enabled response', {
        userId: finalUserId,
        sessionId: finalSessionId,
        mode: result.mode,
        executionTime: result.performance.totalExecutionTimeMs,
      });
    } else {
      // Old format (backward compatibility)
      logger.info('API: Recommendation completed', {
        userId: finalUserId,
        sessionId: finalSessionId,
        recommendations: (result as any).finalRecommendations?.recommendations?.length || 0,
        executionTime: result.performance.totalExecutionTimeMs,
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('API: Recommendation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get product statistics
app.get('/api/products/stats', requireAuthIfEnabled, async (req, res) => {
  try {
    const driver = getDriver();
    const session = driver.session();

    try {
      // Query Neo4j for actual statistics
      const result = await session.run(`
        MATCH (p:Product)
        WITH count(p) as totalProducts
        MATCH (f:Facet)
        WITH totalProducts, count(f) as totalFacets
        MATCH (c:Category)
        WITH totalProducts, totalFacets, count(c) as totalCategories
        MATCH (i:Interest)
        RETURN totalProducts, totalFacets, totalCategories, count(i) as totalInterests
      `);

      const record = result.records[0];

      res.json({
        totalProducts: record.get('totalProducts').toNumber(),
        totalFacets: record.get('totalFacets').toNumber(),
        totalCategories: record.get('totalCategories').toNumber(),
        totalInterests: record.get('totalInterests').toNumber(),
        topCategories: [], // TODO: Add query for top categories
        topInterests: [], // TODO: Add query for top interests
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('API: Failed to fetch product stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get conversation history
app.get('/api/conversations', requireAuthIfEnabled, async (req, res) => {
  try {
    const { userId, sessionId, success, startDate, endDate, limit, offset } =
      req.query;

    const conversations = await getConversationHistory({
      userId: userId as string | undefined,
      sessionId: sessionId as string | undefined,
      success: success ? success === 'true' : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ conversations, total: conversations.length });
  } catch (error) {
    logger.error('API: Failed to fetch conversation history', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Get conversation details
app.get('/api/conversations/:sessionId', requireAuthIfEnabled, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = await getConversationDetails(sessionId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    logger.error('API: Failed to fetch conversation details', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
});

// Get conversation statistics (global)
app.get('/api/conversations/stats', requireAuthIfEnabled, async (req, res) => {
  try {
    const { userId } = req.query;

    const stats = await getConversationStats(userId as string | undefined);

    res.json(stats);
  } catch (error) {
    logger.error('API: Failed to fetch conversation stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to fetch conversation stats' });
  }
});

// Search products
app.get('/api/products', requireAuthIfEnabled, async (req, res) => {
  try {
    const {
      search = '',
      category = 'all',
      interest = 'all',
      minPrice = 0,
      maxPrice = 1000,
      limit = 50,
    } = req.query;

    const driver = getDriver();
    const session = driver.session();

    try {
      // Build Cypher query with filters
      let query = `
        MATCH (p:Product)
        WHERE p.price >= $minPrice AND p.price <= $maxPrice
      `;

      if (search) {
        query += ` AND (toLower(p.name) CONTAINS toLower($search) OR toLower(p.description) CONTAINS toLower($search))`;
      }

      if (category !== 'all') {
        query += `
          MATCH (p)-[:IN_CATEGORY]->(c:Category {name: $category})
        `;
      }

      if (interest !== 'all') {
        query += `
          MATCH (p)-[:RELATED_TO]->(i:Interest {name: $interest})
        `;
      }

      query += `
        OPTIONAL MATCH (p)-[:HAS_FACET]->(f:Facet)
        OPTIONAL MATCH (p)-[:RELATED_TO]->(i:Interest)
        RETURN p, collect(DISTINCT f.name) as facets, collect(DISTINCT i.name) as interests
        LIMIT $limit
      `;

      const result = await session.run(query, {
        search: search as string,
        category: category as string,
        interest: interest as string,
        minPrice: parseFloat(minPrice as string),
        maxPrice: parseFloat(maxPrice as string),
        limit: parseInt(limit as string),
      });

      const products = result.records.map((record) => {
        const p = record.get('p').properties;
        return {
          id: p.product_id,
          name: p.name,
          description: p.description || '',
          price: p.price,
          vendor: p.vendor,
          category: p.category || '',
          facets: record.get('facets') || [],
          interests: record.get('interests') || [],
        };
      });

      res.json({ products, total: products.length });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('API: Failed to search products', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// ==================== FEEDBACK ENDPOINTS ====================

// Capture explicit or implicit feedback
// Body: { userId, sessionId, productId, event: 'like'|'dislike'|'purchase'|'click', rank?, rating?, comment? }
app.post('/api/feedback', requireAuthIfEnabled, async (req, res) => {
  try {
    const { userId, sessionId, productId, event, rank, rating, comment } = req.body || {};

    if (!userId || !sessionId || !productId || !event) {
      return res.status(400).json({ error: 'userId, sessionId, productId and event are required' });
    }

    const driver = getDriver();
    const session = driver.session();
    const feedbackId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      await session.run(
        `
        // Ensure User
        MERGE (u:User {userId: $userId})
        ON CREATE SET u.createdAt = datetime()

        // Ensure Conversation
        MERGE (c:Conversation {sessionId: $sessionId})
        ON CREATE SET c.createdAt = datetime()

        // Product node
        MATCH (p:Product {product_id: $productId})

        // Create Feedback
        CREATE (f:Feedback {
          id: $feedbackId,
          type: $event,
          rating: $rating,
          comment: $comment,
          rank: $rank,
          timestamp: datetime($timestamp)
        })

        // Link entities
        MERGE (u)-[:GAVE_FEEDBACK]->(f)
        MERGE (f)-[:ABOUT]->(p)
        MERGE (f)-[:IN_CONVERSATION]->(c)

        // Optionally link to Recommendation if exists
        WITH f, p, c
        OPTIONAL MATCH (c)-[:INCLUDES_RECOMMENDATION]->(r:Recommendation {productId: $productId})
        FOREACH (_ IN CASE WHEN r IS NULL THEN [] ELSE [1] END |
          MERGE (f)-[:ON_RECOMMENDATION]->(r)
        )

        RETURN f.id as id
        `,
        { userId, sessionId, productId, feedbackId, event, rating: rating ?? null, comment: comment ?? null, rank: rank ?? null, timestamp }
      );

      logger.info('Feedback captured', { userId, sessionId, productId, event, rank });
      res.json({ success: true });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('API: Failed to capture feedback', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to capture feedback' });
  }
});

// Start server
async function startServer() {
  try {
    // Initialize Neo4j
    await initNeo4j({
      uri: process.env.NEO4J_URL || '',
      username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    logger.info('Server: Neo4j connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server: API server running on http://localhost:${PORT}`);
      logger.info(`Server: Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Server: Failed to start', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Server: Shutting down gracefully...');
  await closeNeo4j();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Server: Shutting down gracefully...');
  await closeNeo4j();
  process.exit(0);
});

// Start
startServer();
