/**
 * Sample Data Ingestion - Test with 100 products
 *
 * Ultra-simple: Just products with embeddings, NO categories
 * Tests pure vector similarity approach
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';
import { generateEmbeddingsBatch } from '../src/lib/openai.js';
import { logger } from '../src/lib/logger.js';

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
  const SAMPLE_SIZE = 100;
  const startTime = Date.now();

  try {
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    logger.info(`🧪 Testing ingestion with ${SAMPLE_SIZE} products (NO CATEGORIES)...`);

    const session = getSession();

    try {
      // Load sample products
      const allProducts: RawProduct[] = JSON.parse(
        readFileSync('data/export/products.json', 'utf-8')
      );

      const sampleProducts = allProducts.slice(0, SAMPLE_SIZE);

      // ========================================================================
      // STEP 1: Create products (without embeddings initially)
      // ========================================================================
      logger.info('📦 Step 1: Loading products...');

      for (const product of sampleProducts) {
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

      logger.info(`✅ Loaded ${SAMPLE_SIZE} products`);

      // ========================================================================
      // STEP 2: Generate and store embeddings
      // ========================================================================
      logger.info('🤖 Step 2: Generating embeddings...');

      const texts = sampleProducts.map(p =>
        `${p.title}. ${p.description || ''}`.substring(0, 8000)
      );

      const embeddings = await generateEmbeddingsBatch(texts, 50);

      logger.info('💾 Storing embeddings in Neo4j...');

      for (let i = 0; i < sampleProducts.length; i++) {
        await session.run(`
          MATCH (p:Product {id: $id})
          SET p.embedding = $embedding
        `, {
          id: sampleProducts[i].id,
          embedding: embeddings[i]
        });
      }

      logger.info(`✅ Generated and stored ${embeddings.length} embeddings`);

      // ========================================================================
      // STEP 3: Verify
      // ========================================================================
      logger.info('🔍 Verifying ingestion...');

      const stats = await session.run(`
        MATCH (p:Product)
        RETURN
          count(*) as totalProducts,
          count(p.embedding) as withEmbeddings,
          avg(p.price) as avgPrice,
          min(p.price) as minPrice,
          max(p.price) as maxPrice
      `);

      const record = stats.records[0];
      const totalProducts = record.get('totalProducts').toNumber();
      const withEmbeddings = record.get('withEmbeddings').toNumber();
      const avgPrice = record.get('avgPrice');
      const minPrice = record.get('minPrice');
      const maxPrice = record.get('maxPrice');

      const totalTime = Date.now() - startTime;

      console.log('\n✅ Sample Ingestion Complete!');
      console.log('==============================');
      console.log(`Products loaded: ${totalProducts}`);
      console.log(`With embeddings: ${withEmbeddings}`);
      console.log(`Price range: $${minPrice} - $${maxPrice}`);
      console.log(`Average price: $${avgPrice.toFixed(2)}`);
      console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log('==============================\n');

      logger.info('✅ Sample ingestion completed successfully', {
        totalProducts,
        withEmbeddings,
        totalTimeMs: totalTime
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    logger.error('Sample ingestion failed', { error });
    console.error('\n❌ Failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
