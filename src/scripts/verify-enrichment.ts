#!/usr/bin/env tsx
/**
 * Enrichment Verification Script
 *
 * Verifies that product enrichment data is properly stored in Neo4j
 * and measures coverage across:
 * - Interests (MATCHES_INTEREST relationships)
 * - Occasions (SUITABLE_FOR relationships)
 * - Gift attributes (product properties)
 *
 * Usage:
 *   npx tsx scripts/verify-enrichment.ts [--detailed]
 */

import dotenv from 'dotenv';
import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

// Helper to convert Neo4j integers to JS numbers
function toNum(value: any): number {
  if (value && typeof value.toInt === 'function') {
    return value.toInt();
  }
  return Number(value);
}

interface EnrichmentStats {
  totalProducts: number;
  productsWithInterests: number;
  productsWithOccasions: number;
  productsWithAttributes: number;
  avgInterestsPerProduct: number;
  avgOccasionsPerProduct: number;
  totalInterests: number;
  totalOccasions: number;
  attributeBreakdown: {
    is_practical: number;
    is_experiential: number;
    is_luxury: number;
    is_personalized: number;
    is_handmade: number;
    is_eco_friendly: number;
    is_tech_savvy: number;
    is_traditional: number;
    is_unique: number;
    is_collectible: number;
    is_consumable: number;
    is_decorative: number;
    is_educational: number;
    is_sentimental: number;
  };
  sampleEnrichedProducts: Array<{
    id: string;
    title: string;
    price: number;
    interests: string[];
    occasions: string[];
    attributes: Record<string, boolean>;
  }>;
}

async function getEnrichmentStats(detailed: boolean): Promise<EnrichmentStats> {
  const session = getSession();

  try {
    console.log(chalk.blue('📊 Gathering enrichment statistics...\n'));

    // 1. Total products
    console.log(chalk.gray('  → Counting total products...'));
    const totalResult = await session.run('MATCH (p:Product) RETURN count(p) as total');
    const totalProducts = toNum(totalResult.records[0].get('total'));

    // 2. Products with interests
    console.log(chalk.gray('  → Checking interest coverage...'));
    const interestResult = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      WITH p, count(DISTINCT i) as interestCount
      RETURN
        count(CASE WHEN interestCount > 0 THEN 1 END) as withInterests,
        sum(interestCount) as totalInterests,
        avg(toFloat(interestCount)) as avgInterests
    `);
    const interestRecord = interestResult.records[0];
    const productsWithInterests = toNum(interestRecord.get('withInterests'));
    const totalInterests = toNum(interestRecord.get('totalInterests'));
    const avgInterestsPerProduct = interestRecord.get('avgInterests') || 0;

    // 3. Products with occasions
    console.log(chalk.gray('  → Checking occasion coverage...'));
    const occasionResult = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
      WITH p, count(DISTINCT o) as occasionCount
      RETURN
        count(CASE WHEN occasionCount > 0 THEN 1 END) as withOccasions,
        sum(occasionCount) as totalOccasions,
        avg(toFloat(occasionCount)) as avgOccasions
    `);
    const occasionRecord = occasionResult.records[0];
    const productsWithOccasions = toNum(occasionRecord.get('withOccasions'));
    const totalOccasions = toNum(occasionRecord.get('totalOccasions'));
    const avgOccasionsPerProduct = occasionRecord.get('avgOccasions') || 0;

    // 4. Products with gift attributes
    console.log(chalk.gray('  → Checking gift attribute coverage...'));
    const attributeResult = await session.run(`
      MATCH (p:Product)
      WHERE p.is_practical IS NOT NULL OR p.is_experiential IS NOT NULL OR
            p.is_luxury IS NOT NULL OR p.is_personalized IS NOT NULL OR
            p.is_handmade IS NOT NULL OR p.is_eco_friendly IS NOT NULL OR
            p.is_tech_savvy IS NOT NULL OR p.is_traditional IS NOT NULL OR
            p.is_unique IS NOT NULL OR p.is_collectible IS NOT NULL OR
            p.is_consumable IS NOT NULL OR p.is_decorative IS NOT NULL OR
            p.is_educational IS NOT NULL OR p.is_sentimental IS NOT NULL
      RETURN count(p) as withAttributes
    `);
    const productsWithAttributes = toNum(attributeResult.records[0].get('withAttributes'));

    // 5. Detailed attribute breakdown
    console.log(chalk.gray('  → Analyzing individual attributes...'));
    const attributeBreakdownResult = await session.run(`
      MATCH (p:Product)
      RETURN
        sum(CASE WHEN p.is_practical = true THEN 1 ELSE 0 END) as is_practical,
        sum(CASE WHEN p.is_experiential = true THEN 1 ELSE 0 END) as is_experiential,
        sum(CASE WHEN p.is_luxury = true THEN 1 ELSE 0 END) as is_luxury,
        sum(CASE WHEN p.is_personalized = true THEN 1 ELSE 0 END) as is_personalized,
        sum(CASE WHEN p.is_handmade = true THEN 1 ELSE 0 END) as is_handmade,
        sum(CASE WHEN p.is_eco_friendly = true THEN 1 ELSE 0 END) as is_eco_friendly,
        sum(CASE WHEN p.is_tech_savvy = true THEN 1 ELSE 0 END) as is_tech_savvy,
        sum(CASE WHEN p.is_traditional = true THEN 1 ELSE 0 END) as is_traditional,
        sum(CASE WHEN p.is_unique = true THEN 1 ELSE 0 END) as is_unique,
        sum(CASE WHEN p.is_collectible = true THEN 1 ELSE 0 END) as is_collectible,
        sum(CASE WHEN p.is_consumable = true THEN 1 ELSE 0 END) as is_consumable,
        sum(CASE WHEN p.is_decorative = true THEN 1 ELSE 0 END) as is_decorative,
        sum(CASE WHEN p.is_educational = true THEN 1 ELSE 0 END) as is_educational,
        sum(CASE WHEN p.is_sentimental = true THEN 1 ELSE 0 END) as is_sentimental
    `);
    const attrRecord = attributeBreakdownResult.records[0];
    const attributeBreakdown = {
      is_practical: toNum(attrRecord.get('is_practical')),
      is_experiential: toNum(attrRecord.get('is_experiential')),
      is_luxury: toNum(attrRecord.get('is_luxury')),
      is_personalized: toNum(attrRecord.get('is_personalized')),
      is_handmade: toNum(attrRecord.get('is_handmade')),
      is_eco_friendly: toNum(attrRecord.get('is_eco_friendly')),
      is_tech_savvy: toNum(attrRecord.get('is_tech_savvy')),
      is_traditional: toNum(attrRecord.get('is_traditional')),
      is_unique: toNum(attrRecord.get('is_unique')),
      is_collectible: toNum(attrRecord.get('is_collectible')),
      is_consumable: toNum(attrRecord.get('is_consumable')),
      is_decorative: toNum(attrRecord.get('is_decorative')),
      is_educational: toNum(attrRecord.get('is_educational')),
      is_sentimental: toNum(attrRecord.get('is_sentimental')),
    };

    // 6. Sample enriched products
    console.log(chalk.gray('  → Sampling enriched products...'));
    const sampleResult = await session.run(`
      MATCH (p:Product)
      WHERE exists((p)-[:MATCHES_INTEREST]->())
        OR exists((p)-[:SUITABLE_FOR]->())
        OR p.is_practical IS NOT NULL
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
      WITH p,
           collect(DISTINCT i.name) as interests,
           collect(DISTINCT o.name) as occasions
      WHERE size(interests) > 0 OR size(occasions) > 0
      RETURN p.id as id,
             p.title as title,
             p.price as price,
             interests,
             occasions,
             p.is_practical as is_practical,
             p.is_experiential as is_experiential,
             p.is_luxury as is_luxury,
             p.is_personalized as is_personalized,
             p.is_handmade as is_handmade,
             p.is_eco_friendly as is_eco_friendly,
             p.is_tech_savvy as is_tech_savvy,
             p.is_traditional as is_traditional,
             p.is_unique as is_unique,
             p.is_collectible as is_collectible,
             p.is_consumable as is_consumable,
             p.is_decorative as is_decorative,
             p.is_educational as is_educational,
             p.is_sentimental as is_sentimental
      ORDER BY size(interests) DESC, size(occasions) DESC
      LIMIT 5
    `);

    const sampleEnrichedProducts = sampleResult.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      price: toNum(record.get('price')),
      interests: record.get('interests').filter((i: any) => i),
      occasions: record.get('occasions').filter((o: any) => o),
      attributes: {
        is_practical: record.get('is_practical') === true,
        is_experiential: record.get('is_experiential') === true,
        is_luxury: record.get('is_luxury') === true,
        is_personalized: record.get('is_personalized') === true,
        is_handmade: record.get('is_handmade') === true,
        is_eco_friendly: record.get('is_eco_friendly') === true,
        is_tech_savvy: record.get('is_tech_savvy') === true,
        is_traditional: record.get('is_traditional') === true,
        is_unique: record.get('is_unique') === true,
        is_collectible: record.get('is_collectible') === true,
        is_consumable: record.get('is_consumable') === true,
        is_decorative: record.get('is_decorative') === true,
        is_educational: record.get('is_educational') === true,
        is_sentimental: record.get('is_sentimental') === true,
      },
    }));

    return {
      totalProducts,
      productsWithInterests,
      productsWithOccasions,
      productsWithAttributes,
      avgInterestsPerProduct,
      avgOccasionsPerProduct,
      totalInterests,
      totalOccasions,
      attributeBreakdown,
      sampleEnrichedProducts,
    };
  } finally {
    await session.close();
  }
}

function calculateCoverage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function getStatusColor(percentage: number): (str: string) => string {
  if (percentage >= 80) return chalk.green;
  if (percentage >= 50) return chalk.yellow;
  return chalk.red;
}

function displayStats(stats: EnrichmentStats) {
  console.log(chalk.bold.green('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.bold.green('   ENRICHMENT VERIFICATION REPORT'));
  console.log(chalk.bold.green('═══════════════════════════════════════════════════════\n'));

  console.log(chalk.bold.cyan('📦 Database Overview:'));
  console.log(`  Total Products: ${chalk.white(stats.totalProducts.toLocaleString())}`);
  console.log();

  // Coverage percentages
  const interestCoverage = calculateCoverage(stats.productsWithInterests, stats.totalProducts);
  const occasionCoverage = calculateCoverage(stats.productsWithOccasions, stats.totalProducts);
  const attributeCoverage = calculateCoverage(stats.productsWithAttributes, stats.totalProducts);

  console.log(chalk.bold.yellow('🎯 Enrichment Coverage:'));

  const interestColor = getStatusColor(interestCoverage);
  console.log(`  Products with Interests:  ${interestColor(stats.productsWithInterests.toLocaleString().padStart(8))} / ${stats.totalProducts.toLocaleString()} (${interestColor(interestCoverage.toFixed(1) + '%').padStart(6)})`);

  const occasionColor = getStatusColor(occasionCoverage);
  console.log(`  Products with Occasions:  ${occasionColor(stats.productsWithOccasions.toLocaleString().padStart(8))} / ${stats.totalProducts.toLocaleString()} (${occasionColor(occasionCoverage.toFixed(1) + '%').padStart(6)})`);

  const attributeColor = getStatusColor(attributeCoverage);
  console.log(`  Products with Attributes: ${attributeColor(stats.productsWithAttributes.toLocaleString().padStart(8))} / ${stats.totalProducts.toLocaleString()} (${attributeColor(attributeCoverage.toFixed(1) + '%').padStart(6)})`);
  console.log();

  // Average connections
  console.log(chalk.bold.yellow('📊 Average Connections per Product:'));
  console.log(`  Interests per Product: ${chalk.white(stats.avgInterestsPerProduct.toFixed(2))}`);
  console.log(`  Occasions per Product: ${chalk.white(stats.avgOccasionsPerProduct.toFixed(2))}`);
  console.log();

  // Total relationships
  console.log(chalk.bold.yellow('🔗 Total Relationships:'));
  console.log(`  MATCHES_INTEREST relationships: ${chalk.white(stats.totalInterests.toLocaleString())}`);
  console.log(`  SUITABLE_FOR relationships:     ${chalk.white(stats.totalOccasions.toLocaleString())}`);
  console.log();

  // Attribute breakdown
  console.log(chalk.bold.yellow('✨ Gift Attribute Breakdown:'));
  const sortedAttributes = Object.entries(stats.attributeBreakdown)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0);

  if (sortedAttributes.length > 0) {
    sortedAttributes.forEach(([attribute, count]) => {
      const percentage = calculateCoverage(count, stats.totalProducts);
      const color = getStatusColor(percentage);
      const displayName = attribute.replace('is_', '').replace(/_/g, ' ');
      console.log(`  ${displayName.padEnd(20)} ${color(count.toLocaleString().padStart(8))} (${color(percentage.toFixed(1) + '%').padStart(6)})`);
    });
  } else {
    console.log(chalk.red('  No attributes found'));
  }
  console.log();

  // Sample enriched products
  console.log(chalk.bold.yellow('🎁 Sample Enriched Products:\n'));

  if (stats.sampleEnrichedProducts.length > 0) {
    stats.sampleEnrichedProducts.forEach((product, idx) => {
      console.log(chalk.bold.white(`${idx + 1}. ${product.title}`));
      console.log(chalk.gray(`   ID: ${product.id} | Price: $${product.price}`));

      if (product.interests.length > 0) {
        console.log(chalk.cyan(`   Interests (${product.interests.length}): `) + product.interests.slice(0, 5).join(', ') + (product.interests.length > 5 ? '...' : ''));
      } else {
        console.log(chalk.gray('   Interests: None'));
      }

      if (product.occasions.length > 0) {
        console.log(chalk.magenta(`   Occasions (${product.occasions.length}): `) + product.occasions.slice(0, 5).join(', ') + (product.occasions.length > 5 ? '...' : ''));
      } else {
        console.log(chalk.gray('   Occasions: None'));
      }

      const trueAttributes = Object.entries(product.attributes)
        .filter(([, value]) => value === true)
        .map(([key]) => key.replace('is_', '').replace(/_/g, ' '));

      if (trueAttributes.length > 0) {
        console.log(chalk.green(`   Attributes (${trueAttributes.length}): `) + trueAttributes.join(', '));
      } else {
        console.log(chalk.gray('   Attributes: None'));
      }
      console.log();
    });
  } else {
    console.log(chalk.red('  No enriched products found'));
  }
}

function displayIssues(stats: EnrichmentStats) {
  console.log(chalk.bold.red('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.bold.red('   ISSUES & CONCERNS'));
  console.log(chalk.bold.red('═══════════════════════════════════════════════════════\n'));

  const issues: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  // Calculate coverage
  const interestCoverage = calculateCoverage(stats.productsWithInterests, stats.totalProducts);
  const occasionCoverage = calculateCoverage(stats.productsWithOccasions, stats.totalProducts);
  const attributeCoverage = calculateCoverage(stats.productsWithAttributes, stats.totalProducts);

  // Critical issues (< 50% coverage)
  if (interestCoverage < 50) {
    issues.push(`Low interest coverage: Only ${interestCoverage.toFixed(1)}% of products have interests`);
  }
  if (occasionCoverage < 50) {
    issues.push(`Low occasion coverage: Only ${occasionCoverage.toFixed(1)}% of products have occasions`);
  }
  if (attributeCoverage < 50) {
    issues.push(`Low attribute coverage: Only ${attributeCoverage.toFixed(1)}% of products have gift attributes`);
  }

  // Warnings (50-79% coverage)
  if (interestCoverage >= 50 && interestCoverage < 80) {
    warnings.push(`Moderate interest coverage: ${interestCoverage.toFixed(1)}% (target: 80%+)`);
  }
  if (occasionCoverage >= 50 && occasionCoverage < 80) {
    warnings.push(`Moderate occasion coverage: ${occasionCoverage.toFixed(1)}% (target: 80%+)`);
  }
  if (attributeCoverage >= 50 && attributeCoverage < 80) {
    warnings.push(`Moderate attribute coverage: ${attributeCoverage.toFixed(1)}% (target: 80%+)`);
  }

  // Check for low average connections
  if (stats.avgInterestsPerProduct < 2) {
    warnings.push(`Low average interests per product: ${stats.avgInterestsPerProduct.toFixed(2)} (recommended: 3-5)`);
  }
  if (stats.avgOccasionsPerProduct < 2) {
    warnings.push(`Low average occasions per product: ${stats.avgOccasionsPerProduct.toFixed(2)} (recommended: 3-4)`);
  }

  // Check for missing attributes
  const attributeCount = Object.values(stats.attributeBreakdown).reduce((sum, count) => sum + count, 0);
  if (attributeCount === 0) {
    issues.push('No gift attributes found on any products');
  }

  // Display issues
  if (issues.length > 0) {
    console.log(chalk.bold.red('🚨 Critical Issues:'));
    issues.forEach(issue => console.log(chalk.red(`  • ${issue}`)));
    console.log();
  }

  if (warnings.length > 0) {
    console.log(chalk.bold.yellow('⚠️  Warnings:'));
    warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    console.log();
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log(chalk.bold.green('✅ No issues found! Enrichment coverage looks good.\n'));

    // Add recommendations for excellent coverage
    if (interestCoverage >= 80 && occasionCoverage >= 80 && attributeCoverage >= 80) {
      console.log(chalk.bold.cyan('💡 Recommendations:'));
      console.log(chalk.white('  • Maintain current enrichment quality'));
      console.log(chalk.white('  • Consider periodic audits to ensure data consistency'));
      console.log(chalk.white('  • Monitor enrichment coverage as new products are added'));
    }
  } else {
    console.log(chalk.bold.cyan('💡 Recommendations:'));

    if (interestCoverage < 80) {
      console.log(chalk.white('  • Run interest enrichment: npx tsx scripts/expand-interests.ts'));
    }
    if (occasionCoverage < 80) {
      console.log(chalk.white('  • Run occasion enrichment: npx tsx scripts/tag-occasions.ts'));
    }
    if (attributeCoverage < 80) {
      console.log(chalk.white('  • Run attribute enrichment: npx tsx scripts/populate-gift-attributes.ts'));
    }
    if (stats.avgInterestsPerProduct < 2 || stats.avgOccasionsPerProduct < 2) {
      console.log(chalk.white('  • Consider enriching products with more varied connections'));
    }
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed');

  try {
    console.log(chalk.bold.cyan('\n🚀 Starting Enrichment Verification...\n'));

    await initNeo4j({
      uri: process.env.NEO4J_URL || process.env.NEO4J_URI || '',
      username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const stats = await getEnrichmentStats(detailed);

    displayStats(stats);
    displayIssues(stats);

    console.log(chalk.bold.green('✨ Verification complete!\n'));

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('❌ Error during verification:'), error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
