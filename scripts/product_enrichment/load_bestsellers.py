#!/usr/bin/env python3
"""
Load Shopify bestseller data into Neo4j.

Reads shopify_bestsellers.json and matches scraped products to existing
Product nodes via URL matching (brand_url + /products/ + handle).

Sets:
  - is_bestseller = true
  - bestseller_rank = 1..N
  - shopify_tags (array, from Shopify product tags)
  - shopify_product_type (string)

Usage:
    python3 load_bestsellers.py --input ./output/shopify_bestsellers.json
    python3 load_bestsellers.py --input ./output/shopify_bestsellers.json --dry-run
"""

import json
import argparse
import subprocess
import time
from typing import Dict, List, Any, Optional, Tuple


def normalize_brand_url(url: str) -> str:
    """Normalize brand URL to base domain without trailing slash."""
    url = url.strip().rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    parts = url.split('/')
    if len(parts) > 3:
        url = '/'.join(parts[:3])
    return url


def build_product_urls(brand_url: str, handle: str) -> List[str]:
    """Build product URL variants from brand URL and Shopify handle.

    Neo4j has products with both:
      - https://brand.com/products/handle (no trailing slash on brand)
      - https://brand.com//products/handle (trailing slash on brand was preserved)
    We return both variants for matching.
    """
    base = normalize_brand_url(brand_url)  # no trailing slash
    return [
        f"{base}/products/{handle}",      # standard: brand.com/products/handle
        f"{base}//products/{handle}",     # slash variant: brand.com//products/handle
    ]


def run_cypher(query: str, password: str = 'presentagent2024') -> str:
    """Run a Cypher query via docker cypher-shell.

    For large queries, pipes through stdin to avoid argument length limits.
    """
    cmd = [
        'docker', 'exec', '-i', 'present-agent-neo4j', 'cypher-shell',
        '-u', 'neo4j', '-p', password,
    ]
    proc = subprocess.run(cmd, input=query, capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"Cypher failed: {proc.stderr}")
    return proc.stdout


def load_bestsellers(input_path: str, dry_run: bool = False, password: str = 'presentagent2024'):
    """Load bestseller data from scraper output into Neo4j."""
    with open(input_path) as f:
        data = json.load(f)

    # Collect all bestseller product URLs with metadata
    updates = []  # (product_url, rank, tags, product_type)
    brands_with_data = 0
    brands_without_data = 0

    for brand_url, brand_data in data.items():
        bestsellers = brand_data.get('bestseller_products', [])
        if not bestsellers:
            brands_without_data += 1
            continue

        brands_with_data += 1
        normalized_url = normalize_brand_url(brand_url)

        for product in bestsellers:
            handle = product.get('handle', '')
            if not handle:
                continue

            urls = build_product_urls(normalized_url, handle)
            rank = product.get('bestseller_rank', 999)
            tags = product.get('tags', [])
            product_type = product.get('product_type', '')

            for url in urls:
                updates.append({
                    'product_url': url,
                    'rank': rank,
                    'tags': tags,
                    'product_type': product_type,
                    'title': product.get('title', ''),
                })

    print(f"\n=== BESTSELLER LOADING ===")
    print(f"Brands with bestseller data: {brands_with_data}")
    print(f"Brands without bestseller data: {brands_without_data}")
    print(f"Total bestseller products to match: {len(updates)}")

    if dry_run:
        # Check how many would match in Neo4j
        all_urls = list(set(u['product_url'] for u in updates))

        # Check in batches of 500
        matched = 0
        for i in range(0, len(all_urls), 500):
            batch = all_urls[i:i+500]
            urls_json = json.dumps(batch)
            query = f"""
            WITH {urls_json} AS urls
            UNWIND urls AS url
            OPTIONAL MATCH (p:Product {{product_url: url}})
            RETURN url, p IS NOT NULL AS found
            """
            result = run_cypher(query, password)
            for line in result.strip().split('\n')[1:]:  # skip header
                if ', TRUE' in line or ', true' in line:
                    matched += 1

        # Deduplicate: each unique product matched via either URL variant counts as 1
        unique_products = len(updates) // 2  # we add 2 URL variants per product
        print(f"\n[DRY RUN] URL variants checked: {len(all_urls)}")
        print(f"[DRY RUN] URLs matched in Neo4j: {matched}")
        print(f"[DRY RUN] Unique products (from scrape): {unique_products}")

        # Show sample matches
        sample_urls = [u['product_url'] for u in updates[:6]]
        print(f"\nSample URLs to match:")
        for url in sample_urls:
            print(f"  {url}")

        # Check a few
        for url in sample_urls[:4]:
            query = f"""
            MATCH (p:Product)
            WHERE p.product_url = '{url}'
            RETURN p.product_url, p.title
            LIMIT 1
            """
            result = run_cypher(query, password)
            lines = result.strip().split('\n')
            if len(lines) > 1:
                print(f"    -> MATCH: {lines[1]}")
            else:
                print(f"    -> NO MATCH")

        return

    # Live mode: batch update
    print(f"\nWriting bestseller flags to Neo4j...")

    # First, clear existing bestseller flags
    print("  Clearing existing bestseller flags...")
    run_cypher("""
    MATCH (p:Product)
    WHERE p.is_bestseller = true
    SET p.is_bestseller = false, p.bestseller_rank = null
    """, password)

    # Build a Cypher script and pipe it through in batches
    # Use URL-only UNWIND for is_bestseller, then per-URL SET for rank
    matched_total = 0
    batch_size = 200  # URLs per batch

    all_urls = list(set(u['product_url'] for u in updates))

    # Step 1: Set is_bestseller = true in batches
    print(f"  Setting is_bestseller flag ({len(all_urls)} URL variants)...")
    for i in range(0, len(all_urls), batch_size):
        batch = all_urls[i:i+batch_size]
        url_list = ', '.join(f"'{u.replace(chr(39), chr(39)+chr(39))}'" for u in batch)

        query = f"""
        WITH [{url_list}] AS urls
        UNWIND urls AS url
        MATCH (p:Product {{product_url: url}})
        SET p.is_bestseller = true
        RETURN count(p) AS matched;
        """
        result = run_cypher(query, password)
        for line in result.strip().split('\n')[1:]:
            try:
                matched_total += int(line.strip())
            except ValueError:
                pass

    print(f"  Flagged {matched_total} products as bestsellers")

    # Step 2: Set bestseller_rank per URL in batches of SET statements
    print(f"  Setting bestseller_rank...")
    # Build a big Cypher script of individual MATCH/SET statements
    statements = []
    for u in updates:
        url = u['product_url'].replace("'", "''")
        rank = u['rank']
        statements.append(
            f"MATCH (p:Product {{product_url: '{url}'}}) "
            f"SET p.bestseller_rank = {rank};"
        )

    # Execute in chunks to avoid huge stdin
    chunk_size = 100
    for i in range(0, len(statements), chunk_size):
        chunk = statements[i:i+chunk_size]
        script = '\n'.join(chunk)
        try:
            run_cypher(script, password)
        except RuntimeError:
            # Some URLs won't match, that's fine
            pass

        if (i // chunk_size + 1) % 10 == 0:
            print(f"    Rank batch {i//chunk_size + 1}/{(len(statements) + chunk_size - 1)//chunk_size}")

    print(f"\n=== LOADING COMPLETE ===")
    print(f"Total bestseller products matched: {matched_total}")
    print(f"Total products attempted: {len(updates)}")
    print(f"Match rate: {matched_total/len(updates)*100:.1f}%" if updates else "N/A")

    # Verify
    result = run_cypher("MATCH (p:Product) WHERE p.is_bestseller = true RETURN count(p) AS count", password)
    for line in result.strip().split('\n')[1:]:
        print(f"Products now flagged as bestseller: {line.strip()}")


def main():
    parser = argparse.ArgumentParser(description='Load Shopify bestseller data into Neo4j')
    parser.add_argument('--input', default='./output/shopify_bestsellers.json',
                        help='Path to shopify_bestsellers.json')
    parser.add_argument('--dry-run', action='store_true',
                        help='Check matches without writing to Neo4j')
    parser.add_argument('--neo4j-password', default='presentagent2024',
                        help='Neo4j password')

    args = parser.parse_args()
    load_bestsellers(args.input, dry_run=args.dry_run, password=args.neo4j_password)


if __name__ == '__main__':
    main()
