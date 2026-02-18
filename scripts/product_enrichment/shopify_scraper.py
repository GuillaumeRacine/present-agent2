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


def scrape_brand(brand_url: str) -> Dict[str, Any]:
    """Scrape a single brand for popularity data."""
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

    # Step 1: Discover collections
    collections = discover_collections(brand_url)
    result['collections'] = [
        {'handle': c['handle'], 'title': c['title']}
        for c in collections
    ]
    time.sleep(REQUEST_DELAY)

    # Step 2: Find bestseller collection
    bs_handle = find_bestseller_collection(collections)
    if bs_handle:
        result['bestseller_collection'] = bs_handle
        print(f"    Found bestseller collection: {bs_handle}")

        bs_products = fetch_collection_products(brand_url, bs_handle)
        result['bestseller_products'] = [
            extract_product_popularity(p, rank=i + 1)
            for i, p in enumerate(bs_products)
        ]
        print(f"    Fetched {len(result['bestseller_products'])} bestseller products")
        time.sleep(REQUEST_DELAY)
    else:
        print(f"    No bestseller collection found")

    # Step 3: Fetch full catalog
    all_products = fetch_all_products(brand_url)
    result['all_products'] = [
        extract_product_popularity(p) for p in all_products
    ]
    print(f"    Fetched {len(result['all_products'])} total products")

    # Step 4: Compute brand-level stats
    result['stats'] = {
        'total_products': len(result['all_products']),
        'collection_count': len(collections),
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

    # Load existing results for resume support
    results = {}
    if os.path.exists(args.output):
        with open(args.output) as f:
            results = json.load(f)
        print(f"Loaded {len(results)} existing results from {args.output}")

    # Scrape
    for i, brand_url in enumerate(brands):
        normalized = normalize_brand_url(brand_url)
        if normalized in results:
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
            result = scrape_brand(normalized)
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
    print(f"\n=== SCRAPE SUMMARY ===")
    print(f"Brands scraped: {len(results)}")
    print(f"Brands with bestseller collection: {brands_with_bs}")
    print(f"Output: {args.output}")


if __name__ == '__main__':
    main()
