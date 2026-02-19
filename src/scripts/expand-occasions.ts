#!/usr/bin/env tsx
/**
 * Occasion Expansion Script
 *
 * Purpose: Tag all 64,964 products with GIFT_FOR_OCCASION relationships
 * to existing GiftOccasion nodes using heuristic rules based on
 * product categories, interests, keywords, and price.
 *
 * Current state: Only 90 GIFT_FOR_OCCASION relationships exist (0.14%)
 * Expected: 80%+ coverage (50,000+ products tagged)
 *
 * Uses existing GiftOccasion nodes (15 occasions) created by
 * scripts/product_enrichment/load_neo4j.py
 *
 * Usage:
 *   tsx scripts/expand-occasions.ts                    # Dry run
 *   tsx scripts/expand-occasions.ts --live             # Apply changes
 *   tsx scripts/expand-occasions.ts --live --verbose   # Apply with detailed logs
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';

const BATCH_SIZE = 500;

// ============================================================
// Occasion Heuristic Rules
// ============================================================
// Each occasion has:
//   - universal: if true, all products match unless excluded
//   - categorySignals: categories that strongly suggest this occasion
//   - interestSignals: interests that strongly suggest this occasion
//   - keywords: regex patterns in title/description
//   - priceRange: optional min/max that makes a product more suitable
//   - excludeCategories: categories that disqualify
//   - excludeKeywords: regex patterns that disqualify

interface OccasionRule {
  universal?: boolean;
  categorySignals?: string[];
  interestSignals?: string[];
  keywords?: RegExp;
  priceRange?: { min?: number; max?: number };
  excludeCategories?: string[];
  excludeKeywords?: RegExp;
}

const OCCASION_RULES: Record<string, OccasionRule> = {
  // ----- Universal occasions (most products are suitable) -----
  birthday: {
    universal: true,
    // Almost anything can be a birthday gift
    excludeCategories: ['Baby & Nursery'], // baby items are baby_shower, not generic birthday
    excludeKeywords: /\b(replacement\s*part|refill\s*pack|bulk\s*order)\b/i,
  },
  christmas: {
    universal: true,
    excludeKeywords: /\b(replacement\s*part|refill\s*pack|bulk\s*order)\b/i,
  },
  holiday: {
    universal: true,
    excludeKeywords: /\b(replacement\s*part|refill\s*pack|bulk\s*order)\b/i,
  },
  just_because: {
    universal: true,
    priceRange: { max: 150 }, // "just because" gifts tend to be smaller
    excludeKeywords: /\b(replacement\s*part|refill\s*pack|bulk\s*order)\b/i,
  },
  self_gift: {
    // Self-gifting: personal care, wellness, fashion, food/drink, tech
    categorySignals: [
      'Beauty & Skincare', 'Wellness & Self-Care', 'Spa & Bath',
      'Fashion & Clothing', 'Jewelry', 'Watches', 'Bags & Wallets',
      'Coffee & Tea', 'Wine & Spirits', 'Food & Snacks',
      'Tech Gadgets', 'Smart Home', 'Electronics',
      'Fitness & Exercise', 'Candles & Fragrance',
      'Books', 'Subscriptions',
    ],
    interestSignals: [
      'skincare', 'beauty', 'wellness', 'yoga', 'fitness',
      'coffee', 'tea', 'wine', 'fashion', 'jewelry',
      'reading', 'meditation', 'cooking', 'fragrance',
    ],
    keywords: /\b(treat\s*yourself|self.?care|indulg|pamper|personal|me\s*time|ritual|luxur)\b/i,
  },

  // ----- Semi-universal occasions -----
  thank_you: {
    // Thank-you gifts: smaller, consumable, universally appealing
    categorySignals: [
      'Coffee & Tea', 'Wine & Spirits', 'Food & Snacks',
      'Candles & Fragrance', 'Plants & Gardening', 'Stationery',
      'Art & Prints', 'Home Decor', 'Beauty & Skincare',
      'Spa & Bath', 'Kitchen & Dining', 'Scarves & Accessories',
    ],
    interestSignals: [
      'coffee', 'tea', 'wine', 'cooking', 'baking',
      'flowers', 'houseplants', 'art', 'fragrance',
    ],
    keywords: /\b(thank|gratitude|appreciate|host|hostess|teacher|mentor)\b/i,
    priceRange: { max: 100 },
  },

  // ----- Specific occasions -----
  anniversary: {
    categorySignals: [
      'Jewelry', 'Watches', 'Wine & Spirits', 'Experiences',
      'Art & Prints', 'Home Decor', 'Candles & Fragrance',
      'Fashion & Clothing', 'Bags & Wallets', 'Spa & Bath',
      'Subscriptions', 'Personalized Gifts',
    ],
    interestSignals: [
      'jewelry', 'wine', 'travel', 'luxury-travel',
      'cooking', 'art', 'photography', 'watches', 'fragrance',
    ],
    keywords: /\b(annivers|romantic|love|couple|partner|spouse|wedding\s*gift|years\s*together|sweetheart)\b/i,
  },
  valentines: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Spa & Bath', 'Candles & Fragrance',
      'Wine & Spirits', 'Food & Snacks', 'Fashion & Clothing',
      'Experiences', 'Personalized Gifts', 'Art & Prints',
    ],
    interestSignals: [
      'jewelry', 'fragrance', 'wine', 'cooking',
      'beauty', 'skincare', 'fashion', 'chocolate',
    ],
    keywords: /\b(valentine|romantic|love|sweetheart|heart|rose|chocolate|passion|sensual|intimate)\b/i,
  },
  mothers_day: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Spa & Bath', 'Candles & Fragrance',
      'Plants & Gardening', 'Home Decor', 'Kitchen & Dining',
      'Fashion & Clothing', 'Scarves & Accessories', 'Bags & Wallets',
      'Personalized Gifts', 'Books', 'Art & Prints', 'Stationery',
      'Bedding & Linens',
    ],
    interestSignals: [
      'gardening', 'flowers', 'houseplants', 'cooking', 'baking',
      'jewelry', 'beauty', 'skincare', 'yoga', 'reading',
      'knitting', 'sewing', 'crafts', 'fragrance', 'tea',
    ],
    keywords: /\b(mom|mother|mama|mum|her\b|she\b|woman|women|feminine|floral|bloom|petal)\b/i,
  },
  fathers_day: {
    categorySignals: [
      'Tech Gadgets', 'Outdoor & Camping', 'Sports Equipment',
      'Coffee & Tea', 'Wine & Spirits', 'Kitchen Gadgets',
      'Travel Accessories', 'Watches', 'Bags & Wallets',
      'Games & Puzzles', 'Board Games', 'Books',
      'Personalized Gifts', 'Food & Snacks',
    ],
    interestSignals: [
      'bbq', 'coffee', 'craft-beer', 'cocktails', 'fishing',
      'hiking', 'camping', 'cycling', 'tech', 'gaming',
      'woodworking', 'cars', 'motorcycles', 'guitar',
      'history', 'science', 'watches', 'cooking',
    ],
    keywords: /\b(dad|father|papa|him\b|he\b|man\b|men|masculine|rugged|workshop|garage|grill)\b/i,
  },
  wedding: {
    categorySignals: [
      'Home Decor', 'Kitchen & Dining', 'Bedding & Linens',
      'Art & Prints', 'Candles & Fragrance', 'Personalized Gifts',
      'Wine & Spirits', 'Experiences', 'Furniture',
    ],
    interestSignals: [
      'home-decor', 'cooking', 'wine', 'art', 'travel',
    ],
    keywords: /\b(wedding|bridal|bride|groom|newlywed|registry|couple|married|engagement|mr\s*and\s*mrs)\b/i,
    priceRange: { min: 25 }, // Wedding gifts tend to be mid-to-high
  },
  baby_shower: {
    categorySignals: ['Baby & Nursery', 'Toys'],
    interestSignals: ['parenting', 'toys'],
    keywords: /\b(baby|infant|newborn|nursery|toddler|child|kid|onesie|teeth|pacifier|diaper|stroller|crib)\b/i,
  },
  housewarming: {
    categorySignals: [
      'Home Decor', 'Kitchen & Dining', 'Candles & Fragrance',
      'Plants & Gardening', 'Bedding & Linens', 'Furniture',
      'Kitchen Gadgets', 'Art & Prints',
    ],
    interestSignals: [
      'home-decor', 'cooking', 'houseplants', 'gardening',
      'organizing', 'flowers',
    ],
    keywords: /\b(home|house|apartment|kitchen|living\s*room|decor|cozy|nest|housewarming|entertaining)\b/i,
  },
  graduation: {
    categorySignals: [
      'Tech Gadgets', 'Bags & Wallets', 'Watches',
      'Books', 'Stationery', 'Personalized Gifts',
      'Experiences', 'Travel Accessories', 'Jewelry',
      'Office & Desk',
    ],
    interestSignals: [
      'professional-development', 'entrepreneurship', 'productivity',
      'travel', 'tech', 'reading',
    ],
    keywords: /\b(graduat|diploma|college|university|career|milestone|achievement|class\s*of|congrats)\b/i,
  },
  retirement: {
    categorySignals: [
      'Experiences', 'Travel Accessories', 'Books',
      'Wine & Spirits', 'Art & Prints', 'Subscriptions',
      'Plants & Gardening', 'Personalized Gifts',
      'Games & Puzzles', 'Outdoor & Camping',
    ],
    interestSignals: [
      'travel', 'gardening', 'reading', 'wine', 'golf',
      'fishing', 'hiking', 'painting', 'photography',
      'cooking', 'history',
    ],
    keywords: /\b(retir|leisure|relax|golden\s*years|chapter|journey|adventure)\b/i,
  },
};

// ============================================================
// Product type
// ============================================================
interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  categories: string[];
  interests: string[];
}

// ============================================================
// Occasion inference logic
// ============================================================
function inferOccasions(product: ProductRow): string[] {
  const text = `${product.title} ${product.description || ''}`.toLowerCase();
  const matched = new Set<string>();

  for (const [occasion, rule] of Object.entries(OCCASION_RULES)) {
    // Check exclusions first
    if (rule.excludeKeywords && rule.excludeKeywords.test(text)) continue;
    if (rule.excludeCategories && product.categories.some(c => rule.excludeCategories!.includes(c))) continue;

    // Universal occasions: match everything not excluded
    if (rule.universal) {
      // Apply price filter if specified
      if (rule.priceRange) {
        if (product.price !== null) {
          if (rule.priceRange.min && product.price < rule.priceRange.min) continue;
          if (rule.priceRange.max && product.price > rule.priceRange.max) continue;
        }
      }
      matched.add(occasion);
      continue;
    }

    // Non-universal: need at least one signal
    let hasSignal = false;

    // Category signals
    if (rule.categorySignals && product.categories.some(c => rule.categorySignals!.includes(c))) {
      hasSignal = true;
    }

    // Interest signals
    if (!hasSignal && rule.interestSignals && product.interests.some(i => rule.interestSignals!.includes(i))) {
      hasSignal = true;
    }

    // Keyword signals
    if (!hasSignal && rule.keywords && rule.keywords.test(text)) {
      hasSignal = true;
    }

    if (!hasSignal) continue;

    // Apply price filter
    if (rule.priceRange && product.price !== null) {
      if (rule.priceRange.min && product.price < rule.priceRange.min) continue;
      if (rule.priceRange.max && product.price > rule.priceRange.max) continue;
    }

    matched.add(occasion);
  }

  return Array.from(matched);
}

// ============================================================
// Main
// ============================================================
async function expandOccasionsMain(dryRun: boolean, verbose: boolean) {
  const spinner = ora();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            Occasion Expansion                                  ║
║                                                                ║
║  Tag products with GIFT_FOR_OCCASION relationships             ║
║  using ${Object.keys(OCCASION_RULES).length} occasion rules with category/interest/keyword heuristics  ║
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
    // Step 1: Check existing occasion state
    spinner.start('Analyzing current occasion state...');
    const session1 = driver.session();
    const currentResult = await session1.run(`
      MATCH (o:GiftOccasion)<-[:GIFT_FOR_OCCASION]-(p:Product)
      RETURN o.name AS occasion, count(p) AS productCount
      ORDER BY productCount DESC
    `);
    console.log('\n  Current GIFT_FOR_OCCASION relationships:');
    if (currentResult.records.length === 0) {
      console.log('   (none)');
    }
    for (const r of currentResult.records) {
      console.log(`   ${r.get('occasion')}: ${r.get('productCount')} products`);
    }

    // Check GiftOccasion nodes exist
    const nodesResult = await session1.run(`
      MATCH (o:GiftOccasion) RETURN o.name AS name ORDER BY name
    `);
    const existingOccasions = nodesResult.records.map(r => r.get('name') as string);
    console.log(`\n  GiftOccasion nodes in DB: ${existingOccasions.length}`);
    if (existingOccasions.length === 0) {
      console.log('\n  WARNING: No GiftOccasion nodes found. Creating them...');
    }
    await session1.close();
    spinner.succeed('Current state analyzed');

    // Step 2: Ensure GiftOccasion nodes exist for all our occasions
    const session2a = driver.session();
    const occasionNames = Object.keys(OCCASION_RULES);
    await session2a.run(
      `UNWIND $names AS name MERGE (o:GiftOccasion {name: name})`,
      { names: occasionNames }
    );
    await session2a.close();

    // Step 3: Get all products with their categories and interests
    spinner.start('Loading products with categories and interests...');
    const session2 = driver.session();
    const productsResult = await session2.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      RETURN p.product_url AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             collect(DISTINCT c.name) AS categories,
             collect(DISTINCT i.name) AS interests
    `);
    await session2.close();

    const products: ProductRow[] = productsResult.records.map(r => ({
      id: r.get('id') as string,
      title: r.get('title') as string,
      description: r.get('description') as string | null,
      price: (() => {
        const p = r.get('price');
        if (p === null || p === undefined) return null;
        if (typeof p === 'number') return p;
        if (p.toNumber) return p.toNumber();
        return parseFloat(String(p)) || null;
      })(),
      categories: (r.get('categories') as string[]).filter(Boolean),
      interests: (r.get('interests') as string[]).filter(Boolean),
    }));
    spinner.succeed(`Loaded ${products.length} products`);

    // Step 4: Infer occasions for each product
    spinner.start('Inferring occasions...');
    const occasionCounts: Record<string, number> = {};
    let productsWithOccasions = 0;
    let totalRelationships = 0;
    const occasionLinks: Array<{ productId: string; occasion: string }> = [];

    for (const product of products) {
      const occasions = inferOccasions(product);
      if (occasions.length > 0) {
        productsWithOccasions++;
        for (const occ of occasions) {
          occasionCounts[occ] = (occasionCounts[occ] || 0) + 1;
          occasionLinks.push({ productId: product.id, occasion: occ });
          totalRelationships++;
        }
      }

      if (verbose && occasions.length > 0 && productsWithOccasions <= 10) {
        console.log(`   ${product.title.slice(0, 50)}: [${occasions.join(', ')}]`);
      }
    }
    spinner.succeed(`Inferred ${totalRelationships} occasion relationships for ${productsWithOccasions} products`);

    // Show occasion distribution
    const sortedOccs = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1]);
    console.log('\n  Occasion Distribution:');
    for (const [occ, count] of sortedOccs) {
      const pct = ((count / products.length) * 100).toFixed(1);
      console.log(`   ${occ}: ${count.toLocaleString()} products (${pct}%)`);
    }

    const untagged = products.length - productsWithOccasions;
    console.log(`\n   Tagged: ${productsWithOccasions.toLocaleString()} (${((productsWithOccasions / products.length) * 100).toFixed(1)}%)`);
    console.log(`   Untagged: ${untagged.toLocaleString()} (${((untagged / products.length) * 100).toFixed(1)}%)`);

    if (dryRun) {
      console.log('\n  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
      return;
    }

    // Step 5: Remove existing GIFT_FOR_OCCASION rels (clean slate)
    spinner.start('Removing old GIFT_FOR_OCCASION relationships...');
    const session3 = driver.session();
    await session3.run(`
      MATCH ()-[r:GIFT_FOR_OCCASION]->()
      DELETE r
    `);
    spinner.succeed('Removed old GIFT_FOR_OCCASION relationships');

    // Step 6: Create relationships in batches
    spinner.start(`Creating ${occasionLinks.length.toLocaleString()} occasion relationships...`);
    let processed = 0;

    for (let i = 0; i < occasionLinks.length; i += BATCH_SIZE) {
      const batch = occasionLinks.slice(i, i + BATCH_SIZE);
      await session3.run(
        `
        UNWIND $links AS link
        MATCH (p:Product {product_url: link.productId})
        MATCH (o:GiftOccasion {name: link.occasion})
        MERGE (p)-[:GIFT_FOR_OCCASION]->(o)
        `,
        { links: batch }
      );
      processed += batch.length;
      spinner.text = `Creating occasion relationships... ${processed.toLocaleString()}/${occasionLinks.length.toLocaleString()}`;
    }
    await session3.close();
    spinner.succeed(`Created ${occasionLinks.length.toLocaleString()} occasion relationships`);

    // Step 7: Final stats
    const session4 = driver.session();
    const finalResult = await session4.run(`
      MATCH (o:GiftOccasion)<-[:GIFT_FOR_OCCASION]-(p:Product)
      RETURN o.name AS occasion, count(p) AS productCount
      ORDER BY productCount DESC
    `);
    await session4.close();

    console.log('\n  Final GIFT_FOR_OCCASION Distribution:');
    for (const r of finalResult.records) {
      const occ = r.get('occasion');
      const count = r.get('productCount');
      const pct = ((count / products.length) * 100).toFixed(1);
      console.log(`   ${occ}: ${count.toLocaleString()} products (${pct}%)`);
    }

    console.log('\n  Occasion expansion complete!\n');
  } catch (error) {
    spinner.fail('Occasion expansion failed');
    logger.error('Occasion expansion failed', { error });
    throw error;
  } finally {
    await closeNeo4j();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');
const verbose = args.includes('--verbose');

expandOccasionsMain(dryRun, verbose).catch(console.error);
