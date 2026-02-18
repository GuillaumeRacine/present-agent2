#!/usr/bin/env python3
"""
Composite Popularity Scorer - Merges all signals into ranked, enriched products.

Combines:
  - Parsed review stats (review count, avg rating, recommendation rate)
  - Recipient signals (gift suitability, relationship/occasion context)
  - Shopify data (bestseller rank, inventory, variant count)
  - Cleaned product metadata (category, tags, price)

Outputs a single enriched product catalog with:
  - popularity_score (0-100)
  - gift_suitability_score (0-1)
  - qualitative attributes for curation
  - all merged metadata

Usage:
    python3 composite_scorer.py \
        --reviews output/parsed_reviews.json \
        --signals output/recipient_enriched.json \
        --shopify output/shopify_data.json \
        --cleaned ~/...BCorp/BCorps_Products_Cleaned.json \
        --output output/enriched_catalog.json
"""

import json
import os
import re
import math
import argparse
from typing import Dict, Any, Optional, List
from collections import defaultdict
from urllib.parse import urlparse


def normalize_url(url: str) -> str:
    """Normalize product URL for matching across datasets."""
    url = url.strip().rstrip('/')
    # Remove double slashes in path
    url = re.sub(r'(?<!:)//+', '/', url)
    # Remove query params
    url = url.split('?')[0]
    return url.lower()


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    try:
        parsed = urlparse(url if '://' in url else 'https://' + url)
        return parsed.netloc.lower().replace('www.', '')
    except Exception:
        return url.lower().replace('https://', '').replace('http://', '').replace('www.', '')


def load_cleaned_products(path: str) -> Dict[str, Dict]:
    """Load the BCorps_Products_Cleaned.json (JSONL format)."""
    products = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                url = normalize_url(item.get('Product Page URL', ''))
                if url:
                    products[url] = item
            except json.JSONDecodeError:
                continue
    return products


def load_shopify_data(path: str) -> Dict[str, Dict]:
    """Load shopify scrape data, indexed by product handle/URL for matching."""
    if not os.path.exists(path):
        print(f"  Shopify data not found at {path}, skipping")
        return {}

    with open(path) as f:
        data = json.load(f)

    # Build lookup by domain -> product handle -> shopify data
    by_domain = {}
    for brand_url, brand_data in data.items():
        domain = extract_domain(brand_url)

        # Index bestsellers by handle with their rank
        bestsellers = {}
        for p in brand_data.get('bestseller_products', []):
            handle = p.get('handle', '')
            if handle:
                bestsellers[handle] = p

        # Index all products by handle
        all_products = {}
        for p in brand_data.get('all_products', []):
            handle = p.get('handle', '')
            if handle:
                all_products[handle] = p

        by_domain[domain] = {
            'bestsellers': bestsellers,
            'all_products': all_products,
            'stats': brand_data.get('stats', {}),
            'has_bestseller_collection': brand_data.get('bestseller_collection') is not None,
        }

    return by_domain


def match_shopify_product(
    product_url: str,
    shopify_by_domain: Dict
) -> Optional[Dict]:
    """Try to match a product to its Shopify data."""
    domain = extract_domain(product_url)
    brand_data = shopify_by_domain.get(domain)
    if not brand_data:
        return None

    # Extract handle from product URL
    # /products/organic-fleece-oversized-sweatshirt-nettle
    match = re.search(r'/products/([^/?#]+)', product_url)
    if not match:
        return None

    handle = match.group(1).lower()

    # Check bestsellers first
    bs = brand_data['bestsellers'].get(handle)
    if bs:
        return {**bs, 'is_bestseller': True}

    # Then all products
    ap = brand_data['all_products'].get(handle)
    if ap:
        return {**ap, 'is_bestseller': False}

    return None


def compute_popularity_score(
    review_stats: Dict,
    gift_profile: Dict,
    shopify_match: Optional[Dict],
    brand_avg_reviews: float,
) -> float:
    """
    Compute a composite popularity score (0-100).

    Weights:
        - Review volume (relative to brand avg): 25%
        - Average rating: 25%
        - Recommendation rate: 15%
        - Bestseller status: 15%
        - Gift suitability: 10%
        - Availability/freshness: 10%
    """
    score = 0.0

    # --- Review volume (25 pts) ---
    review_count = review_stats.get('review_count', 0)
    if review_count > 0:
        if brand_avg_reviews > 0:
            # Log-scaled relative to brand average
            relative = review_count / brand_avg_reviews
            volume_score = min(math.log1p(relative) / math.log1p(5) * 25, 25)
        else:
            volume_score = min(math.log1p(review_count) / math.log1p(20) * 25, 25)
        score += volume_score

    # --- Average rating (25 pts) ---
    avg_rating = review_stats.get('avg_rating', 0)
    if avg_rating > 0:
        # 3.0 = 0 pts, 5.0 = 25 pts (linear above 3)
        rating_score = max(0, (avg_rating - 3.0) / 2.0 * 25)
        score += rating_score

    # --- Recommendation rate (15 pts) ---
    rec_rate = review_stats.get('recommendation_rate', 0)
    score += rec_rate * 15

    # --- Bestseller status (15 pts) ---
    if shopify_match:
        if shopify_match.get('is_bestseller'):
            rank = shopify_match.get('bestseller_rank', 999)
            # Rank 1 = 15 pts, rank 50 = ~5 pts, rank 100+ = ~2 pts
            bs_score = max(2, 15 * math.exp(-rank / 30))
            score += bs_score
        else:
            # Not a bestseller but available = 2 pts
            if shopify_match.get('availability_ratio', 0) > 0:
                score += 2

    # --- Gift suitability (10 pts) ---
    gift_score = gift_profile.get('gift_suitability_score', 0)
    score += gift_score * 10

    # --- Availability/freshness (10 pts) ---
    if shopify_match:
        avail = shopify_match.get('availability_ratio', 0)
        score += avail * 5  # up to 5 pts for availability

        # Image count as quality proxy
        images = shopify_match.get('image_count', 0)
        score += min(images / 10 * 5, 5)  # up to 5 pts
    elif review_count > 0:
        score += 3  # some baseline if we have reviews

    return round(min(score, 100), 1)


def build_qualitative_attributes(
    product: Dict,
    gift_profile: Dict,
    shopify_match: Optional[Dict],
    cleaned_product: Optional[Dict],
) -> Dict[str, Any]:
    """Build qualitative attributes for curation and contextual search."""
    attrs = {}

    # From gift profile
    if gift_profile.get('gift_review_count', 0) > 0:
        attrs['gift_proven'] = True
        attrs['gift_for_relationships'] = list(
            gift_profile.get('relationships_mentioned', {}).keys()
        )[:5]
        attrs['gift_for_occasions'] = list(
            gift_profile.get('occasions_mentioned', {}).keys()
        )[:5]
        attrs['gift_quotes'] = gift_profile.get('gift_quotes', [])[:3]

        # Derive gift personas
        rels = gift_profile.get('relationships_mentioned', {})
        if any(r in rels for r in ['wife', 'husband', 'partner']):
            attrs.setdefault('gift_personas', []).append('romantic_partner')
        if any(r in rels for r in ['mother', 'father', 'grandparent']):
            attrs.setdefault('gift_personas', []).append('parent_elder')
        if any(r in rels for r in ['friend', 'coworker', 'boss']):
            attrs.setdefault('gift_personas', []).append('social_professional')
        if any(r in rels for r in ['daughter', 'son', 'children']):
            attrs.setdefault('gift_personas', []).append('child_young_adult')

    # From cleaned product metadata
    if cleaned_product:
        if cleaned_product.get('Product Vertical'):
            attrs['vertical'] = cleaned_product['Product Vertical']
        if cleaned_product.get('Subcategory'):
            attrs['subcategory'] = cleaned_product['Subcategory']
        if cleaned_product.get('Product Tags'):
            tags = cleaned_product['Product Tags']
            if isinstance(tags, str):
                attrs['product_tags'] = [t.strip() for t in tags.split(',') if t.strip()]
            else:
                attrs['product_tags'] = tags
        if cleaned_product.get('Style & Materials'):
            mats = cleaned_product['Style & Materials']
            if isinstance(mats, str):
                attrs['materials'] = [m.strip() for m in mats.split(',') if m.strip()]
        if cleaned_product.get('availability'):
            attrs['availability'] = cleaned_product['availability']

    # From shopify match
    if shopify_match:
        if shopify_match.get('tags'):
            existing = set(attrs.get('product_tags', []))
            for tag in shopify_match['tags']:
                if tag and tag not in existing:
                    attrs.setdefault('product_tags', []).append(tag)

        if shopify_match.get('is_bestseller'):
            attrs['is_bestseller'] = True
            attrs['bestseller_rank'] = shopify_match.get('bestseller_rank')

        attrs['variant_count'] = shopify_match.get('variant_count', 0)

    # From review stats
    review_stats = product.get('review_stats', {})
    if review_stats.get('fit_tendency'):
        attrs['fit_tendency'] = review_stats['fit_tendency']

    return attrs


def merge_and_score(
    reviews_path: str,
    signals_path: str,
    shopify_path: str,
    cleaned_path: str,
) -> List[Dict]:
    """Merge all data sources and compute scores."""

    # Load all sources
    print("Loading data sources...")

    with open(reviews_path) as f:
        parsed_reviews = json.load(f)
    print(f"  Parsed reviews: {len(parsed_reviews)} products")

    with open(signals_path) as f:
        signal_data = json.load(f)
    print(f"  Recipient signals: {len(signal_data)} products")

    shopify_by_domain = load_shopify_data(shopify_path)
    print(f"  Shopify data: {len(shopify_by_domain)} brands")

    cleaned_products = {}
    if os.path.exists(cleaned_path):
        cleaned_products = load_cleaned_products(cleaned_path)
        print(f"  Cleaned metadata: {len(cleaned_products)} products")

    # Compute per-brand average review counts for relative scoring
    brand_review_counts = defaultdict(list)
    for url, product in parsed_reviews.items():
        brand = product.get('brand_url', '')
        count = product.get('review_stats', {}).get('review_count', 0)
        if count > 0:
            brand_review_counts[brand].append(count)

    brand_avg_reviews = {}
    for brand, counts in brand_review_counts.items():
        brand_avg_reviews[brand] = sum(counts) / len(counts) if counts else 0

    # Merge
    print("\nMerging and scoring...")
    enriched = []

    for url, product in signal_data.items():
        # Get components
        review_stats = product.get('review_stats', {})
        gift_profile = product.get('gift_profile', {})
        brand = product.get('brand_url', '')

        # Match shopify data
        shopify_match = match_shopify_product(url, shopify_by_domain)

        # Match cleaned metadata
        norm_url = normalize_url(url)
        cleaned = cleaned_products.get(norm_url)

        # Compute scores
        brand_avg = brand_avg_reviews.get(brand, 0)
        popularity = compute_popularity_score(
            review_stats, gift_profile, shopify_match, brand_avg
        )

        # Build qualitative attributes
        qual_attrs = build_qualitative_attributes(
            product, gift_profile, shopify_match, cleaned
        )

        enriched_product = {
            'product_url': url,
            'product_title': product.get('product_title', ''),
            'brand_url': brand,
            'price': product.get('price', ''),
            'currency': product.get('currency', 'USD'),
            'description': product.get('description', ''),
            # Scores
            'popularity_score': popularity,
            'gift_suitability_score': gift_profile.get('gift_suitability_score', 0),
            # Review summary
            'review_count': review_stats.get('review_count', 0),
            'avg_rating': review_stats.get('avg_rating'),
            'recommendation_rate': review_stats.get('recommendation_rate'),
            'rating_distribution': review_stats.get('rating_distribution'),
            # Gift context
            'gift_for_relationships': qual_attrs.get('gift_for_relationships', []),
            'gift_for_occasions': qual_attrs.get('gift_for_occasions', []),
            'gift_personas': qual_attrs.get('gift_personas', []),
            'gift_quotes': qual_attrs.get('gift_quotes', []),
            'gift_proven': qual_attrs.get('gift_proven', False),
            # Product attributes
            'qualitative_attributes': qual_attrs,
            # Bestseller
            'is_bestseller': qual_attrs.get('is_bestseller', False),
            'bestseller_rank': qual_attrs.get('bestseller_rank'),
        }

        enriched.append(enriched_product)

    # Sort by popularity score
    enriched.sort(key=lambda x: x['popularity_score'], reverse=True)

    print(f"Enriched {len(enriched)} products")
    return enriched


def print_catalog_summary(enriched: List[Dict]):
    """Print a summary of the enriched catalog."""

    scored = [p for p in enriched if p['popularity_score'] > 0]
    gift_proven = [p for p in enriched if p.get('gift_proven')]
    bestsellers = [p for p in enriched if p.get('is_bestseller')]

    print(f"\n=== ENRICHED CATALOG SUMMARY ===")
    print(f"Total products: {len(enriched)}")
    print(f"Products with popularity score > 0: {len(scored)}")
    print(f"Gift-proven products: {len(gift_proven)}")
    print(f"Bestsellers: {len(bestsellers)}")

    print(f"\n=== TOP 30 BY POPULARITY SCORE ===")
    for p in enriched[:30]:
        bs = " [BS]" if p.get('is_bestseller') else ""
        gp = " [GIFT]" if p.get('gift_proven') else ""
        print(
            f"  {p['popularity_score']:5.1f} | "
            f"★{p.get('avg_rating', 'N/A')} "
            f"({p['review_count']} reviews) | "
            f"${p.get('price', '?')} | "
            f"{p['product_title'][:40]}{bs}{gp} | "
            f"{p['brand_url']}"
        )

    print(f"\n=== TOP 15 GIFT-PROVEN PRODUCTS ===")
    gift_sorted = sorted(gift_proven, key=lambda x: x['gift_suitability_score'], reverse=True)
    for p in gift_sorted[:15]:
        rels = ', '.join(p.get('gift_for_relationships', [])[:3]) or 'general'
        occs = ', '.join(p.get('gift_for_occasions', [])[:2]) or 'any'
        print(
            f"  Gift:{p['gift_suitability_score']:.2f} Pop:{p['popularity_score']:5.1f} | "
            f"{p['product_title'][:35]} | "
            f"For: {rels} | Occasion: {occs}"
        )

    # Brand rankings
    brand_scores = defaultdict(list)
    for p in enriched:
        if p['popularity_score'] > 0:
            brand_scores[p['brand_url']].append(p['popularity_score'])

    print(f"\n=== TOP 20 BRANDS BY AVG POPULARITY ===")
    brand_avg = [
        (brand, sum(scores) / len(scores), len(scores))
        for brand, scores in brand_scores.items()
        if len(scores) >= 3
    ]
    brand_avg.sort(key=lambda x: x[1], reverse=True)
    for brand, avg, count in brand_avg[:20]:
        print(f"  {avg:5.1f} avg ({count} products) | {brand}")


def main():
    parser = argparse.ArgumentParser(description='Compute composite popularity scores')
    parser.add_argument('--reviews', default='./output/parsed_reviews.json')
    parser.add_argument('--signals', default='./output/recipient_enriched.json')
    parser.add_argument('--shopify', default='./output/shopify_data.json')
    parser.add_argument(
        '--cleaned',
        default=os.path.expanduser(
            '~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/BCorps_Products_Cleaned.json'
        )
    )
    parser.add_argument('--output', default='./output/enriched_catalog.json')

    args = parser.parse_args()

    enriched = merge_and_score(
        args.reviews, args.signals, args.shopify, args.cleaned
    )

    print_catalog_summary(enriched)

    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"\nOutput: {args.output}")
    print(f"Size: {os.path.getsize(args.output) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    main()
