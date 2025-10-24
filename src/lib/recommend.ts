/**
 * Recommendation Engine - Pure Vector Similarity
 *
 * Ultra-simple inference-based recommendations:
 * 1. LLM extracts context from user query
 * 2. Generate embedding for enriched query
 * 3. Vector similarity search in Neo4j
 * 4. LLM generates rationales for top results
 */

import neo4j from 'neo4j-driver';
import { getSession } from './neo4j.js';
import { generateEmbedding } from './openai.js';
import {
  logger,
  logSearch,
  logVectorSearch,
  logLLMExtraction,
  logRationaleGeneration,
  logRecommendations
} from './logger.js';
import type {
  SearchContext,
  ExtractedContext,
  Recommendation,
  ProductNode
} from '../types/index.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Extract context from natural language query using LLM
 */
export async function extractContext(query: string): Promise<ExtractedContext> {
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap for extraction
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract gift context from this query. Return JSON only, no markdown.

Query: "${query}"

Return this exact JSON structure:
{
  "recipient": "string or null",
  "occasion": "string or null",
  "interests": ["array", "of", "strings"],
  "priceRange": {"min": number, "max": number},
  "categories": ["relevant", "product", "types"],
  "sentiment": "casual|formal|playful|serious",
  "urgency": "immediate|planned|future"
}

Example:
Query: "birthday gift for tech-savvy dad under $100"
{
  "recipient": "dad",
  "occasion": "birthday",
  "interests": ["technology", "gadgets", "electronics"],
  "priceRange": {"min": 20, "max": 100},
  "categories": ["electronics", "tech accessories", "smart devices"],
  "sentiment": "casual",
  "urgency": "planned"
}`
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON from response (strip markdown if present)
    let jsonText = textContent.text.trim();
    jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');

    const extracted: ExtractedContext = JSON.parse(jsonText);

    const executionTime = Date.now() - startTime;

    logLLMExtraction({
      query,
      extractedContext: extracted,
      model: 'claude-3-haiku-20240307',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      executionTimeMs: executionTime
    });

    return extracted;

  } catch (error) {
    logger.error('Context extraction failed', { query, error });

    // Fallback to basic extraction
    return {
      recipient: null,
      occasion: null,
      interests: [],
      priceRange: { min: 0, max: 1000 },
      categories: [],
      sentiment: 'casual',
      urgency: 'planned'
    };
  }
}

/**
 * Search products by vector similarity
 */
export async function vectorSearch(
  queryEmbedding: number[],
  context: ExtractedContext,
  limit: number = 20
): Promise<ProductNode[]> {
  const startTime = Date.now();
  const session = getSession();

  try {
    const result = await session.run(`
      CALL db.index.vector.queryNodes('product_embeddings', $limit, $queryEmbedding)
      YIELD node as p, score

      WHERE p.price >= $minPrice
        AND p.price <= $maxPrice
        AND p.available = true

      RETURN p.id as id,
             p.title as title,
             p.description as description,
             p.price as price,
             p.currency as currency,
             p.vendor as vendor,
             p.available as available,
             p.imageUrl as imageUrl,
             p.url as url,
             p.embedding as embedding,
             score
      ORDER BY score DESC
      LIMIT $finalLimit
    `, {
      queryEmbedding,
      limit: neo4j.int(limit * 3), // Must be Neo4j integer
      minPrice: context.priceRange.min,
      maxPrice: context.priceRange.max,
      finalLimit: neo4j.int(limit) // Must be Neo4j integer
    });

    const products = result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      description: record.get('description'),
      price: record.get('price'),
      currency: record.get('currency'),
      vendor: record.get('vendor'),
      productType: '',
      available: record.get('available'),
      imageUrl: record.get('imageUrl'),
      url: record.get('url'),
      embedding: record.get('embedding')
    }));

    const executionTime = Date.now() - startTime;

    logVectorSearch({
      queryEmbedding,
      topK: limit,
      resultsCount: products.length,
      executionTimeMs: executionTime
    });

    return products;

  } catch (error) {
    logger.error('Vector search failed', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Generate rationale for why product matches user's needs
 */
export async function generateRationale(
  product: ProductNode,
  context: ExtractedContext,
  query: string
): Promise<string> {
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Why is this product a good gift?

User wants: ${query}
${context.recipient ? `Recipient: ${context.recipient}` : ''}
${context.occasion ? `Occasion: ${context.occasion}` : ''}
${context.interests.length > 0 ? `Interests: ${context.interests.join(', ')}` : ''}
Budget: $${context.priceRange.min}-${context.priceRange.max}

Product:
Title: ${product.title}
Price: $${product.price}
Description: ${product.description.substring(0, 200)}

Write ONE short sentence (max 20 words) explaining why this matches their needs. Be specific.`
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return 'Matches your search criteria';
    }

    const rationale = textContent.text.trim();
    const executionTime = Date.now() - startTime;

    logRationaleGeneration({
      productId: product.id,
      userContext: { query },
      rationale,
      model: 'claude-3-haiku-20240307',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      executionTimeMs: executionTime
    });

    return rationale;

  } catch (error) {
    logger.error('Rationale generation failed', { productId: product.id, error });
    return `${product.title} - $${product.price}`;
  }
}

/**
 * Main recommendation function
 */
export async function recommend(
  query: string,
  topK: number = 5
): Promise<Recommendation[]> {
  const totalStart = Date.now();

  logSearch({ query });

  try {
    // Step 1: Extract context from query
    logger.info('Step 1: Extracting context from query...');
    const context = await extractContext(query);
    logger.info('Context extracted', { context });

    // Step 2: Create enriched query for embedding
    const enrichedQuery = `
      ${query}.
      ${context.recipient ? `Gift for ${context.recipient}.` : ''}
      ${context.occasion ? `Occasion: ${context.occasion}.` : ''}
      ${context.interests.length > 0 ? `Interests: ${context.interests.join(', ')}.` : ''}
      Budget: $${context.priceRange.min}-${context.priceRange.max}
    `.trim();

    logger.info('Step 2: Generating query embedding...');
    const queryEmbedding = await generateEmbedding(enrichedQuery);

    // Step 3: Vector similarity search
    logger.info('Step 3: Searching products by vector similarity...');
    const products = await vectorSearch(queryEmbedding, context, topK * 2);
    logger.info(`Found ${products.length} candidate products`);

    if (products.length === 0) {
      logger.warn('No products found matching criteria');
      return [];
    }

    // Step 4: Generate rationales for top products
    logger.info(`Step 4: Generating rationales for top ${topK} products...`);
    const topProducts = products.slice(0, topK);

    const recommendations: Recommendation[] = await Promise.all(
      topProducts.map(async (product, index) => {
        const rationale = await generateRationale(product, context, query);

        return {
          product,
          score: 1.0 - (index * 0.1), // Simple descending score
          confidence: 0.85, // Fixed confidence for MVP
          rationale,
          scoring: {
            vectorScore: 1.0 - (index * 0.1),
            graphScore: 0, // No graph in pure vector approach
            categoryBoost: 0 // No categories
          }
        };
      })
    );

    const totalTime = Date.now() - totalStart;

    logRecommendations({
      query,
      recommendationsCount: recommendations.length,
      avgScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
      avgConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length,
      totalExecutionTimeMs: totalTime,
      recommendations: recommendations.map(r => ({
        productId: r.product.id,
        title: r.product.title,
        score: r.score,
        confidence: r.confidence
      }))
    });

    logger.info(`✅ Generated ${recommendations.length} recommendations in ${totalTime}ms`);

    return recommendations;

  } catch (error) {
    logger.error('Recommendation failed', { query, error });
    throw error;
  }
}
