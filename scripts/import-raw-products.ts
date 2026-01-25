#!/usr/bin/env tsx
/**
 * Import Raw Products → Canonical Export
 *
 * Reads a raw JSON file (e.g., data/raw/products 23_11_2025.json), maps each
 * record into the canonical export shape (data/export/products.json schema),
 * dedupes against existing products (by product_url and id), and either:
 *  - writes the new records to data/export/products_extra.json (default), or
 *  - merges them into data/export/products.json and updates export-summary.json (--merge).
 *
 * Usage:
 *   tsx scripts/import-raw-products.ts [--source <path>] [--merge] [--dry-run]
 *
 * Options:
 *   --source <path>   Raw JSON path (default: newest products*.json in data/raw)
 *   --merge           Append to data/export/products.json and update export-summary.json
 *   --dry-run         Do not write files; print summary only
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

type RawProduct = {
  id: number | string;
  website: string;
  handle?: string;
  sku?: string | null;
  title: string;
  description?: string | null;
  vendor?: string | null;
  price: number | string;
  availability: boolean;
  image?: string | null;
  url: string;
  created_at?: string;
  updated_at?: string;
};

type CanonicalProduct = {
  id: string;
  vendor_id: number | null;
  category_id: number | null;
  source_website: string;
  handle: string | undefined;
  sku: string | null | undefined;
  title: string;
  description: string | null | undefined;
  price: string;
  currency: string;
  available: boolean;
  image_url: string | null | undefined;
  product_url: string;
  tags: string[];
  attributes: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { source?: string; merge: boolean; dryRun: boolean } = {
    merge: false,
    dryRun: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source') {
      out.source = args[++i];
    } else if (a === '--merge') {
      out.merge = true;
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--help') {
      console.log(`\nImport Raw Products → Canonical Export\n\nUsage:\n  tsx scripts/import-raw-products.ts [--source <path>] [--merge] [--dry-run]\n`);
      process.exit(0);
    }
  }
  return out;
}

function newestRawProductsFile(): string | null {
  const rawDir = path.join(process.cwd(), 'data', 'raw');
  if (!fs.existsSync(rawDir)) return null;
  const files = fs
    .readdirSync(rawDir)
    .filter((f) =>
      /^products.*\.json$/i.test(f) && !f.startsWith('._')
    )
    .map((f) => {
      const full = path.join(rawDir, f);
      const stat = fs.statSync(full);
      return { f: full, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? files[0].f : null;
}

function inferCurrency(website?: string, productUrl?: string): string {
  const text = `${website || ''} ${productUrl || ''}`.toLowerCase();
  if (/\.ca(\b|\s|\/)/.test(text)) return 'CAD';
  return 'USD';
}

function toPriceString(value: number | string): string {
  if (typeof value === 'number') return String(value);
  // Already a string; normalize basic whitespace
  return String(value).trim();
}

function toCanonical(raw: RawProduct): CanonicalProduct {
  const website = raw.website?.trim();
  const baseId = `${website}-${raw.id}`;
  return {
    id: baseId,
    vendor_id: null,
    category_id: null,
    source_website: website,
    handle: raw.handle,
    sku: raw.sku ?? null,
    title: raw.title,
    description: raw.description ?? null,
    price: toPriceString(raw.price),
    currency: inferCurrency(website, raw.url),
    available: Boolean(raw.availability),
    image_url: raw.image ?? null,
    product_url: raw.url,
    tags: [],
    attributes: {},
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function loadJsonArray<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error('Expected top-level array');
    return parsed as T[];
  } catch (e: any) {
    throw new Error(`Failed to parse ${filePath}: ${e.message}`);
  }
}

function main() {
  const { source, merge, dryRun } = parseArgs();

  const sourcePath = source || newestRawProductsFile();
  if (!sourcePath) {
    console.error(chalk.red('No raw products file found in data/raw. Use --source to specify a file.'));
    process.exit(1);
  }

  console.log(chalk.bold.cyan('\n🛠️  Import Raw Products → Canonical Export\n'));
  console.log(chalk.gray(`Source: ${sourcePath}`));
  console.log(chalk.gray(`Mode: ${dryRun ? 'DRY RUN' : merge ? 'MERGE (append to exports)' : 'WRITE EXTRA (products_extra.json)'}\n`));

  // Load raw
  const rawProducts = loadJsonArray<RawProduct>(sourcePath);
  console.log(chalk.white(`Loaded raw products: ${rawProducts.length.toLocaleString()}`));

  // Load existing exports (for dedupe)
  const exportDir = path.join(process.cwd(), 'data', 'export');
  const productsPath = path.join(exportDir, 'products.json');
  const summaryPath = path.join(exportDir, 'export-summary.json');

  if (!fs.existsSync(productsPath)) {
    console.error(chalk.red(`Missing export file: ${productsPath}`));
    process.exit(1);
  }

  const existing = loadJsonArray<CanonicalProduct>(productsPath);
  const existingIds = new Set(existing.map((p) => p.id));
  const existingUrls = new Set(existing.map((p) => (p.product_url || '').trim()).filter(Boolean));

  // Transform and dedupe
  const seenUrls = new Set<string>();
  const bySiteCount = new Map<string, number>();

  const transformed: CanonicalProduct[] = [];
  for (const r of rawProducts) {
    try {
      const c = toCanonical(r);
      const urlKey = (c.product_url || '').trim();
      if (!urlKey) continue;

      // Dedupe against existing exports and within batch
      if (existingIds.has(c.id) || existingUrls.has(urlKey) || seenUrls.has(urlKey)) {
        continue;
      }

      transformed.push(c);
      seenUrls.add(urlKey);
      bySiteCount.set(c.source_website, (bySiteCount.get(c.source_website) || 0) + 1);
    } catch (e) {
      // Skip malformed record
      continue;
    }
  }

  // Summary
  console.log(chalk.green(`\nCandidates after mapping & dedupe: ${transformed.length.toLocaleString()}`));
  if (transformed.length === 0) {
    console.log(chalk.yellow('Nothing to add (all duplicates or invalid).'));
  }

  // Top websites summary
  const topSites = Array.from(bySiteCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topSites.length) {
    console.log(chalk.cyan('\nTop sources:'));
    for (const [site, count] of topSites) {
      console.log(`  - ${site}: ${count}`);
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('\nDRY RUN: no files written.'));
    return;
  }

  // Write outputs
  if (merge) {
    // Backups
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const productsBackup = productsPath + `.bak.${ts}`;
    fs.copyFileSync(productsPath, productsBackup);
    if (fs.existsSync(summaryPath)) {
      fs.copyFileSync(summaryPath, summaryPath + `.bak.${ts}`);
    }

    const merged = existing.concat(transformed);
    fs.writeFileSync(productsPath, JSON.stringify(merged, null, 2));

    // Update export summary if present
    if (fs.existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
        summary.exportDate = new Date().toISOString();
        summary.productCount = merged.length;
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      } catch {
        // ignore summary write errors
      }
    }

    console.log(chalk.bold.green(`\n✓ Merged ${transformed.length.toLocaleString()} products into exports`));
    console.log(chalk.gray(`Backup: ${productsBackup}`));
  } else {
    // Write extra file with only the new products
    const extraPath = path.join(exportDir, 'products_extra.json');
    fs.writeFileSync(extraPath, JSON.stringify(transformed, null, 2));
    console.log(chalk.bold.green(`\n✓ Wrote ${transformed.length.toLocaleString()} products to ${extraPath}`));
    console.log(chalk.gray('Run again with --merge to append to products.json'));
  }
}

main();

