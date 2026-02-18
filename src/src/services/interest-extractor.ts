/**
 * Interest Extraction System
 *
 * Uses LLM to extract specific, granular interests from product data
 * Replaces the limited 16-interest taxonomy with a dynamic, comprehensive system
 */

import OpenAI from 'openai';
import { logger } from '../lib/logger.js';

export interface ExtractedInterest {
  name: string;
  relevanceScore: number; // 0.0-1.0
  confidence: number; // 0.0-1.0
  category?: string; // e.g., 'beverages', 'hobbies', 'sports'
  reasoning?: string;
}

export interface InterestExtractionResult {
  productId: string;
  interests: ExtractedInterest[];
  extractedAt: Date;
  processingTimeMs: number;
}

export class InterestExtractor {
  private openai: OpenAI;
  private cache: Map<string, InterestExtractionResult> = new Map();

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  /**
   * Extract interests from product title and description using LLM
   */
  async extractInterests(
    productId: string,
    title: string,
    description: string,
    options: { useCache?: boolean } = {}
  ): Promise<InterestExtractionResult> {
    const startTime = Date.now();

    // Check cache
    if (options.useCache && this.cache.has(productId)) {
      const cached = this.cache.get(productId)!;
      logger.debug(`Using cached interests for product ${productId}`);
      return cached;
    }

    try {
      const systemPrompt = `You are an expert at analyzing products and identifying what interests, hobbies, and passions they appeal to.

Given a product title and description, extract ALL relevant interests that this product would appeal to.

IMPORTANT RULES:
1. Be SPECIFIC: Instead of "beverages", use "wine", "beer", "coffee", "tea"
2. Be COMPREHENSIVE: Extract 3-10 interests per product (not just 1-2)
3. Use LOWERCASE, SINGULAR nouns: "wine" not "Wine" or "wines"
4. Include RELATED interests: wine product → ["wine", "sommelier", "entertaining", "Italy"]
5. Assign RELEVANCE scores (0.0-1.0): How well does this product match this interest?
6. Assign CONFIDENCE scores (0.0-1.0): How certain are you about this interest?
7. AVOID generic terms: Don't use "gifts", "shopping", "products"
8. THINK BROADLY: Consider who would buy this, why they'd want it, what lifestyle it fits

EXAMPLES:
- "Wine Tumbler" → ["wine", "beverages", "entertaining", "outdoor-dining", "travel"]
- "Italian Cookbook" → ["cooking", "Italy", "food", "Mediterranean", "recipes"]
- "Yoga Mat" → ["yoga", "fitness", "mindfulness", "exercise", "wellness"]
- "Gaming Headset" → ["gaming", "tech", "esports", "streaming", "audio"]

Return JSON in this format:
{
  "interests": [
    {
      "name": "wine",
      "relevanceScore": 0.95,
      "confidence": 0.9,
      "category": "beverages",
      "reasoning": "Primary product purpose"
    },
    {
      "name": "entertaining",
      "relevanceScore": 0.7,
      "confidence": 0.8,
      "category": "lifestyle",
      "reasoning": "Common use case for wine accessories"
    }
  ]
}`;

      const userPrompt = `Product Title: ${title}

Product Description: ${description.substring(0, 500)}`;

      logger.debug(`Extracting interests for product: ${title}`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster and cheaper for extraction
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistency
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const parsed = JSON.parse(content);
      const interests: ExtractedInterest[] = parsed.interests || [];

      // Validate and normalize interests
      const normalizedInterests = interests
        .filter(i => i.name && i.relevanceScore > 0.3) // Filter low-relevance
        .map(i => ({
          name: i.name.toLowerCase().trim(),
          relevanceScore: Math.min(1.0, Math.max(0.0, i.relevanceScore)),
          confidence: Math.min(1.0, Math.max(0.0, i.confidence)),
          category: i.category?.toLowerCase(),
          reasoning: i.reasoning,
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by relevance
        .slice(0, 10); // Max 10 interests per product

      const result: InterestExtractionResult = {
        productId,
        interests: normalizedInterests,
        extractedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      };

      // Cache result
      this.cache.set(productId, result);

      logger.debug(`Extracted ${normalizedInterests.length} interests for ${title}`);

      return result;
    } catch (error) {
      logger.error('Interest extraction failed', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty result on failure
      return {
        productId,
        interests: [],
        extractedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch extract interests for multiple products
   */
  async extractBatch(
    products: Array<{ id: string; title: string; description: string }>,
    options: {
      concurrency?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<InterestExtractionResult[]> {
    const { concurrency = 5, onProgress } = options;
    const results: InterestExtractionResult[] = [];
    const total = products.length;

    // Process in batches with concurrency limit
    for (let i = 0; i < products.length; i += concurrency) {
      const batch = products.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(p => this.extractInterests(p.id, p.title, p.description, { useCache: true }))
      );
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + concurrency, total), total);
      }

      // Rate limiting: 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
