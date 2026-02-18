/**
 * Full Data Ingestion Pipeline
 *
 * Ultra-simple: Just products with embeddings, NO categories
 * Pure vector similarity approach
 *
 * Loads all 41,686 products:
 * 1. Load products (batched)
 * 2. Generate and store embeddings (batched)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';
import { generateEmbeddingsBatch } from '../src/lib/openai.js';
import { logger, logIngestionProgress } from '../src/lib/logger.js';

interface RawProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  available: boolean;
  image_url?: string;
  product_url?: string;
  source_website?: string;
}

async function main() {
  const startTime = Date.now();

  try {
    // Initialize Neo4j
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    logger.info('🚀 Starting full data ingestion pipeline (NO CATEGORIES)...');

    // ========================================================================
    // STEP 1: Load Products (Batched)
    // ========================================================================
    logger.info('📦 Step 1: Loading products...');

    const rawProducts: RawProduct[] = JSON.parse(
      readFileSync('data/export/products.json', 'utf-8')
    );

    logger.info(`Found ${rawProducts.length} products to ingest`);

    const BATCH_SIZE = 500;
    const totalProducts = rawProducts.length;
    let processedProducts = 0;

    for (let i = 0; i < rawProducts.length; i += BATCH_SIZE) {
      const batch = rawProducts.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();

      const session = getSession();
      try {
        // Create products WITHOUT embeddings (will add later)
        for (const product of batch) {
          await session.run(`
            MERGE (p:Product {id: $id})
            SET p.title = $title,
                p.description = $description,
                p.price = toFloat($price),
                p.currency = $currency,
                p.vendor = $vendor,
                p.available = $available,
                p.imageUrl = $imageUrl,
                p.url = $url
          `, {
            id: product.id,
            title: product.title,
            description: product.description || '',
            price: product.price,
            currency: product.currency,
            vendor: product.source_website || 'unknown',
            available: product.available,
            imageUrl: product.image_url || null,
            url: product.product_url || null
          });
        }

        processedProducts += batch.length;
        const batchTime = Date.now() - batchStart;

        logIngestionProgress({
          stage: 'products',
          processed: processedProducts,
          total: totalProducts,
          batchNumber: Math.floor(i / BATCH_SIZE) + 1,
          executionTimeMs: batchTime
        });

        logger.info(`Product batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products in ${batchTime}ms`);

      } finally {
        await session.close();
      }
    }

    logger.info(`✅ Loaded ${processedProducts} products`);

    // ========================================================================
    // STEP 2: Generate and Store Embeddings (Batched)
    // ========================================================================
    logger.info('📦 Step 2: Generating embeddings for all products...');
    logger.warn('⚠️  This will take ~20-30 minutes and use OpenAI API credits (~$5-10)');

    // Get all products that need embeddings
    const session = getSession();
    try {
      const productsResult = await session.run(`
        MATCH (p:Product)
        WHERE p.embedding IS NULL
        RETURN p.id as id, p.title as title, p.description as description
        ORDER BY p.id
      `);

      const productsToEmbed = productsResult.records.map(r => ({
        id: r.get('id'),
        title: r.get('title'),
        description: r.get('description') || ''
      }));

      if (productsToEmbed.length === 0) {
        logger.info('✅ All products already have embeddings');
      } else {
        logger.info(`Generating embeddings for ${productsToEmbed.length} products...`);

        const EMBED_BATCH_SIZE = 100;
        let processedEmbeddings = 0;

        for (let i = 0; i < productsToEmbed.length; i += EMBED_BATCH_SIZE) {
          const batch = productsToEmbed.slice(i, i + EMBED_BATCH_SIZE);
          const embedStart = Date.now();

          // Generate embeddings for this batch
          const texts = batch.map(p =>
            `${p.title}. ${p.description}`.substring(0, 8000) // Limit to ~8k chars
          );

          logger.info(`Generating embeddings for batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}/${Math.ceil(productsToEmbed.length / EMBED_BATCH_SIZE)}...`);
          const embeddings = await generateEmbeddingsBatch(texts, EMBED_BATCH_SIZE);

          // Store embeddings in Neo4j
          for (let j = 0; j < batch.length; j++) {
            await session.run(`
              MATCH (p:Product {id: $id})
              SET p.embedding = $embedding
            `, {
              id: batch[j].id,
              embedding: embeddings[j]
            });
          }

          processedEmbeddings += batch.length;
          const embedTime = Date.now() - embedStart;

          logIngestionProgress({
            stage: 'embeddings',
            processed: processedEmbeddings,
            total: productsToEmbed.length,
            batchNumber: Math.floor(i / EMBED_BATCH_SIZE) + 1,
            executionTimeMs: embedTime
          });

          logger.info(`Embedding batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}: ${batch.length} products in ${embedTime}ms`);
        }

        logger.info(`✅ Generated and stored ${processedEmbeddings} embeddings`);
      }

    } finally {
      await session.close();
    }

    // ========================================================================
    // Summary
    // ========================================================================
    const totalTime = Date.now() - startTime;

    console.log('\n✅ Full Data Ingestion Complete!');
    console.log('==================================');
    console.log(`Products: ${processedProducts}`);
    console.log(`Total Time: ${(totalTime / 1000 / 60).toFixed(2)} minutes`);
    console.log('==================================\n');

    logger.info('Data ingestion completed successfully ✅', {
      products: processedProducts,
      totalTimeMs: totalTime
    });

  } catch (error) {
    logger.error('Data ingestion failed', { error });
    console.error('\n❌ Data ingestion failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
