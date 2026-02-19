#!/usr/bin/env python3
"""
Load Shopify tags and product_type into Neo4j using native Python driver.
Avoids all Docker exec / shell escaping issues by using parameterized queries.
"""

import json
import argparse
from typing import Dict, List
from neo4j import GraphDatabase

SKIP_TAG_PATTERNS = [
    'filter:', 'dynamic', 'coupon', 'rebuy', 'autoship', 'pp-',
    'sample-pack', 'save30', 'summer-sale', 'not-special', 'trynowauto',
    'spo-', 'verishop', 'shopify', '_upsell', 'bundle-builder',
    'dynamic coupon', 'fileimgurl', 'colorname__', 'colorgroup__',
]


def normalize_brand_url(url: str) -> str:
    url = url.strip().rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    parts = url.split('/')
    if len(parts) > 3:
        url = '/'.join(parts[:3])
    return url


def clean_tags(tags: List[str]) -> List[str]:
    result = []
    for t in tags:
        t_stripped = t.strip()
        t_lower = t_stripped.lower()
        if any(pat in t_lower for pat in SKIP_TAG_PATTERNS):
            continue
        if len(t_stripped) < 2 or len(t_stripped) > 50:
            continue
        result.append(t_stripped)
    return result[:20]


def load_tags(input_path: str, uri: str, password: str, dry_run: bool = False):
    with open(input_path) as f:
        data = json.load(f)

    # Build updates: list of {urls: [url1, url2], tags: [...], product_type: "..."}
    updates = []
    total_scraped = 0

    for brand_url, brand_data in data.items():
        base = normalize_brand_url(brand_url)
        for p in brand_data.get('all_products', []):
            handle = p.get('handle', '')
            if not handle:
                continue
            total_scraped += 1
            tags = clean_tags(p.get('tags', []))
            pt = p.get('product_type', '').strip()
            if not tags and not pt:
                continue
            urls = [
                f"{base}/products/{handle}",
                f"{base}//products/{handle}",
            ]
            updates.append({'urls': urls, 'tags': tags, 'product_type': pt})

    print(f"\n=== SHOPIFY TAG LOADING v3 (native driver) ===")
    print(f"Total scraped products: {total_scraped}")
    print(f"Products with useful data: {len(updates)}")

    driver = GraphDatabase.driver(uri, auth=('neo4j', password))

    if dry_run:
        with driver.session() as session:
            all_urls = []
            for u in updates:
                all_urls.extend(u['urls'])
            result = session.run(
                "UNWIND $urls AS url MATCH (p:Product {product_url: url}) RETURN count(p) AS matched",
                urls=all_urls
            )
            matched = result.single()['matched']
            print(f"\n[DRY RUN] Products matched: {matched}")
        driver.close()
        return

    # Live: batch UNWIND with parameterized queries
    print(f"\nWriting tags to Neo4j...")
    batch_size = 100
    matched_total = 0

    with driver.session() as session:
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i+batch_size]

            # Flatten to individual URL -> data pairs for UNWIND
            items = []
            for u in batch:
                for url in u['urls']:
                    items.append({
                        'url': url,
                        'tags': u['tags'],
                        'pt': u['product_type'],
                    })

            result = session.run("""
                UNWIND $items AS item
                MATCH (p:Product {product_url: item.url})
                SET p.shopify_tags = item.tags,
                    p.shopify_product_type = item.pt
                RETURN count(p) AS matched
            """, items=items)

            matched = result.single()['matched']
            matched_total += matched

            batch_num = i // batch_size + 1
            total_batches = (len(updates) + batch_size - 1) // batch_size
            if batch_num % 20 == 0 or batch_num == total_batches:
                print(f"  Batch {batch_num}/{total_batches}: {matched_total} matched so far")

    print(f"\n=== LOADING COMPLETE ===")
    print(f"Total products matched: {matched_total}")

    # Verify
    with driver.session() as session:
        result = session.run("MATCH (p:Product) WHERE p.shopify_tags IS NOT NULL RETURN count(p) AS cnt")
        print(f"Products with shopify_tags: {result.single()['cnt']}")
        result = session.run("MATCH (p:Product) WHERE p.shopify_product_type IS NOT NULL AND p.shopify_product_type <> '' RETURN count(p) AS cnt")
        print(f"Products with shopify_product_type: {result.single()['cnt']}")

    driver.close()


def main():
    parser = argparse.ArgumentParser(description='Load Shopify tags into Neo4j (v3 native driver)')
    parser.add_argument('--input', default='./output/shopify_full_products.json')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--neo4j-uri', default='bolt://localhost:7687')
    parser.add_argument('--neo4j-password', default='presentagent2024')
    args = parser.parse_args()
    load_tags(args.input, args.neo4j_uri, args.neo4j_password, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
