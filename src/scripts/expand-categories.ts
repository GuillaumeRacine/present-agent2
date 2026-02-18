#!/usr/bin/env tsx
/**
 * Category Expansion Script
 *
 * Purpose: Re-categorize all 64,964 products using pattern-based inference
 * from interest-synonyms.ts instead of relying on sparse Shopify metadata.
 *
 * Current state: Only 291 IN_CATEGORY relationships exist, 279 are "Miscellaneous"
 * Expected: 30,000+ products with meaningful category relationships
 *
 * Usage:
 *   tsx scripts/expand-categories.ts                    # Dry run
 *   tsx scripts/expand-categories.ts --live             # Apply changes
 *   tsx scripts/expand-categories.ts --live --verbose   # Apply with detailed logs
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import { inferCategories, CATEGORIES } from '../src/lib/interest-synonyms.js';
import ora, { type Ora } from 'ora';

const BATCH_SIZE = 500;

async function expandCategoriesMain(dryRun: boolean, verbose: boolean) {
  const spinner = ora();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            Category Expansion                                  ║
║                                                                ║
║  Re-categorize products using pattern-based inference          ║
║  from ${CATEGORIES.length} categories with regex rules                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}
${dryRun ? '\nUse --live flag to apply changes' : ''}
`);

  // Initialize Neo4j
  spinner.start('Connecting to Neo4j...');
  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  spinner.succeed('Connected to Neo4j');

  const driver = getDriver();

  try {
    // Step 1: Analyze current categories
    spinner.start('Analyzing current category state...');
    const session1 = driver.session();
    const currentResult = await session1.run(`
      MATCH (c:Category)<-[:IN_CATEGORY]-(p:Product)
      RETURN c.name AS category, count(p) AS productCount
      ORDER BY productCount DESC
    `);
    console.log('\n📈 Current Categories:');
    for (const r of currentResult.records) {
      console.log(`   ${r.get('category')}: ${r.get('productCount')} products`);
    }
    await session1.close();
    spinner.succeed('Current state analyzed');

    // Step 2: Get all products
    spinner.start('Loading products...');
    const session2 = driver.session();
    const productsResult = await session2.run(`
      MATCH (p:Product)
      RETURN p.product_url AS id, p.title AS title, p.description AS description
    `);
    await session2.close();

    const products = productsResult.records.map(r => ({
      id: r.get('id') as string,
      title: r.get('title') as string,
      description: r.get('description') as string | null,
    }));
    spinner.succeed(`Loaded ${products.length} products`);

    // Step 3: Infer categories for each product
    spinner.start('Inferring categories...');
    const categoryCounts: Record<string, number> = {};
    let productsWithCategories = 0;
    let totalRelationships = 0;

    // Collect batch of category links
    const categoryLinks: Array<{ productId: string; category: string }> = [];

    for (const product of products) {
      const categories = inferCategories(product.title, product.description);
      if (categories.length > 0) {
        productsWithCategories++;
        for (const cat of categories) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          categoryLinks.push({ productId: product.id, category: cat });
          totalRelationships++;
        }
      }
    }
    spinner.succeed(`Inferred ${totalRelationships} category relationships for ${productsWithCategories} products`);

    // Show top categories
    const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    console.log('\n📊 Category Distribution (top 20):');
    sortedCats.slice(0, 20).forEach(([cat, count], i) => {
      console.log(`   ${i + 1}. ${cat}: ${count} products`);
    });

    const uncategorized = products.length - productsWithCategories;
    console.log(`\n   Categorized: ${productsWithCategories} (${((productsWithCategories / products.length) * 100).toFixed(1)}%)`);
    console.log(`   Uncategorized: ${uncategorized} (${((uncategorized / products.length) * 100).toFixed(1)}%)`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
      return;
    }

    // Step 4: Create Category nodes and relationships
    spinner.start('Creating Category nodes...');
    const session3 = driver.session();

    // First, create all category nodes
    const uniqueCategories = Object.keys(categoryCounts);
    await session3.run(
      `UNWIND $categories AS catName MERGE (c:Category {name: catName})`,
      { categories: uniqueCategories }
    );
    spinner.succeed(`Created/updated ${uniqueCategories.length} Category nodes`);

    // Remove old Miscellaneous relationships
    spinner.start('Removing stale Miscellaneous category links...');
    await session3.run(`
      MATCH (p:Product)-[r:IN_CATEGORY]->(c:Category {name: 'Miscellaneous'})
      DELETE r
    `);
    spinner.succeed('Removed stale Miscellaneous links');

    // Create relationships in batches
    spinner.start(`Creating ${categoryLinks.length} category relationships...`);
    let processed = 0;

    for (let i = 0; i < categoryLinks.length; i += BATCH_SIZE) {
      const batch = categoryLinks.slice(i, i + BATCH_SIZE);
      await session3.run(
        `
        UNWIND $links AS link
        MATCH (p:Product {product_url: link.productId})
        MERGE (c:Category {name: link.category})
        MERGE (p)-[:IN_CATEGORY]->(c)
        `,
        { links: batch }
      );
      processed += batch.length;
      spinner.text = `Creating category relationships... ${processed}/${categoryLinks.length}`;
    }

    await session3.close();
    spinner.succeed(`Created ${categoryLinks.length} category relationships`);

    // Final stats
    const session4 = driver.session();
    const finalResult = await session4.run(`
      MATCH (c:Category)<-[:IN_CATEGORY]-(p:Product)
      RETURN c.name AS category, count(p) AS productCount
      ORDER BY productCount DESC
      LIMIT 20
    `);
    await session4.close();

    console.log('\n📊 Final Category Distribution (top 20):');
    for (const r of finalResult.records) {
      console.log(`   ${r.get('category')}: ${r.get('productCount')} products`);
    }

    console.log('\n✅ Category expansion complete!\n');
  } catch (error) {
    spinner.fail('Category expansion failed');
    logger.error('Category expansion failed', { error });
    throw error;
  } finally {
    await closeNeo4j();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');
const verbose = args.includes('--verbose');

expandCategoriesMain(dryRun, verbose).catch(console.error);
