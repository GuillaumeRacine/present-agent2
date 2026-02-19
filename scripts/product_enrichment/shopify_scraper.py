#!/usr/bin/env python3
"""
Shopify Best-Seller Scraper - Fetches popularity data from B-Corp brand stores.

All 315 brands in the catalog are Shopify stores. This scraper uses Shopify's
public endpoints to fetch:
  - /products.json        → full product catalog with variants, inventory
  - /collections.json     → collection handles (best-sellers, new-arrivals, etc.)
  - /collections/{handle}/products.json → products in a collection (ranked by store)

Rate-limited and respectful: 1 req/sec per domain, exponential backoff on 429s.

Usage:
    python3 shopify_scraper.py --brands brands.json --output ./output/shopify_data.json
    python3 shopify_scraper.py --brand-url https://matethelabel.com --output ./output/shopify_data.json
    python3 shopify_scraper.py --discover-only  # Just list available endpoints per brand
    python3 shopify_scraper.py --bestsellers-only --max-bestsellers 15 --output ./output/shopify_bestsellers.json
"""

import json
import os
import re
import time
import argparse
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict


# --- Config ---

REQUEST_DELAY = 1.2  # seconds between requests to same domain
MAX_RETRIES = 3
BACKOFF_FACTOR = 2
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
PRODUCTS_PER_PAGE = 250  # Shopify max
MAX_PAGES = 10  # Safety limit

BESTSELLER_HANDLES = [
    'best-sellers',
    'bestsellers',
    'best-selling',
    'top-sellers',
    'most-popular',
    'popular',
    'trending',
    'top-rated',
    'favorites',
    'fan-favorites',
    'our-favorites',
    'staff-picks',
]


def fetch_json(url: str, retries: int = MAX_RETRIES) -> Optional[Dict]:
    """Fetch JSON from a URL with retry and backoff."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = REQUEST_DELAY * (BACKOFF_FACTOR ** attempt)
                print(f"    Rate limited, waiting {wait:.1f}s...")
                time.sleep(wait)
            elif e.code == 404:
                return None
            elif e.code == 403:
                return None
            else:
                print(f"    HTTP {e.code} for {url}")
                return None
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                time.sleep(REQUEST_DELAY * (BACKOFF_FACTOR ** attempt))
            else:
                print(f"    Error fetching {url}: {e}")
                return None
    return None


def normalize_brand_url(url: str) -> str:
    """Normalize brand URL to base domain."""
    url = url.strip().rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    # Remove paths like /en-ph
    parts = url.split('/')
    if len(parts) > 3:
        url = '/'.join(parts[:3])
    return url


def discover_collections(brand_url: str) -> List[Dict[str, str]]:
    """Discover available collections for a Shopify store."""
    url = f"{brand_url}/collections.json"
    data = fetch_json(url)
    if not data or 'collections' not in data:
        return []

    collections = []
    for col in data['collections']:
        handle = col.get('handle', '')
        title = col.get('title', '')
        collections.append({
            'handle': handle,
            'title': title,
            'id': col.get('id'),
        })

    return collections


def find_bestseller_collection(collections: List[Dict]) -> Optional[str]:
    """Find the best-seller collection handle from available collections."""
    for col in collections:
        handle = col.get('handle', '').lower()
        title = col.get('title', '').lower()
        combined = handle + ' ' + title

        for bs_handle in BESTSELLER_HANDLES:
            if bs_handle in combined:
                return col['handle']

    return None


def fetch_collection_products(
    brand_url: str, handle: str, max_products: int = 100
) -> List[Dict]:
    """Fetch products from a specific collection. Order reflects store's ranking."""
    products = []
    page = 1

    while len(products) < max_products and page <= MAX_PAGES:
        url = f"{brand_url}/collections/{handle}/products.json?limit={PRODUCTS_PER_PAGE}&page={page}"
        data = fetch_json(url)
        if not data or 'products' not in data or not data['products']:
            break

        products.extend(data['products'])
        if len(data['products']) < PRODUCTS_PER_PAGE:
            break
        page += 1
        time.sleep(REQUEST_DELAY)

    return products[:max_products]


def fetch_all_products(brand_url: str, max_products: int = 500) -> List[Dict]:
    """Fetch all products from a store's catalog."""
    products = []
    page = 1

    while len(products) < max_products and page <= MAX_PAGES:
        url = f"{brand_url}/products.json?limit={PRODUCTS_PER_PAGE}&page={page}"
        data = fetch_json(url)
        if not data or 'products' not in data or not data['products']:
            break

        products.extend(data['products'])
        if len(data['products']) < PRODUCTS_PER_PAGE:
            break
        page += 1
        time.sleep(REQUEST_DELAY)

    return products[:max_products]


def extract_product_popularity(product: Dict, rank: Optional[int] = None) -> Dict:
    """Extract popularity-relevant fields from a Shopify product JSON."""
    result = {
        'shopify_id': product.get('id'),
        'title': product.get('title', ''),
        'handle': product.get('handle', ''),
        'product_type': product.get('product_type', ''),
        'vendor': product.get('vendor', ''),
        'tags': product.get('tags', []) if isinstance(product.get('tags'), list) else
                [t.strip() for t in str(product.get('tags', '')).split(',') if t.strip()],
        'created_at': product.get('created_at', ''),
        'updated_at': product.get('updated_at', ''),
        'published_at': product.get('published_at', ''),
    }

    if rank is not None:
        result['bestseller_rank'] = rank

    # Variants analysis
    variants = product.get('variants', [])
    if variants:
        prices = [float(v.get('price', 0)) for v in variants if v.get('price')]
        result['variant_count'] = len(variants)
        result['price_min'] = min(prices) if prices else None
        result['price_max'] = max(prices) if prices else None

        # Inventory tracking
        available_count = sum(
            1 for v in variants
            if v.get('available', True)
        )
        result['available_variant_count'] = available_count
        result['availability_ratio'] = round(
            available_count / len(variants), 2
        ) if variants else 0

        # Some stores expose inventory quantities
        inventory_quantities = [
            v.get('inventory_quantity', 0) for v in variants
            if v.get('inventory_quantity') is not None
        ]
        if inventory_quantities:
            result['total_inventory'] = sum(inventory_quantities)

    # Images count as a proxy for effort/importance
    images = product.get('images', [])
    result['image_count'] = len(images)

    return result


def scrape_brand(
    brand_url: str,
    bestsellers_only: bool = False,
    max_bestsellers: int = 100,
    existing_collections: Optional[List[Dict]] = None,
    existing_bs_handle: Optional[str] = None,
) -> Dict[str, Any]:
    """Scrape a single brand for popularity data.

    Args:
        brand_url: The Shopify store URL.
        bestsellers_only: If True, skip full catalog fetch (Step 3).
        max_bestsellers: Maximum bestseller products to fetch per brand.
        existing_collections: Pre-discovered collections from a previous discover-only run.
        existing_bs_handle: Pre-discovered bestseller handle from a previous discover-only run.
    """
    brand_url = normalize_brand_url(brand_url)
    result = {
        'brand_url': brand_url,
        'scrape_timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'collections': [],
        'bestseller_collection': None,
        'bestseller_products': [],
        'all_products': [],
        'stats': {},
        'errors': [],
    }

    print(f"\n  Scraping {brand_url}...")

    # Step 1: Discover collections (skip if already known)
    if existing_collections is not None:
        collections_raw = existing_collections
        result['collections'] = [
            {'handle': c['handle'], 'title': c['title']}
            for c in collections_raw
        ]
    else:
        collections_raw = discover_collections(brand_url)
        result['collections'] = [
            {'handle': c['handle'], 'title': c['title']}
            for c in collections_raw
        ]
        time.sleep(REQUEST_DELAY)

    # Step 2: Find bestseller collection
    if existing_bs_handle:
        bs_handle = existing_bs_handle
    else:
        bs_handle = find_bestseller_collection(collections_raw)

    if bs_handle:
        result['bestseller_collection'] = bs_handle
        print(f"    Found bestseller collection: {bs_handle}")

        bs_products = fetch_collection_products(brand_url, bs_handle, max_products=max_bestsellers)
        result['bestseller_products'] = [
            extract_product_popularity(p, rank=i + 1)
            for i, p in enumerate(bs_products[:max_bestsellers])
        ]
        print(f"    Fetched {len(result['bestseller_products'])} bestseller products")
        time.sleep(REQUEST_DELAY)
    else:
        print(f"    No bestseller collection found")

    # Step 3: Fetch full catalog (skip in bestsellers-only mode)
    if not bestsellers_only:
        all_products = fetch_all_products(brand_url)
        result['all_products'] = [
            extract_product_popularity(p) for p in all_products
        ]
        print(f"    Fetched {len(result['all_products'])} total products")

    # Step 4: Compute brand-level stats
    result['stats'] = {
        'total_products': len(result['all_products']),
        'collection_count': len(result['collections']),
        'has_bestseller_collection': bs_handle is not None,
        'bestseller_count': len(result['bestseller_products']),
    }

    if result['all_products']:
        prices = [
            p['price_min'] for p in result['all_products']
            if p.get('price_min')
        ]
        if prices:
            result['stats']['price_range'] = {
                'min': min(prices),
                'max': max(prices),
                'avg': round(sum(prices) / len(prices), 2),
            }

    return result


def get_brand_urls_from_bcorp(input_dir: str) -> List[str]:
    """Extract unique brand URLs from bcorp-*.json files."""
    import glob
    pattern = os.path.join(input_dir, 'bcorp-*.json')
    files = sorted(glob.glob(pattern))

    brands = set()
    for f in files:
        with open(f) as fh:
            data = json.load(fh)
        for item in data:
            url = item.get('Brand URL', '').strip().rstrip('/')
            if url:
                brands.add(url)

    return sorted(brands)


def get_brand_urls_from_neo4j(uri: str = 'bolt://localhost:7687', password: str = 'presentagent2024') -> List[str]:
    """Extract unique normalized brand URLs from Neo4j."""
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print("neo4j package not found, falling back to cypher-shell...")
        import subprocess
        cmd = [
            'docker', 'exec', 'present-agent-neo4j', 'cypher-shell',
            '-u', 'neo4j', '-p', password,
            'MATCH (p:Product) RETURN DISTINCT p.brand_url AS brand ORDER BY brand'
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        brands = set()
        for line in proc.stdout.strip().split('\n')[1:]:  # skip header
            url = line.strip().strip('"')
            if url:
                brands.add(normalize_brand_url(url))
        return sorted(brands)

    driver = GraphDatabase.driver(uri, auth=('neo4j', password))
    brands = set()
    with driver.session() as session:
        result = session.run('MATCH (p:Product) RETURN DISTINCT p.brand_url AS brand')
        for record in result:
            url = record['brand']
            if url:
                brands.add(normalize_brand_url(url))
    driver.close()
    return sorted(brands)


def main():
    parser = argparse.ArgumentParser(description='Scrape Shopify stores for popularity data')
    parser.add_argument('--brand-url', help='Scrape a single brand URL')
    parser.add_argument('--brands-file', help='JSON file with list of brand URLs')
    parser.add_argument(
        '--bcorp-dir',
        default=os.path.expanduser(
            '~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/json/'
        ),
        help='Directory with bcorp-*.json files (extracts brand URLs)'
    )
    parser.add_argument('--output', default='./output/shopify_data.json')
    parser.add_argument('--discover-only', action='store_true',
                        help='Only discover collections, do not fetch products')
    parser.add_argument('--bestsellers-only', action='store_true',
                        help='Only fetch bestseller collection products, skip full catalog')
    parser.add_argument('--max-bestsellers', type=int, default=15,
                        help='Maximum bestseller products per brand (default: 15)')
    parser.add_argument('--use-discovery', type=str, default=None,
                        help='Path to existing discover-only JSON to reuse collection data')
    parser.add_argument('--from-neo4j', action='store_true',
                        help='Get brand URLs from Neo4j database instead of bcorp files')
    parser.add_argument('--neo4j-uri', default='bolt://localhost:7687',
                        help='Neo4j connection URI')
    parser.add_argument('--neo4j-password', default='presentagent2024',
                        help='Neo4j password')
    parser.add_argument('--limit', type=int, default=0,
                        help='Limit number of brands to scrape (0=all)')
    parser.add_argument('--resume-from', type=str, default=None,
                        help='Resume from this brand URL (skip earlier ones)')

    args = parser.parse_args()

    # Determine brand list
    if args.brand_url:
        brands = [args.brand_url]
    elif args.brands_file:
        with open(args.brands_file) as f:
            brands = json.load(f)
    elif args.from_neo4j:
        print(f"Extracting brand URLs from Neo4j ({args.neo4j_uri})...")
        brands = get_brand_urls_from_neo4j(args.neo4j_uri, args.neo4j_password)
    else:
        print(f"Extracting brand URLs from {args.bcorp_dir}...")
        brands = get_brand_urls_from_bcorp(args.bcorp_dir)

    print(f"Total brands: {len(brands)}")

    if args.resume_from:
        try:
            idx = brands.index(args.resume_from)
            brands = brands[idx:]
            print(f"Resuming from {args.resume_from} ({len(brands)} remaining)")
        except ValueError:
            print(f"Warning: {args.resume_from} not found, starting from beginning")

    if args.limit > 0:
        brands = brands[:args.limit]
        print(f"Limited to {len(brands)} brands")

    # Load existing discovery data if provided
    discovery_data = {}
    if args.use_discovery and os.path.exists(args.use_discovery):
        with open(args.use_discovery) as f:
            discovery_data = json.load(f)
        print(f"Loaded discovery data for {len(discovery_data)} brands from {args.use_discovery}")

    # Load existing results for resume support
    results = {}
    if os.path.exists(args.output):
        with open(args.output) as f:
            results = json.load(f)
        print(f"Loaded {len(results)} existing results from {args.output}")

    # Scrape
    for i, brand_url in enumerate(brands):
        normalized = normalize_brand_url(brand_url)

        # Skip if already scraped with actual product data
        if normalized in results:
            existing = results[normalized]
            has_product_data = (
                len(existing.get('bestseller_products', [])) > 0 or
                len(existing.get('all_products', [])) > 0
            )
            # In bestsellers-only mode, skip if we already have bestseller data
            if args.bestsellers_only and has_product_data:
                print(f"[{i+1}/{len(brands)}] Skipping {normalized} (already has data)")
                continue
            # In full mode, skip if we have all_products
            if not args.bestsellers_only and not args.discover_only and len(existing.get('all_products', [])) > 0:
                print(f"[{i+1}/{len(brands)}] Skipping {normalized} (already scraped)")
                continue

        print(f"[{i+1}/{len(brands)}] {normalized}")

        if args.discover_only:
            collections = discover_collections(normalized)
            bs_handle = find_bestseller_collection(collections)
            results[normalized] = {
                'brand_url': normalized,
                'collections': [
                    {'handle': c['handle'], 'title': c['title']}
                    for c in collections
                ],
                'bestseller_collection': bs_handle,
                'collection_count': len(collections),
            }
            print(f"    {len(collections)} collections, bestseller: {bs_handle or 'none'}")
            time.sleep(REQUEST_DELAY)
        else:
            # Check if we have pre-discovered collection data
            existing_collections = None
            existing_bs_handle = None
            disc = discovery_data.get(normalized) or results.get(normalized)
            if disc:
                existing_collections = disc.get('collections', [])
                existing_bs_handle = disc.get('bestseller_collection')

            result = scrape_brand(
                normalized,
                bestsellers_only=args.bestsellers_only,
                max_bestsellers=args.max_bestsellers,
                existing_collections=existing_collections,
                existing_bs_handle=existing_bs_handle,
            )
            results[normalized] = result

        # Save periodically (every 10 brands)
        if (i + 1) % 10 == 0:
            os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"  [Checkpoint saved: {len(results)} brands]")

    # Final save
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Summary
    brands_with_bs = sum(
        1 for r in results.values()
        if r.get('bestseller_collection')
    )
    total_bs_products = sum(
        len(r.get('bestseller_products', []))
        for r in results.values()
    )
    brands_with_bs_data = sum(
        1 for r in results.values()
        if len(r.get('bestseller_products', [])) > 0
    )
    print(f"\n=== SCRAPE SUMMARY ===")
    print(f"Brands scraped: {len(results)}")
    print(f"Brands with bestseller collection: {brands_with_bs}")
    print(f"Brands with bestseller data fetched: {brands_with_bs_data}")
    print(f"Total bestseller products: {total_bs_products}")
    print(f"Output: {args.output}")


if __name__ == '__main__':
    main()
