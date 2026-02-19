#!/usr/bin/env tsx
/**
 * Interest Expansion Script (Phase 2.2)
 *
 * Purpose: Expand the interest graph from 18 coarse interests to 150+ granular terms
 *
 * This script:
 * 1. Creates all Interest nodes from the INTEREST_TAXONOMY
 * 2. Re-tags products with expanded interests based on title/description analysis
 * 3. Fixes hiking/yoga mapping bugs (likely regex issues)
 * 4. Targets +1 to +2 additional interests per product on average
 *
 * Expected outcomes:
 * - Interest nodes: 18 → 150+
 * - Products tagged with hiking: 1 → 50+
 * - Products tagged with yoga: 1 → 30+
 * - Average interests per product: increase from current baseline
 * - Better long-tail coverage: jewelry, books, toys, pets, DIY/crafts
 *
 * Usage:
 *   tsx scripts/expand-interests.ts                    # Dry run
 *   tsx scripts/expand-interests.ts --live             # Apply changes
 *   tsx scripts/expand-interests.ts --live --verbose   # Apply with detailed logs
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import {
  INTEREST_TAXONOMY,
  normalizeInterest,
  expandInterests,
  getAllTerms,
  getTaxonomyStats,
} from '../src/lib/interest-synonyms.js';
import ora, { type Ora } from 'ora';

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  currentInterests: string[];
}

interface ExpansionStats {
  newInterestNodes: number;
  productsAnalyzed: number;
  productsUpdated: number;
  totalNewRelationships: number;
  interestCounts: Record<string, number>;
  avgInterestsPerProduct: {
    before: number;
    after: number;
  };
}

/**
 * Extract potential interests from product title and description
 * Uses comprehensive pattern matching against taxonomy terms
 */
function extractInterestsFromProduct(
  title: string,
  description: string | null
): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const foundInterests = new Set<string>();

  // Check each canonical interest and its synonyms
  for (const [canonical, terms] of Object.entries(INTEREST_TAXONOMY)) {
    for (const term of terms) {
      // Create regex that matches whole words or common phrases
      const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

      if (pattern.test(text)) {
        foundInterests.add(canonical);
        break; // Found match for this canonical interest, move to next
      }
    }
  }

  return Array.from(foundInterests);
}

/**
 * Analyze current state of interest nodes and product tagging
 */
async function analyzeCurrentState(spinner: Ora): Promise<{
  totalInterests: number;
  totalProducts: number;
  avgInterestsPerProduct: number;
  topInterests: Array<{ name: string; count: number }>;
  poorlyTaggedInterests: Array<{ name: string; count: number }>;
}> {
  spinner.start('Analyzing current interest state...');

  const driver = getDriver();
  const session = driver.session();

  // Helper to safely convert Neo4j integers
  const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    return typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
  };

  try {
    // Count total interests
    const interestCountResult = await session.run(`
      MATCH (i:Interest)
      RETURN count(i) as total
    `);
    const totalInterests = toNumber(interestCountResult.records[0]?.get('total'));

    // Count total products
    const productCountResult = await session.run(`
      MATCH (p:Product)
      RETURN count(p) as total
    `);
    const totalProducts = toNumber(productCountResult.records[0]?.get('total'));

    // Get interest distribution
    const distributionResult = await session.run(`
      MATCH (i:Interest)<-[:MATCHES_INTEREST]-(p:Product)
      RETURN i.name as interest, count(p) as productCount
      ORDER BY productCount DESC
      LIMIT 20
    `);

    const topInterests = distributionResult.records.map(r => ({
      name: r.get('interest'),
      count: toNumber(r.get('productCount')),
    }));

    // Find poorly tagged interests (< 5 products)
    const poorlyTaggedResult = await session.run(`
      MATCH (i:Interest)<-[:MATCHES_INTEREST]-(p:Product)
      WITH i.name as interest, count(p) as productCount
      WHERE productCount < 5
      RETURN interest, productCount
      ORDER BY productCount ASC
      LIMIT 10
    `);

    const poorlyTaggedInterests = poorlyTaggedResult.records.map(r => ({
      name: r.get('interest'),
      count: toNumber(r.get('productCount')),
    }));

    // Calculate average interests per product
    const avgResult = await session.run(`
      MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
      WITH p, count(i) as interestCount
      RETURN avg(interestCount) as avgInterests
    `);

    const avgInterestsPerProduct = avgResult.records[0]?.get('avgInterests') || 0;

    await session.close();

    spinner.succeed('Current state analyzed');

    return {
      totalInterests,
      totalProducts,
      avgInterestsPerProduct: Number(avgInterestsPerProduct),
      topInterests,
      poorlyTaggedInterests,
    };
  } catch (error) {
    await session.close();
    throw error;
  }
}

/**
 * Create all interest nodes from taxonomy
 */
async function createInterestNodes(dryRun: boolean, spinner: Ora): Promise<number> {
  spinner.start('Creating interest nodes from taxonomy...');

  const canonicalInterests = Object.keys(INTEREST_TAXONOMY);

  if (dryRun) {
    spinner.succeed(`[DRY RUN] Would create ${canonicalInterests.length} interest nodes`);
    return canonicalInterests.length;
  }

  const driver = getDriver();
  const session = driver.session();

  try {
    let created = 0;

    for (const interest of canonicalInterests) {
      const result = await session.run(
        `
        MERGE (i:Interest {name: $name})
        ON CREATE SET
          i.created_at = datetime(),
          i.source = 'taxonomy',
          i.updated_at = datetime()
        ON MATCH SET
          i.updated_at = datetime()
        RETURN i
        `,
        { name: interest }
      );

      if (result.records.length > 0) {
        created++;
      }
    }

    await session.close();

    spinner.succeed(`Created/updated ${created} interest nodes`);
    return created;
  } catch (error) {
    await session.close();
    throw error;
  }
}

/**
 * Expand product interest tagging
 */
async function expandProductInterests(
  dryRun: boolean,
  verbose: boolean,
  spinner: Ora
): Promise<ExpansionStats> {
  spinner.start('Analyzing products for interest expansion...');

  const driver = getDriver();
  const session = driver.session();

  const stats: ExpansionStats = {
    newInterestNodes: 0,
    productsAnalyzed: 0,
    productsUpdated: 0,
    totalNewRelationships: 0,
    interestCounts: {},
    avgInterestsPerProduct: {
      before: 0,
      after: 0,
    },
  };

  try {
    // Get all products with their current interests
    // Uses product_url as unique identifier (actual DB schema)
    const productsResult = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      RETURN p.product_url as id, p.title as title, p.description as description,
             collect(DISTINCT i.name) as currentInterests
    `);

    const products: ProductData[] = productsResult.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      description: r.get('description'),
      currentInterests: r.get('currentInterests').filter((i: string) => i !== null),
    }));

    spinner.text = `Analyzing ${products.length} products...`;
    stats.productsAnalyzed = products.length;

    let totalInterestsBefore = 0;
    let totalInterestsAfter = 0;

    for (const product of products) {
      totalInterestsBefore += product.currentInterests.length;

      // Extract interests from product text
      const extractedInterests = extractInterestsFromProduct(product.title, product.description);

      // Normalize current interests to canonical form
      const currentCanonical = expandInterests(product.currentInterests);

      // Find new interests to add (not already tagged)
      const newInterests = extractedInterests.filter(
        interest => !currentCanonical.includes(interest)
      );

      if (newInterests.length > 0) {
        stats.productsUpdated++;
        totalInterestsAfter += product.currentInterests.length + newInterests.length;

        if (verbose) {
          console.log(`\nProduct: ${product.title}`);
          console.log(`  Current: [${currentCanonical.join(', ')}]`);
          console.log(`  Adding: [${newInterests.join(', ')}]`);
        }

        // Track interest counts
        for (const interest of newInterests) {
          stats.interestCounts[interest] = (stats.interestCounts[interest] || 0) + 1;
        }

        if (!dryRun) {
          // Create relationships
          for (const interest of newInterests) {
            await session.run(
              `
              MATCH (p:Product {product_url: $productId})
              MERGE (i:Interest {name: $interestName})
              MERGE (p)-[r:MATCHES_INTEREST]->(i)
              ON CREATE SET
                r.relevance_score = 0.8,
                r.confidence = 0.7,
                r.reasoning = 'Extracted from product text via interest expansion',
                r.extracted_at = datetime(),
                r.extraction_method = 'taxonomy_expansion'
              `,
              { productId: product.id, interestName: interest }
            );

            stats.totalNewRelationships++;
          }
        } else {
          stats.totalNewRelationships += newInterests.length;
        }
      } else {
        totalInterestsAfter += product.currentInterests.length;
      }
    }

    stats.avgInterestsPerProduct.before = totalInterestsBefore / products.length;
    stats.avgInterestsPerProduct.after = totalInterestsAfter / products.length;

    await session.close();

    const action = dryRun ? '[DRY RUN] Would update' : 'Updated';
    spinner.succeed(
      `${action} ${stats.productsUpdated} products with ${stats.totalNewRelationships} new interests`
    );

    return stats;
  } catch (error) {
    await session.close();
    throw error;
  }
}

/**
 * Category-to-Interest bridging map.
 * Creates MATCHES_INTEREST relationships from existing IN_CATEGORY relationships.
 * This fixes thin interest pools where categories have 10-50x more coverage.
 */
const CATEGORY_TO_INTEREST: Record<string, string[]> = {
  // Games & entertainment
  'Games & Puzzles': ['board-games', 'puzzles'],
  'Board Games': ['board-games'],
  'Card Games': ['board-games'],
  'Video Games': ['gaming'],
  // Home
  'Home Decor': ['home-decor'],
  'Wall Art': ['home-decor', 'art'],
  'Candles & Home Fragrance': ['home-decor'],
  'Furniture': ['home-decor'],
  // Fashion & accessories
  'Watches': ['watches'],
  'Jewelry': ['jewelry'],
  'Handbags & Wallets': ['handbags'],
  'Sneakers & Athletic Shoes': ['sneakers'],
  // Entertainment
  'Movies & TV': ['movies'],
  'Music & Instruments': ['music'],
  // Tech
  'Smart Home': ['smart-home'],
  'Electronics': ['tech'],
  'Gadgets': ['tech'],
  // Arts & crafts
  'Art Supplies': ['art', 'crafts'],
  'Craft Supplies': ['crafts'],
  'Knitting & Crochet': ['knitting'],
  'Sewing': ['sewing'],
  'Pottery & Ceramics': ['pottery'],
  // Books & learning
  'Books': ['reading'],
  'Audiobooks & Podcasts': ['audiobooks', 'podcasts'],
  // Outdoor & fitness
  'Outdoor Gear': ['outdoors'],
  'Camping Gear': ['camping'],
  'Cycling': ['cycling'],
  'Yoga & Pilates': ['yoga', 'pilates'],
  'Fitness & Exercise': ['fitness'],
  // Food & beverage
  'Coffee & Tea': ['coffee', 'tea'],
  'Wine & Spirits': ['wine'],
  'Gourmet Food': ['foodie', 'cooking'],
  'Cooking & Baking': ['cooking', 'baking'],
  'BBQ & Grilling': ['bbq'],
  // Pets
  'Pet Supplies': ['pets'],
  'Dog Supplies': ['dogs'],
  'Cat Supplies': ['cats'],
  // Kids
  'Toys': ['toys'],
  'Baby & Kids': ['parenting'],
  // Beauty & wellness
  'Skincare': ['skincare'],
  'Beauty': ['beauty'],
  'Wellness': ['wellness'],
  // Garden
  'Garden': ['gardening'],
  'Plants': ['gardening', 'houseplants'],
  // Travel
  'Travel Accessories': ['travel'],
  'Luggage': ['travel'],
};

/**
 * Bridge IN_CATEGORY relationships to MATCHES_INTEREST.
 * For each product with an IN_CATEGORY relationship to a mapped category,
 * creates a MATCHES_INTEREST relationship to the corresponding interest.
 */
async function bridgeCategoryToInterest(
  dryRun: boolean,
  verbose: boolean,
  spinner: Ora
): Promise<{ newRelationships: number; categoriesBridged: number }> {
  spinner.start('Bridging categories to interests...');

  const driver = getDriver();
  const session = driver.session();

  let totalNew = 0;
  let categoriesBridged = 0;

  try {
    for (const [categoryName, interests] of Object.entries(CATEGORY_TO_INTEREST)) {
      for (const interestName of interests) {
        // Count how many new rels this would create
        const countResult = await session.run(`
          MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {name: $category})
          WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest {name: $interest})
          RETURN count(p) AS cnt
        `, { category: categoryName, interest: interestName });

        const count = countResult.records[0]?.get('cnt')?.toNumber?.() || Number(countResult.records[0]?.get('cnt')) || 0;

        if (count === 0) continue;

        categoriesBridged++;
        totalNew += count;

        if (verbose) {
          console.log(`  ${categoryName} → ${interestName}: +${count} products`);
        }

        if (!dryRun) {
          // Batch create the relationships
          await session.run(`
            MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {name: $category})
            WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest {name: $interest})
            WITH p
            MATCH (i:Interest {name: $interest})
            MERGE (p)-[r:MATCHES_INTEREST]->(i)
            ON CREATE SET
              r.relevance_score = 0.75,
              r.confidence = 0.65,
              r.reasoning = 'Bridged from IN_CATEGORY: ' + $category,
              r.extracted_at = datetime(),
              r.extraction_method = 'category_bridge'
          `, { category: categoryName, interest: interestName });
        }
      }
    }

    await session.close();

    const action = dryRun ? '[DRY RUN] Would create' : 'Created';
    spinner.succeed(
      `${action} ${totalNew} interest relationships from ${categoriesBridged} category→interest bridges`
    );

    return { newRelationships: totalNew, categoriesBridged };
  } catch (error) {
    await session.close();
    throw error;
  }
}

/**
 * Main expansion function
 */
async function expandInterestsMain(dryRun: boolean, verbose: boolean) {
  const spinner = ora();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            Interest Expansion (Phase 2.2)                     ║
║                                                                ║
║  Expanding from 18 coarse interests to 150+ granular terms    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}
Verbose: ${verbose ? 'Yes' : 'No'}
${dryRun ? '\nUse --live flag to apply changes' : ''}
`);

  // Show taxonomy stats
  const taxonomyStats = getTaxonomyStats();
  console.log('📊 Interest Taxonomy:');
  console.log(`   Canonical interests: ${taxonomyStats.totalCanonicalInterests}`);
  console.log(`   Total terms: ${taxonomyStats.totalTerms}`);
  console.log(`   Avg terms per interest: ${taxonomyStats.avgTermsPerInterest}`);
  console.log('');

  // Initialize Neo4j
  spinner.start('Connecting to Neo4j...');
  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  spinner.succeed('Connected to Neo4j');

  try {
    // Step 1: Analyze current state
    const currentState = await analyzeCurrentState(spinner);

    console.log('\n📈 Current State:');
    console.log(`   Total interest nodes: ${currentState.totalInterests}`);
    console.log(`   Total products: ${currentState.totalProducts}`);
    console.log(`   Avg interests per product: ${currentState.avgInterestsPerProduct.toFixed(2)}`);

    console.log('\n   Top interests:');
    currentState.topInterests.slice(0, 5).forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.name}: ${item.count} products`);
    });

    if (currentState.poorlyTaggedInterests.length > 0) {
      console.log('\n   Poorly tagged interests (< 5 products):');
      currentState.poorlyTaggedInterests.forEach(item => {
        console.log(`     - ${item.name}: ${item.count} product(s)`);
      });
    }

    // Step 2: Create interest nodes
    console.log('');
    const newNodes = await createInterestNodes(dryRun, spinner);

    // Step 3: Expand product interests (text matching)
    console.log('');
    const expansionStats = await expandProductInterests(dryRun, verbose, spinner);

    // Step 4: Bridge categories to interests
    console.log('');
    const bridgeStats = await bridgeCategoryToInterest(dryRun, verbose, spinner);

    // Final summary
    console.log('\n📊 Expansion Summary:');
    console.log(`   Products analyzed: ${expansionStats.productsAnalyzed}`);
    console.log(`   Products updated: ${expansionStats.productsUpdated}`);
    console.log(`   New interest relationships (text): ${expansionStats.totalNewRelationships}`);
    console.log(`   New interest relationships (category bridge): ${bridgeStats.newRelationships}`);
    console.log(`   Total new: ${expansionStats.totalNewRelationships + bridgeStats.newRelationships}`);
    console.log(
      `   Avg interests per product: ${expansionStats.avgInterestsPerProduct.before.toFixed(2)} → ${expansionStats.avgInterestsPerProduct.after.toFixed(2)} (before bridge)`
    );

    // Show top newly tagged interests
    const sortedCounts = Object.entries(expansionStats.interestCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sortedCounts.length > 0) {
      console.log('\n   Top new interest tags:');
      sortedCounts.forEach(([interest, count], i) => {
        console.log(`     ${i + 1}. ${interest}: +${count} products`);
      });
    }

    // Highlight specific improvements
    console.log('\n🎯 Key Improvements:');
    const hikingCount = expansionStats.interestCounts['hiking'] || 0;
    const yogaCount = expansionStats.interestCounts['yoga'] || 0;
    if (hikingCount > 0) console.log(`   - Hiking: +${hikingCount} products`);
    if (yogaCount > 0) console.log(`   - Yoga: +${yogaCount} products`);

    const longTailInterests = [
      'jewelry',
      'books',
      'reading',
      'toys',
      'pets',
      'crafts',
      'knitting',
      'sewing',
    ];
    const longTailCounts = longTailInterests
      .map(interest => ({ interest, count: expansionStats.interestCounts[interest] || 0 }))
      .filter(item => item.count > 0);

    if (longTailCounts.length > 0) {
      console.log('   - Long-tail coverage improved:');
      longTailCounts.forEach(item => {
        console.log(`     - ${item.interest}: +${item.count}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
    } else {
      console.log('\n✅ Interest expansion complete!\n');
    }
  } catch (error) {
    spinner.fail('Interest expansion failed');
    logger.error('Interest expansion failed', { error });
    throw error;
  } finally {
    await closeNeo4j();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');
const verbose = args.includes('--verbose');

expandInterestsMain(dryRun, verbose).catch(console.error);
