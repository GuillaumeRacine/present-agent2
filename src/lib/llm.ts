/**
 * Unified LLM Client
 *
 * Provides a unified interface for both OpenAI and Anthropic Claude
 * with automatic fallback if one provider fails.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';
import { withEmbeddingCache } from './cache.js';

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

// API key health tracking
let openaiKeyValid: boolean | null = null;
let anthropicKeyValid: boolean | null = null;
let lastWarningTime = 0;
const WARNING_COOLDOWN = 60000; // Show warning max once per minute

/**
 * Initialize clients
 */
function initClients() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
}

/**
 * Show user-friendly warning about API key issues (with cooldown)
 */
function showApiKeyWarning(provider: 'OpenAI' | 'Claude', fallback: string) {
  const now = Date.now();
  if (now - lastWarningTime > WARNING_COOLDOWN) {
    logger.warn(`⚠️  API KEY WARNING: ${provider} API key has expired or is invalid!`);
    logger.warn(`   System is running with fallback to ${fallback}, but performance may be affected.`);
    logger.warn(`   Please update your ${provider === 'OpenAI' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} in .env.local`);
    lastWarningTime = now;
  }
}

/**
 * Chat completion with automatic fallback
 */
export async function chatCompletion(params: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  initClients();

  // Try OpenAI first
  if (openaiClient) {
    try {
      logger.debug('Attempting OpenAI chat completion');
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: params.messages,
        temperature: params.temperature || 0.3,
        response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      openaiKeyValid = true;
      logger.debug('OpenAI chat completion successful');
      return content;

    } catch (error: any) {
      openaiKeyValid = false;

      // Check if it's an API key error
      const isKeyError = error?.status === 401 ||
                        error?.code === 'invalid_api_key' ||
                        error?.message?.includes('API key');

      if (isKeyError) {
        showApiKeyWarning('OpenAI', 'Claude');
      } else {
        logger.warn('OpenAI failed, falling back to Claude', { error: error?.message });
      }
    }
  }

  // Fallback to Claude
  if (anthropicClient) {
    try {
      logger.debug('Attempting Claude chat completion');

      // Convert messages to Claude format
      const systemMessage = params.messages.find(m => m.role === 'system')?.content || '';
      const userMessages = params.messages.filter(m => m.role !== 'system');

      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: params.temperature || 0.3,
        system: systemMessage,
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      anthropicKeyValid = true;
      logger.debug('Claude chat completion successful');
      return content.text;

    } catch (error: any) {
      anthropicKeyValid = false;

      // Check if it's an API key error
      const isKeyError = error?.status === 401 ||
                        error?.type === 'authentication_error' ||
                        error?.message?.includes('API key');

      if (isKeyError && openaiKeyValid === false) {
        logger.error('⚠️  BOTH API KEYS INVALID: OpenAI and Claude API keys have expired!');
        logger.error('   Please update both OPENAI_API_KEY and ANTHROPIC_API_KEY in .env.local');
      }

      logger.error('Claude also failed', { error: error?.message });
      throw new Error('Both OpenAI and Claude failed');
    }
  } else {
    // No Claude client available
    if (openaiKeyValid === false) {
      throw new Error('OpenAI failed and Claude is not configured. Set ANTHROPIC_API_KEY in .env.local for fallback support');
    }
  }

  throw new Error('No LLM providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
}

/**
 * Generate embedding - REQUIRES OpenAI API key
 * NO MOCK DATA - will throw error if OpenAI is not available
 * Automatically cached with 24-hour TTL
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  initClients();

  if (!openaiClient) {
    throw new Error('CRITICAL: OpenAI API key required for embeddings. Mock embeddings are disabled to ensure recommendation quality. Set OPENAI_API_KEY environment variable.');
  }

  // Use cache wrapper - automatically handles caching logic
  return withEmbeddingCache(text, async (text: string) => {
    try {
      logger.debug('Generating OpenAI embedding (cache miss)');
      const response = await openaiClient!.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      logger.debug('OpenAI embedding generation successful');
      return response.data[0].embedding;

    } catch (error) {
      logger.error('OpenAI embedding failed - NO FALLBACK TO MOCK DATA', { error });
      throw new Error('Failed to generate real embedding. Mock embeddings disabled for recommendation quality.');
    }
  });
}

// MOCK EMBEDDINGS REMOVED - ONLY REAL OPENAI EMBEDDINGS ALLOWED
// Mock embeddings destroy recommendation quality and are not permitted

/**
 * Generate embeddings in batch - REQUIRES OpenAI API key
 * NO MOCK DATA - will throw error if OpenAI is not available
 * Uses individual caching per text for better cache reuse
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  initClients();

  if (!openaiClient) {
    throw new Error('CRITICAL: OpenAI API key required for embeddings. Mock embeddings are disabled to ensure recommendation quality. Set OPENAI_API_KEY environment variable.');
  }

  // Check cache for each text individually
  // This allows better reuse across different batch operations
  const embeddings: number[][] = [];
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await generateEmbedding(texts[i]);
      embeddings[i] = embedding;
    } catch {
      // If cache miss or error, queue for batch generation
      uncachedTexts.push(texts[i]);
      uncachedIndices.push(i);
    }
  }

  // Generate embeddings for uncached texts in batches
  if (uncachedTexts.length > 0) {
    logger.debug(`Generating ${uncachedTexts.length} embeddings (${texts.length - uncachedTexts.length} from cache)`);

    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchIndices = uncachedIndices.slice(i, i + batchSize);

      try {
        logger.debug(`Generating OpenAI embeddings for batch ${Math.floor(i / batchSize) + 1}`);
        const response = await openaiClient.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
          encoding_format: 'float'
        });

        const batchEmbeddings = response.data.map(d => d.embedding);

        // Store in result array and cache
        for (let j = 0; j < batchEmbeddings.length; j++) {
          embeddings[batchIndices[j]] = batchEmbeddings[j];
          // Cache each embedding individually
          await withEmbeddingCache(batch[j], async () => batchEmbeddings[j]);
        }

      } catch (error) {
        logger.error(`OpenAI batch embedding failed - NO FALLBACK TO MOCK DATA`, { error });
        throw new Error('Failed to generate real embeddings. Mock embeddings disabled for recommendation quality.');
      }
    }
  } else {
    logger.debug(`All ${texts.length} embeddings retrieved from cache`);
  }

  return embeddings;
}

/**
 * Get API key health status
 */
export function getApiKeyStatus(): {
  openai: boolean | null;
  anthropic: boolean | null;
  hasValidKey: boolean;
} {
  return {
    openai: openaiKeyValid,
    anthropic: anthropicKeyValid,
    hasValidKey: openaiKeyValid === true || anthropicKeyValid === true
  };
}

/**
 * Get OpenAI client (for compatibility)
 * Creates a proxy that uses the unified interface
 */
export function createOpenAIClient(): any {
  return {
    chat: {
      completions: {
        create: async (params: any) => {
          const content = await chatCompletion({
            messages: params.messages,
            temperature: params.temperature,
            jsonMode: params.response_format?.type === 'json_object'
          });

          return {
            choices: [{
              message: {
                content
              }
            }]
          };
        }
      }
    },
    embeddings: {
      create: async (params: any) => {
        const texts = Array.isArray(params.input) ? params.input : [params.input];
        const embeddings = await Promise.all(texts.map(t => generateEmbedding(t)));

        return {
          data: embeddings.map(embedding => ({ embedding }))
        };
      }
    }
  };
}

export default createOpenAIClient;
