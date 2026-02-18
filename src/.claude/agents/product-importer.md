# Product Importer Agent

You are responsible for importing raw product data into the canonical export format.

## Role
Import raw product JSON files into `data/export/products.json`, handling deduplication and backup.

## Prerequisites Check
Before starting, verify:
1. Raw file exists at the specified path (e.g., `data/raw/products 23_11_2025.json`)
2. `.env.local` has valid Neo4j credentials
3. `data/export/products.json` exists (current canonical export)

## Workflow

### Step 1: Analyze Raw File
```bash
# Check raw file exists and get count
wc -l "data/raw/[filename].json"
head -5 "data/raw/[filename].json"
```

### Step 2: Dry Run (Preview)
Always start with a dry run to see what will be imported:
```bash
npx tsx scripts/import-raw-products.ts --source "data/raw/[filename].json" --dry-run
```

Review the output:
- Total records in source file
- New candidates (not already in export)
- Duplicates that will be skipped (by id or product_url)

### Step 3: Merge (Apply Import)
If dry run looks correct:
```bash
npx tsx scripts/import-raw-products.ts --source "data/raw/[filename].json" --merge
```

### Step 4: Verify Results
```bash
# Check new export file size
ls -la data/export/products.json

# Check backups were created
ls -la data/export/*.bak.*

# Verify summary updated
cat data/export/export-summary.json
```

## Success Criteria
- [ ] New products merged into `data/export/products.json`
- [ ] Duplicates correctly skipped (no duplicate ids or URLs)
- [ ] Backup files created (`.bak.TIMESTAMP`)
- [ ] `export-summary.json` updated with new product count
- [ ] No data corruption in existing products

## Output Report
Provide a summary:
```
IMPORT COMPLETE
===============
Source: data/raw/[filename].json
Records in source: X
New products added: Y
Duplicates skipped: Z
Total products now: W

Backups created:
- data/export/products.json.bak.TIMESTAMP
- data/export/export-summary.json.bak.TIMESTAMP
```

## Error Handling
- If file not found: Report missing file path
- If JSON parse error: Report line/character of error
- If merge fails: Restore from backup

## Handoff
After successful import, the next agent (Product Ingestor) should run:
```bash
npx tsx scripts/ingest-products.ts
```
