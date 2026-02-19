#!/usr/bin/env tsx
/**
 * Attribute Expansion Script
 *
 * Purpose: Tag products with boolean gift attribute flags on their Neo4j nodes.
 * These flags enable archetype-based filtering in the Explorer agent.
 *
 * Current state: 0% coverage — attributes were enriched via LLM but never loaded
 * Expected: 60%+ coverage using heuristic rules (categories + interests + keywords + price)
 *
 * Attributes tagged (14 core attributes for archetype matching):
 *   is_practical, is_luxury, is_consumable, is_experiential, is_sentimental,
 *   is_personalized, is_eco_friendly, is_handcrafted, is_artistic, is_educational,
 *   is_wellness, is_shared, is_lasting_value, is_conversation_starter
 *
 * Usage:
 *   tsx scripts/expand-attributes.ts                    # Dry run
 *   tsx scripts/expand-attributes.ts --live             # Apply changes
 *   tsx scripts/expand-attributes.ts --live --verbose   # Apply with detailed logs
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';

const BATCH_SIZE = 500;

// ============================================================
// Product data loaded from Neo4j
// ============================================================
interface ProductData {
  product_url: string;
  title: string;
  description: string;
  price: number;
  categories: string[];
  interests: string[];
}

// ============================================================
// Attribute inference rules
// ============================================================
// Each attribute has category signals, interest signals, keyword patterns, and price hints.

interface AttributeRule {
  categorySignals?: string[];
  interestSignals?: string[];
  keywords?: RegExp;
  priceMin?: number;      // minimum price for this attribute
  priceMax?: number;      // maximum price for this attribute
  excludeKeywords?: RegExp;
}

const ATTRIBUTE_RULES: Record<string, AttributeRule> = {
  is_practical: {
    categorySignals: [
      'Tools & Hardware', 'Kitchen & Dining', 'Storage & Organization',
      'Office Supplies', 'Cleaning Supplies', 'Travel Accessories',
      'Luggage', 'Backpacks & Bags', 'Water Bottles & Drinkware',
      'Phone Accessories', 'Electronics',
    ],
    interestSignals: ['organizing', 'productivity', 'tech', 'cooking'],
    keywords: /\b(tool|organizer|storage|practical|everyday|utility|functional|essentials|kit|holder|case|container|bag|wallet|keychain|charger|adapter|bottle|mug|thermos|planner|notebook)\b/i,
  },
  is_luxury: {
    categorySignals: [
      'Fine Jewelry', 'Luxury Goods', 'Designer',
    ],
    interestSignals: ['luxury-travel', 'watches', 'wine'],
    keywords: /\b(luxury|luxurious|premium|high-end|deluxe|exclusive|artisan|fine|designer|prestige|opulent|exquisite|handmade leather|cashmere|silk|gold|silver|platinum|diamond)\b/i,
    priceMin: 75,
  },
  is_consumable: {
    categorySignals: [
      'Food & Snacks', 'Coffee & Tea', 'Wine & Spirits', 'Beer & Cider',
      'Chocolate & Candy', 'Candles & Home Fragrance', 'Bath & Body',
      'Skincare', 'Beauty', 'Soap',
    ],
    interestSignals: ['coffee', 'tea', 'wine', 'craft-beer', 'cocktails', 'foodie', 'baking', 'beauty', 'skincare', 'fragrance'],
    keywords: /\b(food|wine|chocolate|coffee|tea|candle|soap|lotion|cream|serum|balm|oil|butter|honey|spice|sauce|jam|syrup|snack|treat|gourmet|edible|bath bomb|body wash|shampoo|conditioner)\b/i,
  },
  is_experiential: {
    categorySignals: [
      'Classes & Workshops', 'Subscriptions',
    ],
    interestSignals: ['adventure-travel', 'concerts', 'theater'],
    keywords: /\b(class|workshop|lesson|course|experience|ticket|subscription|adventure|tour|tasting|retreat|membership)\b/i,
  },
  is_sentimental: {
    interestSignals: ['photography', 'scrapbooking'],
    keywords: /\b(sentimental|keepsake|memory|memories|memorial|remembrance|heritage|heirloom|treasure|cherish|love letter|photo album|memory box|time capsule|baby book)\b/i,
  },
  is_personalized: {
    keywords: /\b(personalized|personalised|custom|customized|customised|monogram|monogrammed|engraved|engraving|bespoke|initial|initials|name plate|custom made|made to order|customizable)\b/i,
  },
  is_eco_friendly: {
    categorySignals: [
      'Sustainable', 'Eco-Friendly', 'Zero Waste', 'Recycled',
    ],
    interestSignals: ['outdoors', 'gardening'],
    keywords: /\b(eco-friendly|eco friendly|sustainable|organic|recycled|upcycled|biodegradable|compostable|zero waste|zero-waste|fair trade|ethically sourced|carbon neutral|plant-based|bamboo|hemp|reclaimed|reusable|solar|renewable)\b/i,
  },
  is_handcrafted: {
    categorySignals: [
      'Handmade', 'Artisan',
    ],
    interestSignals: ['crafts', 'pottery', 'woodworking', 'knitting', 'sewing', 'jewelry-making'],
    keywords: /\b(handcrafted|handmade|hand-crafted|hand-made|hand crafted|hand made|artisan|artisanal|handwoven|hand-woven|hand-painted|hand painted|hand-stitched|hand stitched|hand-thrown|hand thrown|hand-carved|hand carved|handblown|hand-blown)\b/i,
  },
  is_artistic: {
    categorySignals: [
      'Art', 'Wall Art', 'Prints & Posters', 'Sculpture',
    ],
    interestSignals: ['art', 'painting', 'drawing', 'photography', 'pottery'],
    keywords: /\b(art print|artwork|sculpture|canvas|gallery|artistic|painting|illustration|watercolor|abstract|ceramic art|pottery art|fine art|limited edition print|artist|lithograph|etching)\b/i,
  },
  is_educational: {
    categorySignals: [
      'Books', 'Educational', 'Science & Nature',
    ],
    interestSignals: ['reading', 'science', 'history', 'programming', 'professional-development', 'non-fiction'],
    keywords: /\b(educational|learn|learning|book|tutorial|guide|handbook|manual|how-to|how to|stem|science kit|educational toy|puzzle book|workbook|journal prompt)\b/i,
  },
  is_wellness: {
    categorySignals: [
      'Wellness', 'Yoga & Pilates', 'Meditation', 'Self-Care',
      'Aromatherapy', 'Essential Oils',
    ],
    interestSignals: ['yoga', 'pilates', 'wellness', 'meditation', 'fitness', 'skincare'],
    keywords: /\b(wellness|self-care|self care|mindfulness|meditation|yoga|aromatherapy|essential oil|diffuser|massage|relaxation|spa|zen|calm|soothing|therapeutic|healing|holistic|natural remedy)\b/i,
  },
  is_shared: {
    categorySignals: [
      'Board Games', 'Games & Puzzles', 'Party Supplies',
      'Wine & Spirits', 'BBQ & Grilling',
    ],
    interestSignals: ['board-games', 'bbq', 'cocktails', 'cooking', 'wine', 'dancing'],
    keywords: /\b(shared|sharing|together|group|family game|party|gathering|entertaining|host|hosting|for two|couples|date night|game night|dinner party|picnic|potluck)\b/i,
  },
  is_lasting_value: {
    categorySignals: [
      'Furniture', 'Fine Jewelry', 'Watches', 'Tools & Hardware',
      'Kitchen Appliances', 'Leather Goods',
    ],
    interestSignals: ['watches', 'collecting', 'woodworking'],
    keywords: /\b(heirloom|timeless|investment|lasting|durable|lifetime|lifetime warranty|built to last|heritage|classic|enduring|quality craftsmanship|solid wood|solid brass|solid copper|cast iron|stainless steel)\b/i,
    priceMin: 50,
  },
  is_conversation_starter: {
    categorySignals: [
      'Art', 'Novelty', 'Unique Gifts',
    ],
    interestSignals: ['art', 'collecting', 'history', 'science', 'astronomy'],
    keywords: /\b(unique|unusual|one-of-a-kind|one of a kind|rare|quirky|novelty|conversation piece|statement|distinctive|remarkable|extraordinary|curiosity|curious|whimsical|unexpected)\b/i,
  },
};

// ============================================================
// Inference logic
// ============================================================

function inferAttributes(product: ProductData): Record<string, boolean> {
  const attrs: Record<string, boolean> = {};
  const text = `${product.title} ${product.description || ''}`.toLowerCase();

  for (const [attrName, rule] of Object.entries(ATTRIBUTE_RULES)) {
    let match = false;

    // Check category signals
    if (rule.categorySignals) {
      for (const cat of product.categories) {
        if (rule.categorySignals.some(sig => cat.toLowerCase().includes(sig.toLowerCase()))) {
          match = true;
          break;
        }
      }
    }

    // Check interest signals
    if (!match && rule.interestSignals) {
      for (const interest of product.interests) {
        if (rule.interestSignals.includes(interest)) {
          match = true;
          break;
        }
      }
    }

    // Check keyword patterns
    if (!match && rule.keywords) {
      match = rule.keywords.test(text);
    }

    // Price-based filtering (only applies as an additional requirement for is_luxury / is_lasting_value)
    if (match && rule.priceMin && product.price < rule.priceMin) {
      match = false;
    }
    if (match && rule.priceMax && product.price > rule.priceMax) {
      match = false;
    }

    // Exclude check
    if (match && rule.excludeKeywords) {
      if (rule.excludeKeywords.test(text)) {
        match = false;
      }
    }

    if (match) {
      attrs[attrName] = true;
    }
  }

  return attrs;
}

// ============================================================
// Main script
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const isVerbose = args.includes('--verbose');
  const spinner = ora();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            Attribute Expansion                                 ║
║                                                                ║
║  Tag products with boolean gift attribute flags                ║
║  using 14 attribute rules with category/interest/keyword       ║
║  heuristics                                                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Mode: ${isLive ? 'LIVE (will modify database)' : 'DRY RUN (no changes)'}
${!isLive ? '\nUse --live flag to apply changes' : ''}
`);

  // Connect
  spinner.start('Connecting to Neo4j...');
  await initNeo4j({
    uri: process.env.NEO4J_URI || process.env.NEO4J_URL || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  spinner.succeed('Connected to Neo4j');

  const driver = getDriver();
  const session = driver.session();

  try {
    // Check current attribute state
    spinner.start('Checking current attribute state...');
    const currentResult = await session.run(`
      MATCH (p:Product)
      WHERE p.is_practical IS NOT NULL
      RETURN count(p) AS with_attrs
    `);
    const currentCount = currentResult.records[0]?.get('with_attrs')?.toNumber?.() ||
      Number(currentResult.records[0]?.get('with_attrs')) || 0;
    spinner.succeed(`Current products with attributes: ${currentCount}`);

    // Load all products with categories and interests
    spinner.start('Loading products with categories and interests...');
    const result = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      RETURN p.product_url AS product_url,
             p.title AS title,
             COALESCE(p.description, '') AS description,
             COALESCE(p.price, 0) AS price,
             COLLECT(DISTINCT c.name) AS categories,
             COLLECT(DISTINCT i.name) AS interests
    `);

    const products: ProductData[] = result.records.map(r => ({
      product_url: r.get('product_url'),
      title: r.get('title'),
      description: r.get('description'),
      price: typeof r.get('price') === 'number' ? r.get('price') : parseFloat(r.get('price')) || 0,
      categories: r.get('categories').filter((c: any) => c != null),
      interests: r.get('interests').filter((i: any) => i != null),
    }));
    spinner.succeed(`Loaded ${products.length} products`);

    // Infer attributes for each product
    spinner.start('Inferring attributes...');
    const attrCounts: Record<string, number> = {};
    const batchData: Array<{ product_url: string; attrs: Record<string, boolean> }> = [];
    let taggedCount = 0;

    for (const product of products) {
      const attrs = inferAttributes(product);
      const attrKeys = Object.keys(attrs);

      if (attrKeys.length > 0) {
        taggedCount++;
        batchData.push({ product_url: product.product_url, attrs });

        for (const key of attrKeys) {
          attrCounts[key] = (attrCounts[key] || 0) + 1;
        }

        if (isVerbose && taggedCount <= 5) {
          console.log(`  ${product.title.substring(0, 60)} → [${attrKeys.join(', ')}]`);
        }
      }
    }

    const totalAttrs = Object.values(attrCounts).reduce((s, c) => s + c, 0);
    spinner.succeed(`Inferred ${totalAttrs} attribute flags for ${taggedCount} products (${(taggedCount / products.length * 100).toFixed(1)}%)`);

    // Show distribution
    console.log('\n  Attribute Distribution:');
    const sortedAttrs = Object.entries(attrCounts).sort((a, b) => b[1] - a[1]);
    for (const [attr, count] of sortedAttrs) {
      console.log(`   ${attr}: ${count.toLocaleString()} products (${(count / products.length * 100).toFixed(1)}%)`);
    }
    console.log(`\n   Tagged: ${taggedCount} (${(taggedCount / products.length * 100).toFixed(1)}%)`);
    console.log(`   Untagged: ${products.length - taggedCount} (${((products.length - taggedCount) / products.length * 100).toFixed(1)}%)`);

    if (!isLive) {
      console.log('\n  This was a DRY RUN. No changes were made to the database.');
      console.log('Run with --live flag to apply changes.\n');
    } else {
      // Write attributes to Neo4j in batches
      spinner.start(`Writing ${totalAttrs} attribute flags to Neo4j...`);

      // Build SET clauses for all 14 attributes
      const attrNames = Object.keys(ATTRIBUTE_RULES);

      for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
        const batch = batchData.slice(i, i + BATCH_SIZE);

        // Transform batch into rows with all attribute values
        const rows = batch.map(item => {
          const row: Record<string, any> = { product_url: item.product_url };
          for (const attr of attrNames) {
            row[attr] = item.attrs[attr] || false;
          }
          return row;
        });

        await session.run(`
          UNWIND $rows AS row
          MATCH (p:Product {product_url: row.product_url})
          SET p.is_practical = row.is_practical,
              p.is_luxury = row.is_luxury,
              p.is_consumable = row.is_consumable,
              p.is_experiential = row.is_experiential,
              p.is_sentimental = row.is_sentimental,
              p.is_personalized = row.is_personalized,
              p.is_eco_friendly = row.is_eco_friendly,
              p.is_handcrafted = row.is_handcrafted,
              p.is_artistic = row.is_artistic,
              p.is_educational = row.is_educational,
              p.is_wellness = row.is_wellness,
              p.is_shared = row.is_shared,
              p.is_lasting_value = row.is_lasting_value,
              p.is_conversation_starter = row.is_conversation_starter
        `, { rows });

        if (isVerbose) {
          console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(batchData.length / BATCH_SIZE)}: ${batch.length} products`);
        }
      }

      spinner.succeed(`Wrote ${totalAttrs} attribute flags to ${taggedCount} products`);

      // Verify
      spinner.start('Verifying...');
      const verifyResult = await session.run(`
        MATCH (p:Product)
        WHERE p.is_practical = true OR p.is_luxury = true OR p.is_consumable = true OR
              p.is_experiential = true OR p.is_sentimental = true OR p.is_personalized = true OR
              p.is_eco_friendly = true OR p.is_handcrafted = true OR p.is_artistic = true OR
              p.is_educational = true OR p.is_wellness = true OR p.is_shared = true OR
              p.is_lasting_value = true OR p.is_conversation_starter = true
        RETURN count(p) AS total
      `);
      const verifiedCount = verifyResult.records[0]?.get('total')?.toNumber?.() ||
        Number(verifyResult.records[0]?.get('total')) || 0;
      spinner.succeed(`Verified: ${verifiedCount} products have at least one attribute flag`);

      console.log('\n  Attribute expansion complete!\n');
    }
  } catch (error) {
    spinner.fail('Attribute expansion failed');
    logger.error('Attribute expansion failed', { error });
    throw error;
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
