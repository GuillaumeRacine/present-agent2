#!/usr/bin/env python3
"""
Load product images from Shopify stores into Neo4j.

For each brand in Neo4j, fetches /products.json from Shopify,
extracts the first image URL per product, and updates the imageUrl
property on matching Product nodes.

Usage:
    python3 scripts/product_enrichment/load_images.py           # Dry run (report only)
    python3 scripts/product_enrichment/load_images.py --live     # Actually update Neo4j
    python3 scripts/product_enrichment/load_images.py --live --brand "goodeeworld.com"  # Single brand
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Tuple

# Neo4j connection
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "presentagent2024"

# Rate limiting
REQUESTS_PER_SECOND = 2  # Conservative to avoid rate limits
REQUEST_TIMEOUT = 15


def get_neo4j_driver():
    """Connect to Neo4j."""
    try:
        from neo4j import GraphDatabase
        return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    except ImportError:
        print("ERROR: neo4j Python driver not installed. Run: pip3 install neo4j")
        sys.exit(1)


def get_brands_from_neo4j(driver, brand_filter: Optional[str] = None) -> List[Dict]:
    """Get unique brand URLs from Neo4j products that lack imageUrl."""
    with driver.session() as session:
        query = """
        MATCH (p:Product)
        WHERE p.imageUrl IS NULL AND p.brand_url IS NOT NULL
        WITH p.brand_url AS brand_url, count(p) AS product_count
        RETURN brand_url, product_count
        ORDER BY product_count DESC
        """
        result = session.run(query)
        brands = []
        for record in result:
            brand_url = record["brand_url"]
            if brand_filter and brand_filter.lower() not in brand_url.lower():
                continue
            brands.append({
                "brand_url": brand_url,
                "product_count": record["product_count"],
            })
        return brands


def normalize_brand_url(brand_url: str) -> str:
    """Normalize brand URL to base domain for Shopify API."""
    url = brand_url.strip().rstrip("/")
    if not url.startswith("http"):
        url = "https://" + url
    # Remove trailing paths like /collections/all
    parts = url.split("/")
    if len(parts) > 3:
        url = "/".join(parts[:3])
    return url


def fetch_shopify_products(brand_url: str, page: int = 1, limit: int = 250) -> Tuple[List[Dict], bool]:
    """Fetch products from Shopify /products.json API.
    Returns (products, has_more)."""
    base = normalize_brand_url(brand_url)
    url = f"{base}/products.json?limit={limit}&page={page}"

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; PresentAgent/1.0)",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            products = data.get("products", [])
            has_more = len(products) == limit
            return products, has_more
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"    Rate limited on {base}, waiting 5s...")
            time.sleep(5)
            return fetch_shopify_products(brand_url, page, limit)
        elif e.code in (401, 403, 404):
            return [], False
        else:
            print(f"    HTTP {e.code} for {base}: {e.reason}")
            return [], False
    except Exception as e:
        print(f"    Error fetching {base}: {e}")
        return [], False


def fetch_all_shopify_products(brand_url: str) -> List[Dict]:
    """Fetch all products from a Shopify store (paginated)."""
    all_products = []
    page = 1
    while True:
        products, has_more = fetch_shopify_products(brand_url, page=page)
        all_products.extend(products)
        if not has_more or page >= 10:  # Safety limit
            break
        page += 1
        time.sleep(1 / REQUESTS_PER_SECOND)
    return all_products


def extract_handle_image_map(products: List[Dict]) -> Dict[str, str]:
    """Extract handle -> image_url mapping from Shopify products."""
    handle_map = {}

    for product in products:
        handle = product.get("handle")
        if not handle:
            continue

        # Get first image (featured image)
        image = product.get("image")
        images = product.get("images", [])

        image_url = None
        if image and image.get("src"):
            image_url = image["src"]
        elif images and images[0].get("src"):
            image_url = images[0]["src"]

        if image_url:
            handle_map[handle] = image_url

    return handle_map


def update_neo4j_images_by_handle(driver, handle_map: Dict[str, str], brand_url: str, live: bool = False) -> int:
    """Update Neo4j Product nodes with imageUrl using handle-based matching.

    Matches products by extracting the handle from product_url and comparing
    to handles from the Shopify API. This is more resilient than exact URL matching
    since product_url format may vary (www/no-www, trailing slashes, etc).
    """
    if not handle_map:
        return 0

    if not live:
        return len(handle_map)

    updated = 0
    batch_size = 500
    items = list(handle_map.items())

    # Normalize brand_url variants for matching
    base = normalize_brand_url(brand_url)
    # Also try with/without www and with/without trailing slash
    brand_variants = set()
    brand_variants.add(base)
    brand_variants.add(base + "/")
    if "://www." in base:
        brand_variants.add(base.replace("://www.", "://"))
        brand_variants.add(base.replace("://www.", "://") + "/")
    else:
        domain = base.split("://")[1]
        brand_variants.add(f"https://www.{domain}")
        brand_variants.add(f"https://www.{domain}/")

    with driver.session() as session:
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            params = [{"handle": h, "imageUrl": img} for h, img in batch]

            # Match by handle suffix in product_url for any brand_url variant
            result = session.run("""
                UNWIND $params AS param
                MATCH (p:Product)
                WHERE p.imageUrl IS NULL
                  AND p.brand_url IN $brandVariants
                  AND p.product_url ENDS WITH ('/products/' + param.handle)
                SET p.imageUrl = param.imageUrl
                RETURN count(p) AS updated
            """, {"params": params, "brandVariants": list(brand_variants)})

            batch_updated = result.single()["updated"]
            updated += batch_updated

    return updated


def main():
    live = "--live" in sys.argv
    brand_filter = None
    if "--brand" in sys.argv:
        idx = sys.argv.index("--brand")
        if idx + 1 < len(sys.argv):
            brand_filter = sys.argv[idx + 1]

    mode = "LIVE" if live else "DRY RUN"
    print(f"{'=' * 60}")
    print(f"  PRODUCT IMAGE LOADER ({mode})")
    print(f"{'=' * 60}")

    driver = get_neo4j_driver()

    # Get brands needing images
    brands = get_brands_from_neo4j(driver, brand_filter)
    print(f"\n  Brands needing images: {len(brands)}")
    total_products = sum(b["product_count"] for b in brands)
    print(f"  Products without images: {total_products}")

    if not brands:
        print("  Nothing to do!")
        return

    # Process each brand
    total_mapped = 0
    total_updated = 0
    failed_brands = []
    successful_brands = []

    for i, brand in enumerate(brands):
        brand_url = brand["brand_url"]
        product_count = brand["product_count"]
        print(f"\n  [{i+1}/{len(brands)}] {brand_url} ({product_count} products)")

        # Fetch from Shopify
        products = fetch_all_shopify_products(brand_url)
        if not products:
            print(f"    No Shopify products found (may not be Shopify store)")
            failed_brands.append(brand_url)
            continue

        # Extract handle -> image map
        handle_map = extract_handle_image_map(products)
        print(f"    Fetched {len(products)} products, {len(handle_map)} have images")

        if handle_map:
            updated = update_neo4j_images_by_handle(driver, handle_map, brand_url, live=live)
            total_mapped += len(handle_map)
            total_updated += updated
            print(f"    {'Updated' if live else 'Would update'}: {updated} products")
            successful_brands.append((brand_url, updated))
        else:
            failed_brands.append(brand_url)

        # Rate limit between brands
        time.sleep(1 / REQUESTS_PER_SECOND)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"  SUMMARY ({mode})")
    print(f"{'=' * 60}")
    print(f"  Brands processed: {len(brands)}")
    print(f"  Brands with images: {len(successful_brands)}")
    print(f"  Brands failed/non-Shopify: {len(failed_brands)}")
    print(f"  Total images mapped: {total_mapped}")
    print(f"  Total Neo4j updates: {total_updated}")

    if not live:
        print(f"\n  Run with --live to actually update Neo4j")

    # Verify
    if live:
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Product)
                RETURN
                    count(p) AS total,
                    count(p.imageUrl) AS with_image,
                    toFloat(count(p.imageUrl)) / count(p) * 100 AS coverage_pct
            """)
            record = result.single()
            print(f"\n  Neo4j image coverage: {record['with_image']}/{record['total']} ({record['coverage_pct']:.1f}%)")

    # PASS 2: Individual product URL checks for remaining products
    if live and "--skip-pass2" not in sys.argv:
        pass2_validate_products(driver, brand_filter)

    driver.close()


def pass2_validate_products(driver, brand_filter: Optional[str] = None):
    """Pass 2: For products still missing images, fetch individual product .json
    to get image and validate the product still exists.
    Products returning 404 are marked available=false.

    Uses per-store sequential processing with rate limiting to avoid 429s."""

    print(f"\n{'=' * 60}")
    print(f"  PASS 2: Individual product validation")
    print(f"{'=' * 60}")

    # Group products by brand for per-store rate limiting
    with driver.session() as session:
        query = """
            MATCH (p:Product)
            WHERE p.imageUrl IS NULL AND p.product_url CONTAINS '/products/'
        """
        if brand_filter:
            query += f" AND toLower(p.brand_url) CONTAINS toLower('{brand_filter}')"
        query += """
            RETURN p.brand_url AS brand, collect(p.product_url) AS urls
            ORDER BY size(collect(p.product_url)) DESC
        """
        result = session.run(query)
        brand_urls = [(r["brand"], r["urls"]) for r in result]

    total_urls = sum(len(urls) for _, urls in brand_urls)
    print(f"  Products to validate: {total_urls} across {len(brand_urls)} brands")
    if not brand_urls:
        print("  Nothing to do!")
        return

    found_images = {}  # url -> image_url
    dead_urls = []  # 404 products
    rate_limited_brands = []

    def check_product(product_url: str) -> Tuple[str, Optional[str], int]:
        """Check a single product URL. Returns (url, image_url_or_none, status_code)."""
        json_url = product_url.rstrip("/") + ".json"
        try:
            req = urllib.request.Request(json_url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                product = data.get("product", {})
                images = product.get("images", [])
                image = product.get("image")
                image_url = None
                if image and image.get("src"):
                    image_url = image["src"]
                elif images and images[0].get("src"):
                    image_url = images[0]["src"]
                return (product_url, image_url, 200)
        except urllib.error.HTTPError as e:
            return (product_url, None, e.code)
        except Exception:
            return (product_url, None, 0)

    # Process brand by brand, sequentially within each brand (1 req/sec)
    checked = 0
    for brand_idx, (brand, urls) in enumerate(brand_urls):
        # Cap per-brand to 500 URLs to keep runtime reasonable
        sample = urls[:500]
        brand_images = 0
        brand_dead = 0
        brand_429 = False

        for url in sample:
            _, image_url, status = check_product(url)
            checked += 1

            if status == 200 and image_url:
                found_images[url] = image_url
                brand_images += 1
            elif status == 404:
                dead_urls.append(url)
                brand_dead += 1
            elif status == 429:
                # Rate limited — stop this brand, move to next
                brand_429 = True
                rate_limited_brands.append(brand)
                break

            # Throttle: 1 request per second within a brand
            time.sleep(1.0)

        short_brand = brand.replace("https://", "").replace("www.", "").rstrip("/")
        if brand_429:
            print(f"  [{brand_idx+1}/{len(brand_urls)}] {short_brand}: RATE LIMITED after {brand_images} imgs, {brand_dead} dead")
        elif brand_images > 0 or brand_dead > 0:
            print(f"  [{brand_idx+1}/{len(brand_urls)}] {short_brand}: {brand_images} imgs, {brand_dead} dead (of {len(sample)})")

        if checked % 500 == 0:
            print(f"    --- Progress: {checked}/{total_urls} checked, {len(found_images)} imgs, {len(dead_urls)} dead ---")

    print(f"\n  Validation complete:")
    print(f"    Checked: {checked}")
    print(f"    Found images: {len(found_images)}")
    print(f"    Dead (404): {len(dead_urls)}")
    print(f"    Other/timeout: {checked - len(found_images) - len(dead_urls)}")

    # Update images
    if found_images:
        with driver.session() as session:
            batch_size = 500
            items = list(found_images.items())
            img_updated = 0
            for i in range(0, len(items), batch_size):
                batch = items[i:i + batch_size]
                params = [{"url": url, "imageUrl": img} for url, img in batch]
                result = session.run("""
                    UNWIND $params AS param
                    MATCH (p:Product {product_url: param.url})
                    SET p.imageUrl = param.imageUrl
                    RETURN count(p) AS updated
                """, {"params": params})
                img_updated += result.single()["updated"]
            print(f"    Images updated: {img_updated}")

    # Mark dead products as unavailable
    if dead_urls:
        with driver.session() as session:
            batch_size = 500
            dead_updated = 0
            for i in range(0, len(dead_urls), batch_size):
                batch = dead_urls[i:i + batch_size]
                result = session.run("""
                    UNWIND $urls AS url
                    MATCH (p:Product {product_url: url})
                    SET p.available = false
                    RETURN count(p) AS updated
                """, {"urls": batch})
                dead_updated += result.single()["updated"]
            print(f"    Dead products marked unavailable: {dead_updated}")

    # Final stats
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Product)
            RETURN
                count(p) AS total,
                count(p.imageUrl) AS with_image,
                count(CASE WHEN p.available = false THEN 1 END) AS unavailable,
                round(toFloat(count(p.imageUrl)) / count(p) * 100, 1) AS img_pct
        """)
        r = result.single()
        print(f"\n  Final stats:")
        print(f"    Total products: {r['total']}")
        print(f"    With images: {r['with_image']} ({r['img_pct']}%)")
        print(f"    Unavailable (404): {r['unavailable']}")


if __name__ == "__main__":
    main()
