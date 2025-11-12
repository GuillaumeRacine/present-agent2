#!/usr/bin/env tsx
/**
 * Test LLM-based Gift Attribute Inference
 *
 * Tests the LLM inference on sample products to verify quality
 * before running the full population.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { inferAttributesFromProduct, inferAttributesFromProductLLM } from '../src/types/gift-attributes.js';
import chalk from 'chalk';

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  interests: string[];
}

async function testLLMAttributes(numSamples: number = 10) {
  console.log(chalk.bold('\n🧪 Testing LLM-based Gift Attribute Inference\n'));

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    // Get diverse sample products
    console.log(`Fetching ${numSamples} sample products...\n`);

    const result = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      WITH p, COLLECT(i.name) AS interests
      RETURN p, interests
      ORDER BY rand()
      LIMIT ${numSamples}
    `);

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

    if (products.length === 0) {
      console.log(chalk.red('No products found!'));
      return;
    }

    let keywordSuccess = 0;
    let llmSuccess = 0;
    let totalKeywordAttrs = 0;
    let totalLLMAttrs = 0;
    const startTime = Date.now();

    // Test each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      console.log(chalk.cyan(`\n${'='.repeat(80)}`));
      console.log(chalk.bold(`Product ${i + 1}/${products.length}: ${product.title.substring(0, 60)}`));
      console.log(chalk.gray(`Description: ${product.description.substring(0, 100)}...`));
      console.log(chalk.gray(`Price: $${product.price || 'N/A'} | Vendor: ${product.vendor || 'N/A'}`));
      console.log(chalk.gray(`Interests: ${product.interests.join(', ') || 'None'}`));

      // Keyword-based
      console.log(chalk.yellow('\n🔤 Keyword-based:'));
      const keywordAttrs = inferAttributesFromProduct(product);
      const keywordAttrNames = Object.entries(keywordAttrs)
        .filter(([_, v]) => v === true)
        .map(([k, _]) => k);

      if (keywordAttrNames.length > 0) {
        keywordSuccess++;
        totalKeywordAttrs += keywordAttrNames.length;
        console.log(chalk.green(`   ✓ ${keywordAttrNames.join(', ')}`));
      } else {
        console.log(chalk.red('   ✗ No attributes detected'));
      }

      // LLM-based
      console.log(chalk.blue('\n🤖 LLM-based:'));
      try {
        const llmAttrs = await inferAttributesFromProductLLM(product);
        const llmAttrNames = Object.entries(llmAttrs)
          .filter(([_, v]) => v === true)
          .map(([k, _]) => k);

        if (llmAttrNames.length > 0) {
          llmSuccess++;
          totalLLMAttrs += llmAttrNames.length;
          console.log(chalk.green(`   ✓ ${llmAttrNames.join(', ')}`));
        } else {
          console.log(chalk.red('   ✗ No attributes detected'));
        }

        // Show differences
        const keywordOnly = keywordAttrNames.filter(a => !llmAttrNames.includes(a));
        const llmOnly = llmAttrNames.filter(a => !keywordAttrNames.includes(a));

        if (keywordOnly.length > 0) {
          console.log(chalk.yellow(`   Keyword-only: ${keywordOnly.join(', ')}`));
        }
        if (llmOnly.length > 0) {
          console.log(chalk.magenta(`   LLM-only: ${llmOnly.join(', ')}`));
        }

      } catch (error: any) {
        console.log(chalk.red(`   ✗ LLM inference failed: ${error.message}`));
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

    // Summary
    console.log(chalk.cyan(`\n${'='.repeat(80)}`));
    console.log(chalk.bold('\n📊 Test Summary:\n'));
    console.log(`Products tested: ${products.length}`);
    console.log(`Time: ${elapsedSec}s\n`);

    console.log(chalk.yellow('Keyword-based:'));
    console.log(`  Coverage: ${keywordSuccess}/${products.length} (${((keywordSuccess / products.length) * 100).toFixed(1)}%)`);
    console.log(`  Avg attributes per product: ${(totalKeywordAttrs / products.length).toFixed(1)}`);

    console.log(chalk.blue('\nLLM-based:'));
    console.log(`  Coverage: ${llmSuccess}/${products.length} (${((llmSuccess / products.length) * 100).toFixed(1)}%)`);
    console.log(`  Avg attributes per product: ${(totalLLMAttrs / products.length).toFixed(1)}`);

    const improvement = ((llmSuccess - keywordSuccess) / products.length) * 100;
    console.log(chalk.green(`\n✨ Coverage improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`));

    // Estimate cost for full dataset
    const avgTokensPerProduct = 500; // Conservative estimate
    const totalProducts = 41704;
    const estimatedTokens = totalProducts * avgTokensPerProduct;
    const estimatedCost = (estimatedTokens * 0.15 / 1000000) + (totalProducts * 100 * 0.60 / 1000000);
    const estimatedTimeMin = Math.ceil(totalProducts * 0.6 / 60); // 0.6s per product

    console.log(chalk.cyan('\n📈 Projected for full dataset (41,704 products):'));
    console.log(`  Estimated time: ${estimatedTimeMin} minutes (~${Math.floor(estimatedTimeMin / 60)}h ${estimatedTimeMin % 60}m)`);
    console.log(`  Estimated cost: $${estimatedCost.toFixed(2)}`);
    console.log(`  Estimated coverage: ~${((llmSuccess / products.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error(chalk.red('Test failed:'), error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

// Parse command line args
const numSamples = parseInt(process.argv[2]) || 10;

testLLMAttributes(numSamples).catch(console.error);
