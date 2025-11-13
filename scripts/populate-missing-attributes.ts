#!/usr/bin/env tsx
/**
 * Populate Missing Gift Attributes
 *
 * Only processes products that have NO attributes set.
 * Uses LLM-based inference with OpenAI + Claude fallback.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { inferAttributesFromProductLLM } from '../src/types/gift-attributes.js';
import ora from 'ora';

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  interests: string[];
}

const CONCURRENCY = 10; // Process 10 products at a time

async function populateMissingAttributes() {
  const spinner = ora('Initializing...').start();

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Get products WITHOUT any attributes
    spinner.text = 'Fetching products without attributes...';
    const query = `
      MATCH (p:Product)
      WHERE (p.is_experiential IS NULL OR p.is_experiential = false)
        AND (p.is_memory_making IS NULL OR p.is_memory_making = false)
        AND (p.is_sentimental IS NULL OR p.is_sentimental = false)
        AND (p.is_personalized IS NULL OR p.is_personalized = false)
        AND (p.is_practical IS NULL OR p.is_practical = false)
        AND (p.is_luxury IS NULL OR p.is_luxury = false)
        AND (p.is_aspirational IS NULL OR p.is_aspirational = false)
        AND (p.is_educational IS NULL OR p.is_educational = false)
        AND (p.is_shared IS NULL OR p.is_shared = false)
        AND (p.is_conversation_starter IS NULL OR p.is_conversation_starter = false)
        AND (p.is_lasting_value IS NULL OR p.is_lasting_value = false)
        AND (p.is_consumable IS NULL OR p.is_consumable = false)
        AND (p.is_artistic IS NULL OR p.is_artistic = false)
        AND (p.is_minimalist IS NULL OR p.is_minimalist = false)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      WITH p, COLLECT(i.name) AS interests
      RETURN p, interests
    `;

    const result = await session.run(query);
    const products = result.records.map(r => {
      const props = r.get('p').properties;
      return {
        id: props.id,
        title: props.title,
        description: props.description || '',
        price: props.price,
        vendor: props.vendor,
        interests: r.get('interests') || [],
      } as Product;
    });

    spinner.succeed(`Found ${products.length.toLocaleString()} products without attributes`);

    if (products.length === 0) {
      console.log('\n✅ All products already have attributes!');
      return;
    }

    console.log(`\n🔄 Processing ${products.length.toLocaleString()} missing products`);
    console.log(`Mode: 🤖 LLM-based inference (OpenAI + Claude fallback)\n`);

    let processed = 0;
    let withAttributes = 0;
    let failed = 0;

    const processProduct = async (product: Product) => {
      try {
        // Infer attributes using LLM
        const attributes = await inferAttributesFromProductLLM(product);

        let hasAttributes = false;
        if (Object.keys(attributes).length > 0) {
          hasAttributes = true;

          // Update product in Neo4j
          const updateSession = driver.session();
          try {
            await updateSession.run(`
              MATCH (p:Product {id: $productId})
              SET p.is_experiential = $isExperiential,
                  p.is_memory_making = $isMemoryMaking,
                  p.is_sentimental = $isSentimental,
                  p.is_personalized = $isPersonalized,
                  p.is_practical = $isPractical,
                  p.is_luxury = $isLuxury,
                  p.is_aspirational = $isAspirational,
                  p.is_educational = $isEducational,
                  p.is_shared = $isShared,
                  p.is_conversation_starter = $isConversationStarter,
                  p.is_lasting_value = $isLastingValue,
                  p.is_consumable = $isConsumable,
                  p.is_artistic = $isArtistic,
                  p.is_minimalist = $isMinimalist,
                  p.attributes_updated_at = datetime()
            `, {
              productId: product.id,
              isExperiential: attributes.isExperiential || false,
              isMemoryMaking: attributes.isMemoryMaking || false,
              isSentimental: attributes.isSentimental || false,
              isPersonalized: attributes.isPersonalized || false,
              isPractical: attributes.isPractical || false,
              isLuxury: attributes.isLuxury || false,
              isAspirational: attributes.isAspirational || false,
              isEducational: attributes.isEducational || false,
              isShared: attributes.isShared || false,
              isConversationStarter: attributes.isConversationStarter || false,
              isLastingValue: attributes.isLastingValue || false,
              isConsumable: attributes.isConsumable || false,
              isArtistic: attributes.isArtistic || false,
              isMinimalist: attributes.isMinimalist || false,
            });
          } finally {
            await updateSession.close();
          }
        }

        return { success: true, productId: product.id, hasAttributes };
      } catch (error) {
        return { success: false, productId: product.id, error, hasAttributes: false };
      }
    };

    // Process in concurrent batches
    const startTime = Date.now();
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const batch = products.slice(i, i + CONCURRENCY);
      spinner.start(`LLM inference: ${processed}/${products.length}`);

      const results = await Promise.all(batch.map(processProduct));

      for (const result of results) {
        if (result.success) {
          processed++;
          if (result.hasAttributes) withAttributes++;
        } else {
          failed++;
        }
      }

      spinner.succeed(`Processed ${processed}/${products.length} products`);
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

    console.log('\n📊 Summary:\n');
    console.log(`Total products processed: ${processed.toLocaleString()}`);
    console.log(`Products with attributes: ${withAttributes.toLocaleString()} (${((withAttributes / processed) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Time: ${elapsedMin}m ${elapsedSec}s`);

    // Estimate cost (GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens)
    // Assuming ~500 input tokens + 100 output tokens per product
    const estimatedCost = (processed * 500 * 0.15 / 1000000) + (processed * 100 * 0.60 / 1000000);
    console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(2)}`);

  } catch (error) {
    spinner.fail('Process failed');
    console.error(error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🔧 Populate Missing Gift Attributes                    ║
╚════════════════════════════════════════════════════════════════╝

This script will process ONLY products that have NO attributes set.
Uses: OpenAI GPT-4o-mini with Claude fallback
`);

populateMissingAttributes().catch(console.error);
