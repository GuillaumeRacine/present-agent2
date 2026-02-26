#!/usr/bin/env tsx
/**
 * Enrich Gift Cards — Targeted enrichment for gift card products only
 *
 * Instead of running the full expand-* scripts over 133K+ products,
 * this script enriches only the 75 gift card products with:
 * - Interest links (based on title/description keyword matching + manual mappings)
 * - Category links (from categories_raw field)
 * - Occasion links (gift cards are good for most occasions)
 * - Relationship links (gift cards are appropriate for most relationships)
 * - Attribute flags (is_practical, is_experiential, etc.)
 *
 * Usage:
 *   npx tsx scripts/pipeline/enrich_gift_cards.ts              # Dry run
 *   npx tsx scripts/pipeline/enrich_gift_cards.ts --live        # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../../src/lib/neo4j.js';

const LIVE = process.argv.includes('--live');

// Manual interest mappings for gift card brands
const BRAND_INTEREST_MAP: Record<string, string[]> = {
  // Mega-retailers
  'amazon': ['shopping'],
  'visa': ['shopping'],
  'target': ['shopping'],
  'walmart': ['shopping'],
  'costco': ['shopping'],
  'ebay': ['shopping', 'collecting'],
  'etsy': ['crafts', 'art', 'shopping', 'handmade'],
  'home depot': ['home improvement', 'gardening', 'DIY'],

  // Food & Dining
  'starbucks': ['coffee', 'tea'],
  'doordash': ['food', 'cooking'],
  'uber eats': ['food', 'cooking'],
  'grubhub': ['food', 'cooking'],
  'chipotle': ['food', 'cooking'],
  'panera': ['food', 'cooking'],
  'whole foods': ['food', 'cooking', 'wellness'],
  'hellofresh': ['food', 'cooking'],

  // Entertainment
  'netflix': ['movies', 'TV'],
  'spotify': ['music'],
  'steam': ['gaming', 'video games'],
  'playstation': ['gaming', 'video games'],
  'xbox': ['gaming', 'video games'],
  'nintendo': ['gaming', 'video games'],
  'disney+': ['movies', 'TV'],
  'hulu': ['movies', 'TV'],

  // Fashion & Beauty
  'sephora': ['beauty', 'skincare', 'makeup'],
  'nike': ['fitness', 'sports', 'running'],
  'lululemon': ['yoga', 'fitness'],
  'nordstrom': ['fashion', 'shopping'],
  'zara': ['fashion', 'shopping'],
  'h&m': ['fashion', 'shopping'],
  'ulta': ['beauty', 'skincare', 'makeup'],
  'adidas': ['fitness', 'sports', 'running'],

  // Home & Living
  'ikea': ['home decor', 'home improvement'],
  'williams sonoma': ['cooking', 'home decor'],
  'crate': ['home decor'],
  'pottery barn': ['home decor'],
  'wayfair': ['home decor', 'home improvement'],
  'bed bath': ['home decor'],
  'west elm': ['home decor'],

  // Books & Learning
  'audible': ['reading', 'books', 'audiobooks'],
  'masterclass': ['education', 'learning'],
  'kindle': ['reading', 'books'],
  'barnes': ['reading', 'books'],
  'skillshare': ['education', 'learning', 'art', 'crafts'],
  'coursera': ['education', 'learning'],
  'udemy': ['education', 'learning'],

  // Travel & Experiences
  'airbnb': ['travel'],
  'ticketmaster': ['music', 'concerts', 'sports', 'entertainment'],
  'hotels.com': ['travel'],
  'southwest': ['travel'],
  'delta': ['travel'],
  'stubhub': ['music', 'concerts', 'sports', 'entertainment'],
  'lyft': ['travel'],
  'uber gift': ['travel'],

  // Tech & Electronics
  'best buy': ['technology', 'electronics', 'gaming'],
  'apple': ['technology', 'electronics', 'music'],
  'google play': ['technology', 'gaming', 'music', 'movies'],
  'microsoft': ['technology', 'gaming'],
  'samsung': ['technology', 'electronics'],
  'b&h': ['photography', 'technology', 'electronics'],
  'newegg': ['technology', 'electronics', 'gaming'],

  // Wellness & Fitness
  'spafinder': ['wellness', 'spa', 'relaxation'],
  'classpass': ['fitness', 'wellness', 'yoga'],
  'peloton': ['fitness', 'cycling'],
  'lululemon studio': ['yoga', 'fitness'],
  'gnc': ['fitness', 'wellness', 'nutrition'],
  'vitamix': ['cooking', 'wellness', 'nutrition'],
  'therabody': ['fitness', 'wellness', 'recovery'],

  // Specialty & Niche
  'chewy': ['pets'],
  'patagonia': ['outdoor', 'hiking', 'sustainability'],
  'rei': ['outdoor', 'hiking', 'camping', 'cycling'],
  'build-a-bear': ['toys', 'kids'],
  'gamestop': ['gaming', 'video games'],
  'sephora collection': ['beauty', 'skincare', 'makeup'],
  'yankee candle': ['home decor', 'relaxation'],
};

// Category mappings
const BRAND_CATEGORY_MAP: Record<string, string[]> = {
  'amazon': ['Gift Cards'],
  'starbucks': ['Food & Beverage', 'Gift Cards'],
  'netflix': ['Entertainment', 'Gift Cards'],
  'spotify': ['Entertainment', 'Music', 'Gift Cards'],
  'steam': ['Entertainment', 'Gaming', 'Gift Cards'],
  'playstation': ['Entertainment', 'Gaming', 'Gift Cards'],
  'xbox': ['Entertainment', 'Gaming', 'Gift Cards'],
  'nintendo': ['Entertainment', 'Gaming', 'Gift Cards'],
  'sephora': ['Beauty & Personal Care', 'Gift Cards'],
  'nike': ['Sports & Outdoors', 'Fashion', 'Gift Cards'],
  'lululemon': ['Sports & Outdoors', 'Fashion', 'Gift Cards'],
  'ikea': ['Home & Kitchen', 'Gift Cards'],
  'audible': ['Books & Media', 'Gift Cards'],
  'airbnb': ['Travel', 'Gift Cards'],
  'best buy': ['Electronics', 'Gift Cards'],
  'apple': ['Electronics', 'Gift Cards'],
  'chewy': ['Pets', 'Gift Cards'],
  'rei': ['Sports & Outdoors', 'Gift Cards'],
  'patagonia': ['Sports & Outdoors', 'Fashion', 'Gift Cards'],
};

// Gift cards are suitable for virtually all occasions
const UNIVERSAL_OCCASIONS = [
  'birthday', 'christmas', 'valentines_day', 'mothers_day', 'fathers_day',
  'graduation', 'wedding', 'housewarming', 'thank_you', 'just_because',
  'anniversary', 'baby_shower', 'retirement', 'get_well', 'holiday',
];

// Gift cards work for all relationship types
const UNIVERSAL_RELATIONSHIPS = [
  'friend', 'mother', 'father', 'sister', 'brother', 'wife', 'husband',
  'partner', 'daughter', 'son', 'coworker', 'boss', 'teacher',
  'grandparent', 'aunt_uncle', 'niece_nephew', 'neighbor', 'children',
];

// Gift card attribute flags
const GIFT_CARD_ATTRIBUTES = {
  is_practical: true,
  is_luxury: false,
  is_consumable: false,
  is_experiential: false,
  is_sentimental: false,
  is_personalized: false,
  is_eco_friendly: false,
  is_handcrafted: false,
  is_artistic: false,
  is_educational: false,
  is_wellness: false,
  is_shared: false,
  is_lasting_value: false,
  is_conversation_starter: false,
};

// Overrides for specific categories
const ATTRIBUTE_OVERRIDES: Record<string, Partial<typeof GIFT_CARD_ATTRIBUTES>> = {
  'Entertainment': { is_experiential: true },
  'Travel': { is_experiential: true },
  'Wellness': { is_wellness: true },
  'Books & Learning': { is_educational: true },
  'Food & Dining': { is_consumable: true },
  'Fashion & Beauty': { is_luxury: true },
  'Specialty': { is_personalized: true },
};

function matchBrand(title: string): string[] {
  const lower = title.toLowerCase();
  const matched: string[] = [];
  for (const brand of Object.keys(BRAND_INTEREST_MAP)) {
    if (lower.includes(brand.toLowerCase())) {
      matched.push(brand);
    }
  }
  return matched;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ENRICH GIFT CARDS ${LIVE ? '(LIVE)' : '(DRY RUN)'}`);
  console.log(`${'='.repeat(60)}\n`);

  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  const driver = getDriver();
  const session = driver.session();

  try {
    // Fetch all gift card products
    const result = await session.run(`
      MATCH (p:Product) WHERE p.source = 'gift_card_manual'
      RETURN p.product_url AS url, p.title AS title, p.description AS desc,
             p.tags AS tags, p.categories AS categories
    `);

    const products = result.records.map(r => ({
      url: r.get('url') as string,
      title: r.get('title') as string,
      desc: r.get('desc') as string,
      tags: r.get('tags') as string,
      categories: r.get('categories') as string,
    }));

    console.log(`Found ${products.length} gift card products\n`);

    // Get available interest names in DB
    const interestResult = await session.run('MATCH (i:Interest) RETURN i.name AS name');
    const availableInterests = new Set(interestResult.records.map(r => r.get('name') as string));

    // Get available category names in DB
    const categoryResult = await session.run('MATCH (c:Category) RETURN c.name AS name');
    const availableCategories = new Set(categoryResult.records.map(r => r.get('name') as string));

    // Get available occasion names in DB
    const occasionResult = await session.run('MATCH (o:GiftOccasion) RETURN o.name AS name');
    const availableOccasions = new Set(occasionResult.records.map(r => r.get('name') as string));

    // Get available relationship names in DB
    const relResult = await session.run('MATCH (r:GiftRelationship) RETURN r.name AS name');
    const availableRelationships = new Set(relResult.records.map(r => r.get('name') as string));

    console.log(`Available: ${availableInterests.size} interests, ${availableCategories.size} categories, ${availableOccasions.size} occasions, ${availableRelationships.size} relationships\n`);

    let totalInterestLinks = 0;
    let totalCategoryLinks = 0;
    let totalOccasionLinks = 0;
    let totalRelationshipLinks = 0;
    let totalAttributeUpdates = 0;

    for (const product of products) {
      const brands = matchBrand(product.title);

      // 1. Interest links
      const interests = new Set<string>();
      for (const brand of brands) {
        const brandInterests = BRAND_INTEREST_MAP[brand] || [];
        for (const interest of brandInterests) {
          if (availableInterests.has(interest)) {
            interests.add(interest);
          }
        }
      }
      // Also check description for additional interest keywords
      const descLower = (product.desc + ' ' + product.tags).toLowerCase();
      for (const interest of availableInterests) {
        if (descLower.includes(interest.toLowerCase()) && !interests.has(interest)) {
          interests.add(interest);
        }
      }

      if (LIVE && interests.size > 0) {
        for (const interest of interests) {
          await session.run(`
            MATCH (p:Product {product_url: $url})
            MATCH (i:Interest {name: $interest})
            MERGE (p)-[r:MATCHES_INTEREST]->(i)
            ON CREATE SET r.relevance_score = 0.85
          `, { url: product.url, interest });
        }
      }
      totalInterestLinks += interests.size;

      // 2. Category links
      const categories = new Set<string>();
      // From brand mapping
      for (const brand of brands) {
        const brandCats = BRAND_CATEGORY_MAP[brand] || [];
        for (const cat of brandCats) {
          if (availableCategories.has(cat)) categories.add(cat);
        }
      }
      // From product categories field
      if (product.categories) {
        for (const cat of product.categories.split(',').map(c => c.trim())) {
          if (availableCategories.has(cat)) categories.add(cat);
        }
      }

      if (LIVE && categories.size > 0) {
        for (const cat of categories) {
          await session.run(`
            MATCH (p:Product {product_url: $url})
            MATCH (c:Category {name: $cat})
            MERGE (p)-[:IN_CATEGORY]->(c)
          `, { url: product.url, cat });
        }
      }
      totalCategoryLinks += categories.size;

      // 3. Occasion links — gift cards are universal
      const occasions = UNIVERSAL_OCCASIONS.filter(o => availableOccasions.has(o));
      if (LIVE && occasions.length > 0) {
        for (const occ of occasions) {
          await session.run(`
            MATCH (p:Product {product_url: $url})
            MATCH (o:GiftOccasion {name: $occ})
            MERGE (p)-[:GIFT_FOR_OCCASION]->(o)
          `, { url: product.url, occ });
        }
      }
      totalOccasionLinks += occasions.length;

      // 4. Relationship links — gift cards work for everyone
      const relationships = UNIVERSAL_RELATIONSHIPS.filter(r => availableRelationships.has(r));
      if (LIVE && relationships.length > 0) {
        for (const rel of relationships) {
          await session.run(`
            MATCH (p:Product {product_url: $url})
            MATCH (r:GiftRelationship {name: $rel})
            MERGE (p)-[:GIFT_FOR_RELATIONSHIP]->(r)
          `, { url: product.url, rel });
        }
      }
      totalRelationshipLinks += relationships.length;

      // 5. Attribute flags
      const attrs = { ...GIFT_CARD_ATTRIBUTES };
      // Apply category-specific overrides
      const categoryStr = product.categories || '';
      for (const [catKey, overrides] of Object.entries(ATTRIBUTE_OVERRIDES)) {
        if (categoryStr.includes(catKey) || product.title.toLowerCase().includes(catKey.toLowerCase())) {
          Object.assign(attrs, overrides);
        }
      }

      if (LIVE) {
        await session.run(`
          MATCH (p:Product {product_url: $url})
          SET p.is_practical = $is_practical,
              p.is_luxury = $is_luxury,
              p.is_consumable = $is_consumable,
              p.is_experiential = $is_experiential,
              p.is_sentimental = $is_sentimental,
              p.is_personalized = $is_personalized,
              p.is_eco_friendly = $is_eco_friendly,
              p.is_handcrafted = $is_handcrafted,
              p.is_artistic = $is_artistic,
              p.is_educational = $is_educational,
              p.is_wellness = $is_wellness,
              p.is_shared = $is_shared,
              p.is_lasting_value = $is_lasting_value,
              p.is_conversation_starter = $is_conversation_starter
        `, { url: product.url, ...attrs });
        totalAttributeUpdates++;
      }

      console.log(`  ${product.title}: ${interests.size}I ${categories.size}C ${occasions.length}O ${relationships.length}R`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  SUMMARY ${LIVE ? '(APPLIED)' : '(DRY RUN)'}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  Interest links: ${totalInterestLinks}`);
    console.log(`  Category links: ${totalCategoryLinks}`);
    console.log(`  Occasion links: ${totalOccasionLinks}`);
    console.log(`  Relationship links: ${totalRelationshipLinks}`);
    console.log(`  Attribute updates: ${totalAttributeUpdates}`);

    if (!LIVE) {
      console.log(`\nDry run complete. Use --live to apply changes.`);
    } else {
      // Verification
      const verifyResult = await session.run(`
        MATCH (p:Product) WHERE p.source = 'gift_card_manual'
        OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
        OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
        OPTIONAL MATCH (p)-[:GIFT_FOR_OCCASION]->(o:GiftOccasion)
        OPTIONAL MATCH (p)-[:GIFT_FOR_RELATIONSHIP]->(r:GiftRelationship)
        RETURN count(DISTINCT p) AS products,
               count(DISTINCT i) AS uniqueInterests,
               count(DISTINCT c) AS uniqueCategories,
               count(DISTINCT o) AS uniqueOccasions,
               count(DISTINCT r) AS uniqueRelationships
      `);
      const v = verifyResult.records[0];
      console.log(`\nVerification:`);
      console.log(`  Products: ${v.get('products')}`);
      console.log(`  Unique interests linked: ${v.get('uniqueInterests')}`);
      console.log(`  Unique categories linked: ${v.get('uniqueCategories')}`);
      console.log(`  Unique occasions linked: ${v.get('uniqueOccasions')}`);
      console.log(`  Unique relationships linked: ${v.get('uniqueRelationships')}`);
    }

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
