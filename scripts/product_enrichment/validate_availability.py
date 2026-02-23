#!/usr/bin/env python3
"""
Product availability validator — sample-checks product URLs to find dead products.

For each brand, checks a sample of product URLs (via .json endpoint).
If a product returns 404, it's marked available=false in Neo4j.
If it returns 200 with images, the imageUrl is set.

Uses per-brand rate limiting (1 req/sec) to avoid Shopify 429s.

Usage:
    python3 scripts/product_enrichment/validate_availability.py               # Dry run
    python3 scripts/product_enrichment/validate_availability.py --live         # Update Neo4j
    python3 scripts/product_enrichment/validate_availability.py --live --sample 20  # 20 per brand
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Tuple

NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "presentagent2024"

DEFAULT_SAMPLE_SIZE = 10  # Products to check per brand


def get_neo4j_driver():
    from neo4j import GraphDatabase
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def check_product_url(product_url: str) -> Tuple[Optional[str], int]:
    """Check if a product URL is alive and get its image.
    Returns (image_url_or_none, http_status_code).
    Status 0 = connection error/timeout."""
    json_url = product_url.rstrip("/") + ".json"
    try:
        req = urllib.request.Request(json_url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            product = data.get("product", {})
            image = product.get("image")
            images = product.get("images", [])
            image_url = None
            if image and image.get("src"):
                image_url = image["src"]
            elif images and images[0].get("src"):
                image_url = images[0]["src"]
            return (image_url, 200)
    except urllib.error.HTTPError as e:
        return (None, e.code)
    except Exception:
        return (None, 0)


def main():
    live = "--live" in sys.argv
    sample_size = DEFAULT_SAMPLE_SIZE
    if "--sample" in sys.argv:
        idx = sys.argv.index("--sample")
        if idx + 1 < len(sys.argv):
            sample_size = int(sys.argv[idx + 1])

    mode = "LIVE" if live else "DRY RUN"
    print(f"{'=' * 60}")
    print(f"  PRODUCT AVAILABILITY VALIDATOR ({mode})")
    print(f"  Sample size: {sample_size} per brand")
    print(f"{'=' * 60}")

    driver = get_neo4j_driver()

    # Get brands with products missing images (proxy for unchecked products)
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Product)
            WHERE p.imageUrl IS NULL AND p.available = true
            WITH p.brand_url AS brand, collect(p.product_url) AS urls, count(p) AS cnt
            ORDER BY cnt DESC
            RETURN brand, urls, cnt
        """)
        brand_data = [(r["brand"], r["urls"], r["cnt"]) for r in result]

    total_products = sum(cnt for _, _, cnt in brand_data)
    print(f"\n  Brands to check: {len(brand_data)}")
    print(f"  Products without images: {total_products}")
    print(f"  Est. requests: {min(sample_size, 500) * len(brand_data)}")

    all_images = {}  # url -> image_url
    all_dead = []  # 404 urls
    brand_stats = []  # (brand, total, alive, dead, images, rate_limited)

    for i, (brand, urls, total_count) in enumerate(brand_data):
        # Sample URLs (spread across the list, not just first N)
        step = max(1, len(urls) // sample_size)
        sample_urls = urls[::step][:sample_size]

        alive = 0
        dead = 0
        images = 0
        rate_limited = False
        brand_images = {}

        for url in sample_urls:
            image_url, status = check_product_url(url)

            if status == 200:
                alive += 1
                if image_url:
                    brand_images[url] = image_url
                    images += 1
            elif status == 404:
                dead += 1
                all_dead.append(url)
            elif status == 429:
                rate_limited = True
                break
            # status 0 = timeout/error, don't count

            time.sleep(1.0)  # 1 req/sec per brand

        all_images.update(brand_images)

        short = brand.replace("https://", "").replace("www.", "").rstrip("/")
        checked = alive + dead

        # If high dead rate in sample, extrapolate to mark ALL unchecked products
        dead_rate = dead / checked if checked > 0 else 0
        extrapolated_dead = 0

        if dead_rate >= 0.8 and checked >= 5 and live:
            # >80% dead in sample → mark all unchecked products from this brand unavailable
            unchecked_urls = [u for u in urls if u not in sample_urls and u not in all_dead]
            extrapolated_dead = len(unchecked_urls)
            all_dead.extend(unchecked_urls)

        if rate_limited:
            print(f"  [{i+1}/{len(brand_data)}] {short}: RATE LIMITED ({alive} alive, {dead} dead, {images} imgs)")
        elif checked > 0:
            status_icon = "DEAD" if dead_rate >= 0.8 else "MIXED" if dead_rate > 0.2 else "ALIVE"
            extra = f" +{extrapolated_dead} extrapolated" if extrapolated_dead > 0 else ""
            print(f"  [{i+1}/{len(brand_data)}] {short}: {status_icon} — {alive}/{checked} alive, {dead} dead, {images} imgs (of {total_count} total){extra}")

        brand_stats.append((brand, total_count, alive, dead, images, rate_limited, extrapolated_dead))

    # Summary
    total_alive = sum(s[2] for s in brand_stats)
    total_dead = len(all_dead)
    total_images_found = len(all_images)
    total_rate_limited = sum(1 for s in brand_stats if s[5])
    total_extrapolated = sum(s[6] for s in brand_stats)

    print(f"\n{'=' * 60}")
    print(f"  SUMMARY ({mode})")
    print(f"{'=' * 60}")
    print(f"  Brands checked: {len(brand_data)}")
    print(f"  Rate limited: {total_rate_limited}")
    print(f"  Sample results: {total_alive} alive, {total_dead - total_extrapolated} dead")
    print(f"  Extrapolated dead: {total_extrapolated} (from brands with >80% dead rate)")
    print(f"  Total to mark unavailable: {total_dead}")
    print(f"  Images found: {total_images_found}")

    if live:
        # Update images
        if all_images:
            with driver.session() as session:
                batch_size = 500
                items = list(all_images.items())
                img_updated = 0
                for j in range(0, len(items), batch_size):
                    batch = items[j:j + batch_size]
                    params = [{"url": u, "imageUrl": img} for u, img in batch]
                    result = session.run("""
                        UNWIND $params AS param
                        MATCH (p:Product {product_url: param.url})
                        SET p.imageUrl = param.imageUrl
                        RETURN count(p) AS updated
                    """, {"params": params})
                    img_updated += result.single()["updated"]
                print(f"\n  Images updated in Neo4j: {img_updated}")

        # Mark dead products unavailable
        if all_dead:
            with driver.session() as session:
                batch_size = 1000
                dead_updated = 0
                for j in range(0, len(all_dead), batch_size):
                    batch = all_dead[j:j + batch_size]
                    result = session.run("""
                        UNWIND $urls AS url
                        MATCH (p:Product {product_url: url})
                        SET p.available = false
                        RETURN count(p) AS updated
                    """, {"urls": batch})
                    dead_updated += result.single()["updated"]
                print(f"  Dead products marked unavailable: {dead_updated}")

        # Final coverage
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Product)
                RETURN
                    count(p) AS total,
                    count(p.imageUrl) AS with_image,
                    count(CASE WHEN p.available = true THEN 1 END) AS available,
                    count(CASE WHEN p.available = true AND p.imageUrl IS NOT NULL THEN 1 END) AS available_with_image,
                    count(CASE WHEN p.available = false THEN 1 END) AS unavailable
            """)
            r = result.single()
            avail = r['available']
            avail_img = r['available_with_image']
            pct = round(avail_img / avail * 100, 1) if avail > 0 else 0
            print(f"\n  Final stats:")
            print(f"    Total products: {r['total']}")
            print(f"    Available: {avail}")
            print(f"    Unavailable: {r['unavailable']}")
            print(f"    Available with images: {avail_img} ({pct}%)")
    else:
        print(f"\n  Run with --live to update Neo4j")

    driver.close()


if __name__ == "__main__":
    main()
