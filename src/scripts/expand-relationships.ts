#!/usr/bin/env tsx
/**
 * Relationship Expansion Script
 *
 * Purpose: Tag all 64,964 products with GIFT_FOR_RELATIONSHIP relationships
 * to existing GiftRelationship nodes using heuristic rules based on
 * product categories, interests, keywords, and price.
 *
 * Current state: Only 172 GIFT_FOR_RELATIONSHIP relationships exist (0.26%)
 * Expected: 80%+ coverage (50,000+ products tagged)
 *
 * Uses existing GiftRelationship nodes (18 relationships) created by
 * scripts/product_enrichment/load_neo4j.py
 *
 * Usage:
 *   tsx scripts/expand-relationships.ts                    # Dry run
 *   tsx scripts/expand-relationships.ts --live             # Apply changes
 *   tsx scripts/expand-relationships.ts --live --verbose   # Apply with detailed logs
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';

const BATCH_SIZE = 500;

// ============================================================
// Relationship Heuristic Rules
// ============================================================
// Strategy: use category/interest/keyword/price signals to determine
// which recipient relationships a product is suitable for.
//
// Most products are suitable for multiple relationships. The rules
// aim for reasonable coverage while avoiding absurd matches.
//
// Signal types:
// - categorySignals: product is IN_CATEGORY for these
// - interestSignals: product MATCHES_INTEREST for these
// - keywords: regex in product title/description
// - priceRange: price bounds for appropriateness
// - excludeKeywords: disqualifiers

interface RelationshipRule {
  universal?: boolean;
  categorySignals?: string[];
  interestSignals?: string[];
  keywords?: RegExp;
  priceRange?: { min?: number; max?: number };
  excludeCategories?: string[];
  excludeKeywords?: RegExp;
}

const RELATIONSHIP_RULES: Record<string, RelationshipRule> = {
  // ----- Universal relationships -----
  friend: {
    universal: true,
    // Almost anything works for a friend
    priceRange: { max: 200 },
    excludeKeywords: /\b(replacement\s*part|refill\s*pack|bulk\s*order|infant|baby\s*bottle|pacifier)\b/i,
  },

  // ----- Romantic partners -----
  wife: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Spa & Bath', 'Candles & Fragrance',
      'Fashion & Clothing', 'Scarves & Accessories', 'Bags & Wallets',
      'Experiences', 'Personalized Gifts', 'Art & Prints',
      'Home Decor', 'Bedding & Linens', 'Plants & Gardening',
      'Books', 'Subscriptions', 'Kitchen & Dining',
      'Wine & Spirits', 'Food & Snacks', 'Wellness & Self-Care',
    ],
    interestSignals: [
      'jewelry', 'beauty', 'skincare', 'fashion', 'yoga', 'pilates',
      'cooking', 'baking', 'reading', 'gardening', 'houseplants',
      'flowers', 'art', 'photography', 'wine', 'fragrance',
      'dancing', 'crafts', 'knitting', 'sewing', 'tea', 'travel',
    ],
    keywords: /\b(her|she|woman|women|wife|girlfriend|partner|feminine|floral|elegant|delicate)\b/i,
  },
  husband: {
    categorySignals: [
      'Tech Gadgets', 'Outdoor & Camping', 'Sports Equipment',
      'Coffee & Tea', 'Wine & Spirits', 'Kitchen Gadgets',
      'Travel Accessories', 'Watches', 'Bags & Wallets',
      'Games & Puzzles', 'Board Games', 'Video Games',
      'Books', 'Experiences', 'Food & Snacks',
      'Personalized Gifts', 'Fitness & Exercise',
    ],
    interestSignals: [
      'tech', 'gaming', 'bbq', 'coffee', 'craft-beer', 'cocktails',
      'hiking', 'camping', 'cycling', 'fishing', 'cooking',
      'woodworking', 'cars', 'motorcycles', 'guitar', 'watches',
      'fitness', 'weightlifting', 'running', 'surfing', 'skiing',
    ],
    keywords: /\b(him|he\b|man\b|men|husband|boyfriend|partner|masculine|rugged)\b/i,
  },
  partner: {
    // Gender-neutral — union of wife + husband signals, plus shared experiences
    categorySignals: [
      'Experiences', 'Wine & Spirits', 'Food & Snacks', 'Coffee & Tea',
      'Personalized Gifts', 'Art & Prints', 'Home Decor',
      'Candles & Fragrance', 'Books', 'Subscriptions',
      'Kitchen & Dining', 'Games & Puzzles', 'Jewelry',
      'Travel Accessories', 'Spa & Bath',
    ],
    interestSignals: [
      'cooking', 'wine', 'travel', 'art', 'reading', 'coffee',
      'hiking', 'music', 'photography', 'yoga', 'fitness',
      'gaming', 'movies', 'tv-shows', 'concerts',
    ],
    keywords: /\b(partner|couple|together|date\s*night|romantic|love|anniversary|sweetheart)\b/i,
  },

  // ----- Parents -----
  mother: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Spa & Bath', 'Candles & Fragrance',
      'Plants & Gardening', 'Home Decor', 'Kitchen & Dining',
      'Fashion & Clothing', 'Scarves & Accessories', 'Bags & Wallets',
      'Personalized Gifts', 'Books', 'Art & Prints', 'Stationery',
      'Bedding & Linens', 'Wellness & Self-Care',
    ],
    interestSignals: [
      'gardening', 'flowers', 'houseplants', 'cooking', 'baking',
      'jewelry', 'beauty', 'skincare', 'yoga', 'reading',
      'knitting', 'sewing', 'crafts', 'fragrance', 'tea',
      'pottery', 'art', 'meditation',
    ],
    keywords: /\b(mom|mother|mama|mum|her|she|woman|feminine|floral|garden)\b/i,
  },
  father: {
    categorySignals: [
      'Tech Gadgets', 'Outdoor & Camping', 'Sports Equipment',
      'Coffee & Tea', 'Wine & Spirits', 'Kitchen Gadgets',
      'Travel Accessories', 'Watches', 'Bags & Wallets',
      'Games & Puzzles', 'Board Games', 'Books',
      'Personalized Gifts', 'Food & Snacks', 'Fitness & Exercise',
    ],
    interestSignals: [
      'bbq', 'coffee', 'craft-beer', 'cocktails', 'fishing',
      'hiking', 'camping', 'cycling', 'tech', 'gaming',
      'woodworking', 'cars', 'motorcycles', 'guitar',
      'history', 'science', 'watches', 'cooking', 'reading',
    ],
    keywords: /\b(dad|father|papa|him|he\b|man\b|men|masculine|workshop|garage|grill)\b/i,
  },

  // ----- Siblings -----
  sister: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Spa & Bath', 'Fashion & Clothing',
      'Candles & Fragrance', 'Books', 'Art & Prints',
      'Coffee & Tea', 'Food & Snacks', 'Stationery',
      'Bags & Wallets', 'Scarves & Accessories', 'Wellness & Self-Care',
    ],
    interestSignals: [
      'jewelry', 'beauty', 'skincare', 'fashion', 'yoga',
      'reading', 'coffee', 'tea', 'art', 'photography',
      'cooking', 'baking', 'fitness', 'music', 'crafts',
    ],
    keywords: /\b(sister|her|she|woman|girl|feminine)\b/i,
    priceRange: { max: 150 },
  },
  brother: {
    categorySignals: [
      'Tech Gadgets', 'Gaming', 'Video Games', 'Sports Equipment',
      'Coffee & Tea', 'Wine & Spirits', 'Outdoor & Camping',
      'Books', 'Food & Snacks', 'Games & Puzzles',
      'Watches', 'Fitness & Exercise', 'Travel Accessories',
    ],
    interestSignals: [
      'tech', 'gaming', 'coffee', 'craft-beer', 'hiking',
      'cycling', 'fitness', 'running', 'music', 'guitar',
      'cooking', 'bbq', 'camping', 'surfing', 'skiing',
    ],
    keywords: /\b(brother|him|he\b|man\b|guy|masculine|bro)\b/i,
    priceRange: { max: 150 },
  },

  // ----- Children -----
  daughter: {
    categorySignals: [
      'Jewelry', 'Beauty & Skincare', 'Books', 'Art & Prints',
      'Stationery', 'Fashion & Clothing', 'Toys',
      'Craft Supplies', 'Music & Instruments', 'Experiences',
    ],
    interestSignals: [
      'jewelry', 'beauty', 'reading', 'art', 'drawing',
      'crafts', 'music', 'dancing', 'yoga', 'photography',
      'fashion', 'cooking', 'baking',
    ],
    keywords: /\b(daughter|girl|her|she|teen|tween|young\s*woman)\b/i,
    priceRange: { max: 150 },
  },
  son: {
    categorySignals: [
      'Tech Gadgets', 'Video Games', 'Sports Equipment',
      'Books', 'Toys', 'Games & Puzzles', 'Board Games',
      'Outdoor & Camping', 'Music & Instruments', 'Experiences',
    ],
    interestSignals: [
      'gaming', 'tech', 'sports', 'hiking', 'cycling',
      'music', 'guitar', 'reading', 'science', 'lego',
      'cooking', 'art', 'drawing',
    ],
    keywords: /\b(son|boy|him|he\b|teen|tween|young\s*man)\b/i,
    priceRange: { max: 150 },
  },
  children: {
    categorySignals: [
      'Toys', 'Games & Puzzles', 'Board Games', 'Books',
      'Art & Prints', 'Craft Supplies', 'Music & Instruments',
      'Experiences', 'Stationery',
    ],
    interestSignals: [
      'toys', 'lego', 'gaming', 'art', 'drawing', 'crafts',
      'reading', 'music', 'science', 'puzzles',
    ],
    keywords: /\b(child|kid|children|young|play|fun|educational|learn|colorful|whimsy)\b/i,
    priceRange: { max: 100 },
  },

  // ----- Extended family -----
  grandparent: {
    categorySignals: [
      'Books', 'Home Decor', 'Candles & Fragrance', 'Personalized Gifts',
      'Food & Snacks', 'Coffee & Tea', 'Plants & Gardening',
      'Bedding & Linens', 'Art & Prints', 'Wellness & Self-Care',
      'Games & Puzzles',
    ],
    interestSignals: [
      'reading', 'gardening', 'cooking', 'tea', 'coffee',
      'knitting', 'history', 'puzzles', 'birds', 'flowers',
      'art', 'music', 'houseplants',
    ],
    keywords: /\b(grandma|grandpa|grandmother|grandfather|grandparent|nana|nanna|granny|papa|poppy|elder|senior|comfort)\b/i,
  },
  niece_nephew: {
    categorySignals: [
      'Toys', 'Games & Puzzles', 'Books', 'Art & Prints',
      'Craft Supplies', 'Music & Instruments', 'Stationery',
      'Fashion & Clothing', 'Experiences', 'Tech Gadgets',
    ],
    interestSignals: [
      'toys', 'lego', 'gaming', 'art', 'drawing', 'crafts',
      'reading', 'music', 'science', 'puzzles',
    ],
    keywords: /\b(niece|nephew|young|child|kid|teen|tween)\b/i,
    priceRange: { max: 100 },
  },
  aunt_uncle: {
    // Similar to friend but more personal — mid-range gifts
    categorySignals: [
      'Coffee & Tea', 'Wine & Spirits', 'Food & Snacks',
      'Books', 'Home Decor', 'Candles & Fragrance',
      'Personalized Gifts', 'Art & Prints', 'Experiences',
      'Kitchen & Dining', 'Spa & Bath',
    ],
    interestSignals: [
      'coffee', 'tea', 'wine', 'cooking', 'reading',
      'gardening', 'art', 'travel', 'music',
    ],
    priceRange: { max: 100 },
  },

  // ----- Professional / Social -----
  coworker: {
    categorySignals: [
      'Coffee & Tea', 'Food & Snacks', 'Stationery',
      'Candles & Fragrance', 'Office & Desk', 'Books',
      'Tech Gadgets', 'Plants & Gardening',
    ],
    interestSignals: [
      'coffee', 'tea', 'reading', 'professional-development',
      'productivity', 'tech',
    ],
    keywords: /\b(office|desk|work|colleague|coworker|professional|corporate)\b/i,
    priceRange: { max: 75 },
  },
  boss: {
    categorySignals: [
      'Wine & Spirits', 'Coffee & Tea', 'Food & Snacks',
      'Books', 'Art & Prints', 'Office & Desk',
      'Personalized Gifts', 'Stationery',
    ],
    interestSignals: [
      'wine', 'coffee', 'tea', 'reading', 'professional-development',
    ],
    keywords: /\b(executive|professional|office|luxury|premium|refined|sophisticated|distinguished)\b/i,
    priceRange: { min: 20, max: 150 },
  },
  teacher: {
    categorySignals: [
      'Coffee & Tea', 'Food & Snacks', 'Stationery',
      'Books', 'Candles & Fragrance', 'Personalized Gifts',
      'Plants & Gardening',
    ],
    interestSignals: [
      'coffee', 'tea', 'reading', 'stationery',
    ],
    keywords: /\b(teacher|educator|school|classroom|learn|teach|mentor|professor|tutor)\b/i,
    priceRange: { max: 50 },
  },
  neighbor: {
    categorySignals: [
      'Food & Snacks', 'Coffee & Tea', 'Wine & Spirits',
      'Candles & Fragrance', 'Plants & Gardening', 'Home Decor',
    ],
    interestSignals: [
      'cooking', 'baking', 'coffee', 'tea', 'gardening',
      'flowers', 'houseplants',
    ],
    keywords: /\b(neighbor|neighbourly|housewarming|welcome|host|hostess)\b/i,
    priceRange: { max: 50 },
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
// Relationship inference logic
// ============================================================
function inferRelationships(product: ProductRow): string[] {
  const text = `${product.title} ${product.description || ''}`.toLowerCase();
  const matched = new Set<string>();

  for (const [relationship, rule] of Object.entries(RELATIONSHIP_RULES)) {
    // Check exclusions
    if (rule.excludeKeywords && rule.excludeKeywords.test(text)) continue;
    if (rule.excludeCategories && product.categories.some(c => rule.excludeCategories!.includes(c))) continue;

    // Universal: match everything not excluded
    if (rule.universal) {
      if (rule.priceRange && product.price !== null) {
        if (rule.priceRange.min && product.price < rule.priceRange.min) continue;
        if (rule.priceRange.max && product.price > rule.priceRange.max) continue;
      }
      matched.add(relationship);
      continue;
    }

    // Non-universal: need at least one signal
    let hasSignal = false;

    if (rule.categorySignals && product.categories.some(c => rule.categorySignals!.includes(c))) {
      hasSignal = true;
    }
    if (!hasSignal && rule.interestSignals && product.interests.some(i => rule.interestSignals!.includes(i))) {
      hasSignal = true;
    }
    if (!hasSignal && rule.keywords && rule.keywords.test(text)) {
      hasSignal = true;
    }

    if (!hasSignal) continue;

    // Price filter
    if (rule.priceRange && product.price !== null) {
      if (rule.priceRange.min && product.price < rule.priceRange.min) continue;
      if (rule.priceRange.max && product.price > rule.priceRange.max) continue;
    }

    matched.add(relationship);
  }

  return Array.from(matched);
}

// ============================================================
// Main
// ============================================================
async function expandRelationshipsMain(dryRun: boolean, verbose: boolean) {
  const spinner = ora();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            Relationship Expansion                              ║
║                                                                ║
║  Tag products with GIFT_FOR_RELATIONSHIP relationships         ║
║  using ${Object.keys(RELATIONSHIP_RULES).length} relationship rules with category/interest/keyword     ║
║  heuristics                                                    ║
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
    // Step 1: Check existing relationship state
    spinner.start('Analyzing current relationship state...');
    const session1 = driver.session();
    const currentResult = await session1.run(`
      MATCH (r:GiftRelationship)<-[:GIFT_FOR_RELATIONSHIP]-(p:Product)
      RETURN r.name AS relationship, count(p) AS productCount
      ORDER BY productCount DESC
    `);
    console.log('\n  Current GIFT_FOR_RELATIONSHIP relationships:');
    if (currentResult.records.length === 0) {
      console.log('   (none)');
    }
    for (const r of currentResult.records) {
      console.log(`   ${r.get('relationship')}: ${r.get('productCount')} products`);
    }

    // Check GiftRelationship nodes exist
    const nodesResult = await session1.run(`
      MATCH (r:GiftRelationship) RETURN r.name AS name ORDER BY name
    `);
    const existingRels = nodesResult.records.map(r => r.get('name') as string);
    console.log(`\n  GiftRelationship nodes in DB: ${existingRels.length}`);
    await session1.close();
    spinner.succeed('Current state analyzed');

    // Step 2: Ensure GiftRelationship nodes exist for all our relationships
    const session2a = driver.session();
    const relNames = Object.keys(RELATIONSHIP_RULES);
    await session2a.run(
      `UNWIND $names AS name MERGE (r:GiftRelationship {name: name})`,
      { names: relNames }
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

    // Step 4: Infer relationships for each product
    spinner.start('Inferring relationships...');
    const relCounts: Record<string, number> = {};
    let productsWithRels = 0;
    let totalRelationships = 0;
    const relLinks: Array<{ productId: string; relationship: string }> = [];

    for (const product of products) {
      const relationships = inferRelationships(product);
      if (relationships.length > 0) {
        productsWithRels++;
        for (const rel of relationships) {
          relCounts[rel] = (relCounts[rel] || 0) + 1;
          relLinks.push({ productId: product.id, relationship: rel });
          totalRelationships++;
        }
      }

      if (verbose && relationships.length > 0 && productsWithRels <= 10) {
        console.log(`   ${product.title.slice(0, 50)}: [${relationships.join(', ')}]`);
      }
    }
    spinner.succeed(`Inferred ${totalRelationships.toLocaleString()} relationship links for ${productsWithRels.toLocaleString()} products`);

    // Show relationship distribution
    const sortedRels = Object.entries(relCounts).sort((a, b) => b[1] - a[1]);
    console.log('\n  Relationship Distribution:');
    for (const [rel, count] of sortedRels) {
      const pct = ((count / products.length) * 100).toFixed(1);
      console.log(`   ${rel}: ${count.toLocaleString()} products (${pct}%)`);
    }

    const untagged = products.length - productsWithRels;
    console.log(`\n   Tagged: ${productsWithRels.toLocaleString()} (${((productsWithRels / products.length) * 100).toFixed(1)}%)`);
    console.log(`   Untagged: ${untagged.toLocaleString()} (${((untagged / products.length) * 100).toFixed(1)}%)`);

    if (dryRun) {
      console.log('\n  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
      return;
    }

    // Step 5: Remove existing GIFT_FOR_RELATIONSHIP rels (clean slate, batched to avoid OOM)
    spinner.start('Removing old GIFT_FOR_RELATIONSHIP relationships...');
    const session3 = driver.session();
    let deletedTotal = 0;
    while (true) {
      const delResult = await session3.run(`
        MATCH ()-[r:GIFT_FOR_RELATIONSHIP]->()
        WITH r LIMIT 10000
        DELETE r
        RETURN count(r) AS deleted
      `);
      const deleted = delResult.records[0].get('deleted').toNumber ? delResult.records[0].get('deleted').toNumber() : Number(delResult.records[0].get('deleted'));
      deletedTotal += deleted;
      spinner.text = `Removing old GIFT_FOR_RELATIONSHIP relationships... ${deletedTotal.toLocaleString()} deleted`;
      if (deleted === 0) break;
    }
    spinner.succeed(`Removed ${deletedTotal.toLocaleString()} old GIFT_FOR_RELATIONSHIP relationships`);

    // Step 6: Create relationships in batches
    spinner.start(`Creating ${relLinks.length.toLocaleString()} relationship links...`);
    let processed = 0;

    for (let i = 0; i < relLinks.length; i += BATCH_SIZE) {
      const batch = relLinks.slice(i, i + BATCH_SIZE);
      await session3.run(
        `
        UNWIND $links AS link
        MATCH (p:Product {product_url: link.productId})
        MATCH (r:GiftRelationship {name: link.relationship})
        MERGE (p)-[:GIFT_FOR_RELATIONSHIP]->(r)
        `,
        { links: batch }
      );
      processed += batch.length;
      spinner.text = `Creating relationship links... ${processed.toLocaleString()}/${relLinks.length.toLocaleString()}`;
    }
    await session3.close();
    spinner.succeed(`Created ${relLinks.length.toLocaleString()} relationship links`);

    // Step 7: Final stats
    const session4 = driver.session();
    const finalResult = await session4.run(`
      MATCH (r:GiftRelationship)<-[:GIFT_FOR_RELATIONSHIP]-(p:Product)
      RETURN r.name AS relationship, count(p) AS productCount
      ORDER BY productCount DESC
    `);
    await session4.close();

    console.log('\n  Final GIFT_FOR_RELATIONSHIP Distribution:');
    for (const r of finalResult.records) {
      const rel = r.get('relationship');
      const count = r.get('productCount');
      const pct = ((count / products.length) * 100).toFixed(1);
      console.log(`   ${rel}: ${count.toLocaleString()} products (${pct}%)`);
    }

    console.log('\n  Relationship expansion complete!\n');
  } catch (error) {
    spinner.fail('Relationship expansion failed');
    logger.error('Relationship expansion failed', { error });
    throw error;
  } finally {
    await closeNeo4j();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');
const verbose = args.includes('--verbose');

expandRelationshipsMain(dryRun, verbose).catch(console.error);
