/**
 * Unified LLM Client
 *
 * Provides a unified interface for both OpenAI and Anthropic Claude
 * with automatic fallback if one provider fails.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

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

      logger.debug('OpenAI chat completion successful');
      return content;

    } catch (error) {
      logger.warn('OpenAI failed, falling back to Claude', { error });
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

      logger.debug('Claude chat completion successful');
      return content.text;

    } catch (error) {
      logger.error('Claude also failed', { error });
      throw new Error('Both OpenAI and Claude failed');
    }
  }

  throw new Error('No LLM providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
}

/**
 * Generate embedding - REQUIRES OpenAI API key
 * NO MOCK DATA - will throw error if OpenAI is not available
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  initClients();

  if (!openaiClient) {
    throw new Error('CRITICAL: OpenAI API key required for embeddings. Mock embeddings are disabled to ensure recommendation quality. Set OPENAI_API_KEY environment variable.');
  }

  try {
    logger.debug('Generating OpenAI embedding');
    const response = await openaiClient.embeddings.create({
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
}

// MOCK EMBEDDINGS REMOVED - ONLY REAL OPENAI EMBEDDINGS ALLOWED
// Mock embeddings destroy recommendation quality and are not permitted

/**
 * Generate embeddings in batch - REQUIRES OpenAI API key
 * NO MOCK DATA - will throw error if OpenAI is not available
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  initClients();

  if (!openaiClient) {
    throw new Error('CRITICAL: OpenAI API key required for embeddings. Mock embeddings are disabled to ensure recommendation quality. Set OPENAI_API_KEY environment variable.');
  }

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      logger.debug(`Generating OpenAI embeddings for batch ${Math.floor(i / batchSize) + 1}`);
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float'
      });

      const batchEmbeddings = response.data.map(d => d.embedding);
      embeddings.push(...batchEmbeddings);

    } catch (error) {
      logger.error(`OpenAI batch embedding failed - NO FALLBACK TO MOCK DATA`, { error });
      throw new Error('Failed to generate real embeddings. Mock embeddings disabled for recommendation quality.');
    }
  }

  return embeddings;
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
