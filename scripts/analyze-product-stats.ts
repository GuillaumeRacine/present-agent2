#!/usr/bin/env tsx
/**
 * Product Statistics & Gap Analysis Script
 *
 * Analyzes product distribution across:
 * - Categories, interests, occasions, attributes
 * - Price ranges and budget coverage
 * - Relationship types and demographics
 * - Identifies gaps based on common gift scenarios
 *
 * Usage:
 *   npx tsx scripts/analyze-product-stats.ts [--detailed] [--export]
 */

import dotenv from 'dotenv';
import { initNeo4j, getSession } from '../src/lib/neo4j.js';
import { logger } from '../src/lib/logger.js';
import chalk from 'chalk';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

// Helper to convert Neo4j integers to JS numbers
function toNum(value: any): number {
  if (value && typeof value.toInt === 'function') {
    return value.toInt();
  }
  return Number(value);
}

interface ProductStats {
  totalProducts: number;
  categoryDistribution: Record<string, number>;
  interestDistribution: Record<string, number>;
  occasionDistribution: Record<string, number>;
  attributeDistribution: Record<string, number>;
  priceRanges: {
    under25: number;
    '25-50': number;
    '50-100': number;
    '100-200': number;
    over200: number;
  };
  vendorDistribution: Record<string, number>;
  productsWithoutInterests: number;
  productsWithoutOccasions: number;
  productsWithoutAttributes: number;
}

interface GapAnalysis {
  missingCategories: string[];
  underrepresentedInterests: Array<{ interest: string; count: number; ideal: number }>;
  priceGaps: string[];
  occasionGaps: string[];
  demographicGaps: string[];
}

async function getBasicStats(): Promise<ProductStats> {
  const session = getSession();

  try {
    // Total products
    const totalResult = await session.run('MATCH (p:Product) RETURN count(p) as total');
    const totalProducts = toNum(totalResult.records[0].get('total'));

    console.log(chalk.blue('📊 Gathering product statistics...\n'));

    // Category distribution
    console.log(chalk.gray('  → Analyzing categories...'));
    const categoryResult = await session.run(`
      MATCH (p:Product)
      WHERE p.category_id IS NOT NULL
      RETURN p.category_id as category, count(p) as count
      ORDER BY count DESC
    `);
    const categoryDistribution: Record<string, number> = {};
    categoryResult.records.forEach(record => {
      const category = record.get('category')?.toString() || 'Unknown';
      categoryDistribution[category] = toNum(record.get('count'));
    });

    // Interest distribution
    console.log(chalk.gray('  → Analyzing interests...'));
    const interestResult = await session.run(`
      MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
      RETURN i.name as interest, count(p) as count
      ORDER BY count DESC
    `);
    const interestDistribution: Record<string, number> = {};
    interestResult.records.forEach(record => {
      interestDistribution[record.get('interest')] = toNum(record.get('count'));
    });

    // Occasion distribution
    console.log(chalk.gray('  → Analyzing occasions...'));
    const occasionResult = await session.run(`
      MATCH (p:Product)-[:SUITABLE_FOR]->(o:Occasion)
      RETURN o.name as occasion, count(p) as count
      ORDER BY count DESC
    `);
    const occasionDistribution: Record<string, number> = {};
    occasionResult.records.forEach(record => {
      occasionDistribution[record.get('occasion')] = toNum(record.get('count'));
    });

    // Attribute distribution (attributes are properties, not relationships)
    console.log(chalk.gray('  → Analyzing attributes...'));
    const attributeResult = await session.run(`
      MATCH (p:Product)
      WHERE p.is_practical IS NOT NULL OR p.is_experiential IS NOT NULL OR
            p.is_luxury IS NOT NULL OR p.is_personalized IS NOT NULL OR
            p.is_handmade IS NOT NULL OR p.is_eco_friendly IS NOT NULL OR
            p.is_tech_savvy IS NOT NULL OR p.is_traditional IS NOT NULL OR
            p.is_unique IS NOT NULL OR p.is_collectible IS NOT NULL OR
            p.is_consumable IS NOT NULL OR p.is_decorative IS NOT NULL OR
            p.is_educational IS NOT NULL OR p.is_sentimental IS NOT NULL
      RETURN
        'is_practical' as attribute, sum(CASE WHEN p.is_practical = true THEN 1 ELSE 0 END) as count
      UNION ALL
      MATCH (p:Product) RETURN 'is_experiential' as attribute, sum(CASE WHEN p.is_experiential = true THEN 1 ELSE 0 END) as count
      UNION ALL
      MATCH (p:Product) RETURN 'is_luxury' as attribute, sum(CASE WHEN p.is_luxury = true THEN 1 ELSE 0 END) as count
      UNION ALL
      MATCH (p:Product) RETURN 'is_personalized' as attribute, sum(CASE WHEN p.is_personalized = true THEN 1 ELSE 0 END) as count
      UNION ALL
      MATCH (p:Product) RETURN 'is_handmade' as attribute, sum(CASE WHEN p.is_handmade = true THEN 1 ELSE 0 END) as count
      UNION ALL
      MATCH (p:Product) RETURN 'is_eco_friendly' as attribute, sum(CASE WHEN p.is_eco_friendly = true THEN 1 ELSE 0 END) as count
      ORDER BY count DESC
    `);
    const attributeDistribution: Record<string, number> = {};
    attributeResult.records.forEach(record => {
      const count = toNum(record.get('count'));
      if (count > 0) {
        attributeDistribution[record.get('attribute')] = count;
      }
    });

    // Price ranges
    console.log(chalk.gray('  → Analyzing price ranges...'));
    const priceResult = await session.run(`
      MATCH (p:Product)
      WHERE p.price IS NOT NULL
      WITH p, toFloat(p.price) as priceFloat
      RETURN
        sum(CASE WHEN priceFloat < 25 THEN 1 ELSE 0 END) as under25,
        sum(CASE WHEN priceFloat >= 25 AND priceFloat < 50 THEN 1 ELSE 0 END) as range25_50,
        sum(CASE WHEN priceFloat >= 50 AND priceFloat < 100 THEN 1 ELSE 0 END) as range50_100,
        sum(CASE WHEN priceFloat >= 100 AND priceFloat < 200 THEN 1 ELSE 0 END) as range100_200,
        sum(CASE WHEN priceFloat >= 200 THEN 1 ELSE 0 END) as over200
    `);
    const priceRecord = priceResult.records[0];
    const priceRanges = {
      under25: toNum(priceRecord.get('under25')),
      '25-50': toNum(priceRecord.get('range25_50')),
      '50-100': toNum(priceRecord.get('range50_100')),
      '100-200': toNum(priceRecord.get('range100_200')),
      over200: toNum(priceRecord.get('over200')),
    };

    // Vendor distribution
    console.log(chalk.gray('  → Analyzing vendors...'));
    const vendorResult = await session.run(`
      MATCH (p:Product)
      WHERE p.source_website IS NOT NULL
      RETURN p.source_website as vendor, count(p) as count
      ORDER BY count DESC
      LIMIT 20
    `);
    const vendorDistribution: Record<string, number> = {};
    vendorResult.records.forEach(record => {
      vendorDistribution[record.get('vendor')] = toNum(record.get('count'));
    });

    // Products without connections
    console.log(chalk.gray('  → Finding orphaned products...'));
    const orphanResult = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
      WITH p, count(DISTINCT i) as interests, count(DISTINCT o) as occasions,
           CASE WHEN p.is_practical IS NOT NULL OR p.is_experiential IS NOT NULL OR
                    p.is_luxury IS NOT NULL OR p.is_personalized IS NOT NULL
                THEN 1 ELSE 0 END as hasAttributes
      RETURN
        sum(CASE WHEN interests = 0 THEN 1 ELSE 0 END) as noInterests,
        sum(CASE WHEN occasions = 0 THEN 1 ELSE 0 END) as noOccasions,
        sum(CASE WHEN hasAttributes = 0 THEN 1 ELSE 0 END) as noAttributes
    `);
    const orphanRecord = orphanResult.records[0];

    return {
      totalProducts,
      categoryDistribution,
      interestDistribution,
      occasionDistribution,
      attributeDistribution,
      priceRanges,
      vendorDistribution,
      productsWithoutInterests: toNum(orphanRecord.get('noInterests')),
      productsWithoutOccasions: toNum(orphanRecord.get('noOccasions')),
      productsWithoutAttributes: toNum(orphanRecord.get('noAttributes')),
    };
  } finally {
    await session.close();
  }
}

async function analyzeGaps(stats: ProductStats): Promise<GapAnalysis> {
  const session = getSession();

  try {
    console.log(chalk.blue('\n🔍 Analyzing gaps and opportunities...\n'));

    // Common gift interests that should have good coverage
    const desiredInterests = [
      'cooking', 'coffee', 'tea', 'wine', 'beer', 'spirits',
      'reading', 'books', 'gaming', 'sports', 'fitness', 'yoga',
      'music', 'art', 'photography', 'gardening', 'pets',
      'travel', 'outdoor', 'camping', 'hiking',
      'tech', 'gadgets', 'home_decor', 'fashion',
      'beauty', 'wellness', 'spa', 'self_care'
    ];

    const underrepresentedInterests: Array<{ interest: string; count: number; ideal: number }> = [];
    const minProductsPerInterest = Math.floor(stats.totalProducts * 0.02); // 2% threshold

    for (const interest of desiredInterests) {
      const count = stats.interestDistribution[interest] || 0;
      if (count < minProductsPerInterest) {
        underrepresentedInterests.push({
          interest,
          count,
          ideal: minProductsPerInterest
        });
      }
    }

    // Check for missing common occasions
    const desiredOccasions = [
      'birthday', 'christmas', 'anniversary', 'wedding', 'valentines_day',
      'mothers_day', 'fathers_day', 'graduation', 'housewarming',
      'thank_you', 'get_well', 'congratulations', 'retirement'
    ];

    const occasionGaps: string[] = [];
    const minProductsPerOccasion = Math.floor(stats.totalProducts * 0.05); // 5% threshold

    for (const occasion of desiredOccasions) {
      const count = stats.occasionDistribution[occasion] || 0;
      if (count < minProductsPerOccasion) {
        occasionGaps.push(`${occasion} (${count} products, need ${minProductsPerOccasion})`);
      }
    }

    // Price range gaps
    const priceGaps: string[] = [];
    const totalPriced = Object.values(stats.priceRanges).reduce((a, b) => a + b, 0);
    const idealPercentage = 0.15; // Each range should have at least 15%

    Object.entries(stats.priceRanges).forEach(([range, count]) => {
      const percentage = count / totalPriced;
      if (percentage < idealPercentage) {
        priceGaps.push(`$${range} (${count} products, ${(percentage * 100).toFixed(1)}%)`);
      }
    });

    // Demographic gaps (check for specific age groups and relationships)
    console.log(chalk.gray('  → Checking demographic coverage...'));
    const demographicResult = await session.run(`
      MATCH (p:Product)-[:SUITABLE_FOR]->(i:Interest)
      WITH i.name as interest, count(p) as products
      WHERE products > 10
      RETURN interest
      ORDER BY products DESC
    `);

    const coveredInterests = new Set(demographicResult.records.map(r => r.get('interest')));

    // Identify demographic-specific gaps
    const demographicGaps: string[] = [];
    const ageSpecificInterests = ['toys', 'baby', 'kids', 'teen', 'senior'];
    const relationshipSpecificInterests = ['romantic', 'professional', 'casual'];

    [...ageSpecificInterests, ...relationshipSpecificInterests].forEach(interest => {
      if (!coveredInterests.has(interest) && !stats.interestDistribution[interest]) {
        demographicGaps.push(interest);
      }
    });

    return {
      missingCategories: [],
      underrepresentedInterests,
      priceGaps,
      occasionGaps,
      demographicGaps
    };
  } finally {
    await session.close();
  }
}

function displayStats(stats: ProductStats) {
  console.log(chalk.bold.green('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.bold.green('   PRODUCT DATABASE STATISTICS'));
  console.log(chalk.bold.green('═══════════════════════════════════════════════════════\n'));

  console.log(chalk.bold.cyan('📦 Total Products: ') + chalk.white(stats.totalProducts.toLocaleString()));

  // Price Distribution
  console.log(chalk.bold.yellow('\n💰 Price Distribution:'));
  Object.entries(stats.priceRanges).forEach(([range, count]) => {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(parseFloat(percentage) / 2));
    console.log(`  ${range.padEnd(12)} ${bar} ${chalk.white(count.toLocaleString())} (${percentage}%)`);
  });

  // Top Interests
  console.log(chalk.bold.yellow('\n🎯 Top 15 Interests:'));
  const topInterests = Object.entries(stats.interestDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  topInterests.forEach(([interest, count], idx) => {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${interest.padEnd(20)} ${chalk.white(count.toLocaleString().padStart(6))} (${percentage}%)`);
  });

  // Top Occasions
  console.log(chalk.bold.yellow('\n🎉 Top 10 Occasions:'));
  const topOccasions = Object.entries(stats.occasionDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  topOccasions.forEach(([occasion, count], idx) => {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${occasion.padEnd(20)} ${chalk.white(count.toLocaleString().padStart(6))} (${percentage}%)`);
  });

  // Top Attributes
  console.log(chalk.bold.yellow('\n✨ Top 10 Attributes:'));
  const topAttributes = Object.entries(stats.attributeDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  topAttributes.forEach(([attribute, count], idx) => {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${attribute.padEnd(20)} ${chalk.white(count.toLocaleString().padStart(6))} (${percentage}%)`);
  });

  // Top Vendors
  console.log(chalk.bold.yellow('\n🏪 Top 10 Vendors:'));
  const topVendors = Object.entries(stats.vendorDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  topVendors.forEach(([vendor, count], idx) => {
    const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${vendor.padEnd(30)} ${chalk.white(count.toLocaleString().padStart(6))} (${percentage}%)`);
  });

  // Orphaned Products
  console.log(chalk.bold.yellow('\n⚠️  Products Missing Connections:'));
  console.log(`  Without interests:  ${chalk.white(stats.productsWithoutInterests.toLocaleString())} (${((stats.productsWithoutInterests / stats.totalProducts) * 100).toFixed(1)}%)`);
  console.log(`  Without occasions:  ${chalk.white(stats.productsWithoutOccasions.toLocaleString())} (${((stats.productsWithoutOccasions / stats.totalProducts) * 100).toFixed(1)}%)`);
  console.log(`  Without attributes: ${chalk.white(stats.productsWithoutAttributes.toLocaleString())} (${((stats.productsWithoutAttributes / stats.totalProducts) * 100).toFixed(1)}%)`);
}

function displayGaps(gaps: GapAnalysis) {
  console.log(chalk.bold.red('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.bold.red('   GAP ANALYSIS & OPPORTUNITIES'));
  console.log(chalk.bold.red('═══════════════════════════════════════════════════════\n'));

  // Underrepresented Interests
  if (gaps.underrepresentedInterests.length > 0) {
    console.log(chalk.bold.yellow('🎯 Underrepresented Interests (need more products):'));
    gaps.underrepresentedInterests
      .sort((a, b) => a.count - b.count)
      .slice(0, 20)
      .forEach(({ interest, count, ideal }) => {
        const gap = ideal - count;
        console.log(`  ${interest.padEnd(20)} ${chalk.red(count.toString().padStart(4))} → ${chalk.green(ideal.toString().padStart(4))} (need ${chalk.yellow('+' + gap)})`);
      });
  }

  // Occasion Gaps
  if (gaps.occasionGaps.length > 0) {
    console.log(chalk.bold.yellow('\n🎉 Occasion Coverage Gaps:'));
    gaps.occasionGaps.forEach(gap => {
      console.log(`  ${chalk.red('•')} ${gap}`);
    });
  }

  // Price Range Gaps
  if (gaps.priceGaps.length > 0) {
    console.log(chalk.bold.yellow('\n💰 Price Range Gaps (need more inventory):'));
    gaps.priceGaps.forEach(gap => {
      console.log(`  ${chalk.red('•')} ${gap}`);
    });
  }

  // Demographic Gaps
  if (gaps.demographicGaps.length > 0) {
    console.log(chalk.bold.yellow('\n👥 Demographic Gaps (missing or low):'));
    gaps.demographicGaps.forEach(gap => {
      console.log(`  ${chalk.red('•')} ${gap}`);
    });
  }

  console.log(chalk.bold.green('\n✅ Recommendations:'));
  console.log(chalk.white('  1. Focus on expanding underrepresented interest categories'));
  console.log(chalk.white('  2. Add more products in gap price ranges for better budget coverage'));
  console.log(chalk.white('  3. Ensure major occasions have sufficient product variety'));
  console.log(chalk.white('  4. Consider age-specific and relationship-specific product lines'));
}

async function exportToJson(stats: ProductStats, gaps: GapAnalysis) {
  const outputPath = 'data/product-analysis.json';
  const data = {
    generatedAt: new Date().toISOString(),
    stats,
    gaps,
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(chalk.green(`\n💾 Analysis exported to: ${outputPath}`));
}

async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed');
  const exportData = args.includes('--export');

  try {
    console.log(chalk.bold.cyan('\n🚀 Starting Product Statistics Analysis...\n'));

    await initNeo4j({
      uri: process.env.NEO4J_URI!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const stats = await getBasicStats();
    const gaps = await analyzeGaps(stats);

    displayStats(stats);
    displayGaps(gaps);

    if (exportData) {
      await exportToJson(stats, gaps);
    }

    console.log(chalk.bold.green('\n✨ Analysis complete!\n'));

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Error during analysis:'), error);
    process.exit(1);
  }
}

main();
