#!/usr/bin/env tsx
/**
 * Category Ingestion Script - Phase 2.1
 *
 * Creates Category nodes and links existing products to categories based on
 * inference rules from interest-synonyms.ts library.
 *
 * What this script does:
 * 1. Creates Category nodes for all defined categories (50+)
 * 2. Queries all existing products from Neo4j
 * 3. Infers categories for each product using pattern matching
 * 4. Creates BELONGS_TO relationships between products and categories
 * 5. Reports coverage statistics
 *
 * Usage:
 *   npx tsx scripts/add-categories.ts [options]
 *
 * Options:
 *   --dry-run             Preview categories without writing to Neo4j
 *   --batch-size <n>      Products per batch (default: 500)
 *   --limit <n>           Only process first N products (testing)
 *   --verbose             Show detailed logging
 *
 * Expected Output:
 *   - Category nodes created: 50+
 *   - Products categorized: ~27,000
 *   - Average categories per product: 1-3
 *   - Coverage report by category
 */

import * as dotenv from 'dotenv';
import { initNeo4j, getSession } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import { inferCategories, getAllCategories, getCategoryStats } from '../src/lib/interest-synonyms.js';
import ora from 'ora';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const CONFIG = {
  batchSize: 500,
  dryRun: false,
  limit: null as number | null,
  verbose: false,
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        CONFIG.dryRun = true;
        break;
      case '--batch-size':
        CONFIG.batchSize = parseInt(args[++i]);
        break;
      case '--limit':
        CONFIG.limit = parseInt(args[++i]);
        break;
      case '--verbose':
        CONFIG.verbose = true;
        break;
      case '--help':
        console.log(`
Category Ingestion Script - Phase 2.1

Usage: npx tsx scripts/add-categories.ts [options]

Options:
  --dry-run             Preview categories without writing to Neo4j
  --batch-size <n>      Products per batch (default: 500)
  --limit <n>           Only process first N products (testing)
  --verbose             Show detailed logging
  --help                Show this help message
        `);
        process.exit(0);
    }
  }
}

/**
 * Step 1: Create Category nodes
 */
async function createCategoryNodes(): Promise<number> {
  const session = getSession();
  const categories = getAllCategories();

  try {
    if (CONFIG.dryRun) {
      console.log(chalk.cyan(`[DRY RUN] Would create ${categories.length} category nodes`));
      return categories.length;
    }

    const spinner = ora(`Creating ${categories.length} category nodes...`).start();

    // Create all category nodes in a single transaction
    await session.run(
      `
      UNWIND $categories AS categoryName
      MERGE (c:Category {name: categoryName})
      ON CREATE SET c.created_at = datetime()
      RETURN count(c) AS created
      `,
      { categories }
    );

    spinner.succeed(chalk.green(`Created/merged ${categories.length} category nodes`));
    return categories.length;
  } catch (error) {
    logger.error('Failed to create category nodes', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Step 2: Get total product count
 */
async function getProductCount(): Promise<number> {
  const session = getSession();

  try {
    const result = await session.run('MATCH (p:Product) RETURN count(p) AS count');
    return result.records[0].get('count').toNumber();
  } finally {
    await session.close();
  }
}

/**
 * Step 3: Process products in batches and link to categories
 */
async function linkProductsToCategories(): Promise<{
  processed: number;
  categorized: number;
  totalLinks: number;
  categoryStats: Map<string, number>;
}> {
  const session = getSession();
  let processed = 0;
  let categorized = 0;
  let totalLinks = 0;
  const categoryStats = new Map<string, number>();

  try {
    // Get total count
    const totalProducts = await getProductCount();
    const limit = CONFIG.limit || totalProducts;
    const effectiveTotal = Math.min(limit, totalProducts);

    console.log(chalk.cyan(`Processing ${effectiveTotal.toLocaleString()} products...`));

    const spinner = ora('Fetching products...').start();

    // Fetch products in batches
    let skip = 0;
    while (skip < effectiveTotal) {
      const batchSize = Math.min(CONFIG.batchSize, effectiveTotal - skip);

      spinner.text = `Processing products ${skip + 1}-${skip + batchSize} of ${effectiveTotal.toLocaleString()}`;

      // Fetch batch of products
      const result = await session.run(
        `
        MATCH (p:Product)
        RETURN p.id AS id, p.title AS title, p.description AS description
        ORDER BY p.id
        SKIP $skip
        LIMIT $limit
        `,
        { skip, limit: batchSize }
      );

      if (result.records.length === 0) {
        break;
      }

      // Process each product
      const batch = result.records.map((record) => ({
        id: record.get('id'),
        title: record.get('title') || '',
        description: record.get('description'),
      }));

      // Infer categories for each product
      const productCategories = new Map<string, string[]>();
      for (const product of batch) {
        const categories = inferCategories(product.title, product.description);
        if (categories.length > 0) {
          productCategories.set(product.id, categories);
          categorized++;
          totalLinks += categories.length;

          // Update stats
          for (const category of categories) {
            categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
          }
        }
      }

      // Create relationships in batch
      if (productCategories.size > 0 && !CONFIG.dryRun) {
        const linkData = Array.from(productCategories.entries()).map(([productId, categories]) => ({
          productId,
          categories,
        }));

        await session.run(
          `
          UNWIND $links AS link
          MATCH (p:Product {id: link.productId})
          UNWIND link.categories AS categoryName
          MATCH (c:Category {name: categoryName})
          MERGE (p)-[r:BELONGS_TO]->(c)
          ON CREATE SET r.created_at = datetime()
          `,
          { links: linkData }
        );
      }

      processed += batch.length;
      skip += batchSize;

      // Log verbose details
      if (CONFIG.verbose && productCategories.size > 0) {
        const sample = Array.from(productCategories.entries()).slice(0, 3);
        for (const [id, categories] of sample) {
          const product = batch.find((p) => p.id === id);
          console.log(
            chalk.gray(`  ${product?.title.slice(0, 50)}... → [${categories.join(', ')}]`)
          );
        }
      }
    }

    spinner.succeed(
      chalk.green(
        `Processed ${processed.toLocaleString()} products, ` +
        `categorized ${categorized.toLocaleString()} (${((categorized / processed) * 100).toFixed(1)}%)`
      )
    );

    return { processed, categorized, totalLinks, categoryStats };
  } catch (error) {
    logger.error('Failed to link products to categories', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Step 4: Report coverage statistics
 */
function reportStatistics(stats: {
  processed: number;
  categorized: number;
  totalLinks: number;
  categoryStats: Map<string, number>;
}) {
  console.log(chalk.bold('\n📊 Category Coverage Report'));
  console.log(chalk.cyan('─'.repeat(80)));

  // Overall stats
  console.log(chalk.bold('\nOverall Statistics:'));
  console.log(`  Products processed:    ${stats.processed.toLocaleString()}`);
  console.log(`  Products categorized:  ${stats.categorized.toLocaleString()} (${((stats.categorized / stats.processed) * 100).toFixed(1)}%)`);
  console.log(`  Total category links:  ${stats.totalLinks.toLocaleString()}`);
  console.log(`  Avg categories/product: ${(stats.totalLinks / stats.categorized).toFixed(2)}`);
  console.log(`  Unique categories used: ${stats.categoryStats.size}`);

  // Top 20 categories by product count
  console.log(chalk.bold('\nTop 20 Categories by Product Count:'));
  const sorted = Array.from(stats.categoryStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [category, count] of sorted) {
    const percentage = ((count / stats.categorized) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(Number(percentage) / 2));
    console.log(`  ${category.padEnd(30)} ${count.toString().padStart(6)} (${percentage.padStart(5)}%) ${chalk.blue(bar)}`);
  }

  // Categories with no products
  const allCategories = getAllCategories();
  const unused = allCategories.filter((cat) => !stats.categoryStats.has(cat));
  if (unused.length > 0) {
    console.log(chalk.bold(`\n⚠️  Categories with no products (${unused.length}):`));
    console.log(chalk.gray(`  ${unused.join(', ')}`));
  }

  console.log(chalk.cyan('\n' + '─'.repeat(80)));
}

/**
 * Main execution
 */
async function main() {
  parseArgs();

  console.log(chalk.bold.cyan('\n🏷️  Category Ingestion - Phase 2.1\n'));

  if (CONFIG.dryRun) {
    console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made to Neo4j\n'));
  }

  try {
    // Initialize Neo4j
    await initNeo4j({
      uri: process.env.NEO4J_URL || '',
      username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    // Step 1: Create category nodes
    console.log(chalk.bold('\nStep 1: Creating Category Nodes'));
    const categoriesCreated = await createCategoryNodes();

    // Step 2: Link products to categories
    console.log(chalk.bold('\nStep 2: Linking Products to Categories'));
    const stats = await linkProductsToCategories();

    // Step 3: Report statistics
    reportStatistics(stats);

    // Success message
    console.log(chalk.bold.green('\n✅ Category ingestion complete!\n'));

    if (CONFIG.dryRun) {
      console.log(chalk.yellow('This was a dry run. Run without --dry-run to apply changes.\n'));
    }

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Category ingestion failed:'), error);
    process.exit(1);
  }
}

// Run the script
main();
