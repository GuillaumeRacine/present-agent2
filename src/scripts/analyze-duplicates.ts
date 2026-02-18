#!/usr/bin/env tsx
/**
 * Analyze Duplicate Interests
 *
 * Identifies potential duplicates based on:
 * 1. Spaces vs hyphens (e.g., "home decor" vs "home-decor")
 * 2. Singular vs plural
 * 3. Similar names with small variations
 */

import fs from 'fs';
import path from 'path';

interface InterestStats {
  count: number;
  totalRelevance: number;
  avgRelevance: number;
}

interface DuplicateGroup {
  canonical: string;
  variants: Array<{
    name: string;
    count: number;
    avgRelevance: number;
  }>;
  totalProducts: number;
}

// Load stats
const statsFile = path.join(process.cwd(), 'data', 'interest-stats.json');
const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
const interests = stats.interests as Record<string, InterestStats>;

console.log('🔍 Analyzing Interest Duplicates\n');
console.log(`Total unique interests: ${Object.keys(interests).length}\n`);

// Function to normalize interest names
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')  // spaces to hyphens
    .replace(/[^\w-]/g, '') // remove special chars
    .replace(/-+/g, '-')    // multiple hyphens to single
    .replace(/s$/, '');     // remove trailing 's' (plural)
}

// Group interests by normalized name
const groups = new Map<string, string[]>();
for (const name of Object.keys(interests)) {
  const norm = normalize(name);
  if (!groups.has(norm)) {
    groups.set(norm, []);
  }
  groups.get(norm)!.push(name);
}

// Find duplicates (groups with multiple variants)
const duplicates: DuplicateGroup[] = [];
for (const [normName, variants] of groups.entries()) {
  if (variants.length > 1) {
    // Sort by product count (descending)
    const sorted = variants
      .map(name => ({
        name,
        count: interests[name].count,
        avgRelevance: interests[name].avgRelevance,
      }))
      .sort((a, b) => b.count - a.count);

    duplicates.push({
      canonical: sorted[0].name, // Use most popular as canonical
      variants: sorted,
      totalProducts: sorted.reduce((sum, v) => sum + v.count, 0),
    });
  }
}

// Sort by total products affected
duplicates.sort((a, b) => b.totalProducts - a.totalProducts);

console.log(`Found ${duplicates.length} duplicate groups\n`);
console.log('━'.repeat(80));
console.log('\nTop 50 Duplicate Groups (by total products affected):\n');

for (let i = 0; i < Math.min(50, duplicates.length); i++) {
  const dup = duplicates[i];
  console.log(`${(i + 1).toString().padStart(2)}. Group: "${dup.canonical}" (${dup.totalProducts} total products)`);
  console.log(`    Variants (${dup.variants.length}):`);
  for (const variant of dup.variants) {
    console.log(`      - "${variant.name}": ${variant.count} products (avg: ${variant.avgRelevance.toFixed(2)})`);
  }
  console.log();
}

// Statistics
const totalDuplicatedProducts = duplicates.reduce((sum, d) => {
  // Count "wasted" products (all but the canonical)
  return sum + d.variants.slice(1).reduce((s, v) => s + v.count, 0);
}, 0);

console.log('━'.repeat(80));
console.log('\n📊 Duplicate Impact:\n');
console.log(`Duplicate groups: ${duplicates.length}`);
console.log(`Products affected by duplication: ${totalDuplicatedProducts}`);
console.log(`Potential reduction: ${duplicates.reduce((s, d) => s + (d.variants.length - 1), 0)} interests could be merged`);

// Save detailed report
const reportFile = path.join(process.cwd(), 'data', 'duplicate-analysis.json');
fs.writeFileSync(reportFile, JSON.stringify({
  summary: {
    totalInterests: Object.keys(interests).length,
    duplicateGroups: duplicates.length,
    productsAffected: totalDuplicatedProducts,
    potentialReduction: duplicates.reduce((s, d) => s + (d.variants.length - 1), 0),
  },
  duplicates: duplicates,
}, null, 2));

console.log(`\n💾 Detailed report saved to: ${reportFile}`);
