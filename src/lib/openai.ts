/**
 * OpenAI Client - Embeddings Generation
 */

import OpenAI from 'openai';
import { logger } from './logger.js';

let openai: OpenAI;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

/**
 * Generate embedding for text using text-embedding-3-small
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAI();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;

  } catch (error) {
    logger.error('Failed to generate embedding', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const client = getOpenAI();
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float'
      });

      const batchEmbeddings = response.data.map(d => d.embedding);
      embeddings.push(...batchEmbeddings);

      logger.debug('Generated embeddings batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalProcessed: embeddings.length
      });

    } catch (error) {
      logger.error('Batch embedding generation failed', {
        batchNumber: Math.floor(i / batchSize) + 1,
        error
      });
      throw error;
    }
  }

  return embeddings;
}

export default getOpenAI;
