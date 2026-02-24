#!/usr/bin/env python3
"""
Stage 1: CSV Filter & Rank

Reads the Storeleads domains_export.csv (2.8M rows), applies deterministic
filtering and ranking to produce a shortlist of high-value, gift-relevant
Shopify stores.

Usage:
    python3 scripts/pipeline/filter_stores.py                      # Top 500 stores
    python3 scripts/pipeline/filter_stores.py --limit 1000         # Top 1000
    python3 scripts/pipeline/filter_stores.py --offset 2000 --limit 2000  # Next 2000
    python3 scripts/pipeline/filter_stores.py --min-sales 50000    # Higher sales threshold
    python3 scripts/pipeline/filter_stores.py --dry-run             # Print stats, no output file
"""

import csv
import json
import os
import re
import sys
import argparse
import time
from typing import Dict, List, Any, Optional

# --- Constants ---

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_PATH = os.path.join(PROJECT_ROOT, 'domains_export.csv')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data', 'pipeline')
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'shortlisted_stores.json')

# Gift-relevant top-level categories from Storeleads taxonomy
GIFT_RELEVANT_CATEGORIES = {
    '/Home & Garden',
    '/Beauty & Fitness',
    '/Food & Drink',
    '/Health',
    '/Sports',
    '/Arts & Entertainment',
    '/Toys & Hobbies',      # not in original storeleads but check
    '/Pets & Animals',
    '/Gifts & Special Events',
    '/Games',
    '/Books & Literature',
    '/Jewelry & Accessories',  # high gift potential
    '/Apparel',               # some gift potential (accessories, premium items)
    '/Shopping',              # generic but includes gift shops
}

# Category gift-relevance tier bonus (higher = more gift-relevant)
CATEGORY_TIER = {
    '/Gifts & Special Events': 1.0,
    '/Home & Garden': 0.9,
    '/Beauty & Fitness': 0.85,
    '/Food & Drink': 0.85,
    '/Arts & Entertainment': 0.8,
    '/Jewelry & Accessories': 0.8,
    '/Toys & Hobbies': 0.75,
    '/Books & Literature': 0.7,
    '/Pets & Animals': 0.7,
    '/Health': 0.65,
    '/Sports': 0.6,
    '/Games': 0.6,
    '/Shopping': 0.5,
    '/Apparel': 0.4,
}

# Tags to exclude (dropshippers, print-on-demand)
EXCLUDE_TAGS = {'Dropshipper', 'Print on Demand', 'Drop Shipping'}

# Allowed countries (shipping-friendly English-speaking + EU)
ALLOWED_COUNTRIES = {
    'US', 'CA', 'GB', 'AU', 'NZ', 'IE',
    'DE', 'FR', 'NL', 'SE', 'DK', 'NO', 'FI', 'AT', 'CH', 'BE',
    'IT', 'ES', 'PT',
}


def parse_sales(sales_str: str) -> float:
    """Parse 'USD $107,011,565.52' to float."""
    if not sales_str:
        return 0.0
    # Remove currency prefix and formatting
    cleaned = re.sub(r'[A-Z]{3}\s*\$?\s*', '', sales_str)
    cleaned = cleaned.replace(',', '').strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def parse_int(val: str) -> int:
    """Parse string to int, defaulting to 0."""
    if not val:
        return 0
    try:
        return int(float(val.replace(',', '').strip()))
    except (ValueError, TypeError):
        return 0


def parse_float(val: str) -> float:
    """Parse string to float, defaulting to 0.0."""
    if not val:
        return 0.0
    try:
        return float(val.replace(',', '').strip())
    except (ValueError, TypeError):
        return 0.0


def matches_gift_category(category: str) -> bool:
    """Check if category starts with any gift-relevant prefix."""
    if not category:
        return False
    for prefix in GIFT_RELEVANT_CATEGORIES:
        if category.startswith(prefix):
            return True
    return False


def get_category_tier(category: str) -> float:
    """Get category tier bonus for ranking."""
    if not category:
        return 0.0
    for prefix, tier in CATEGORY_TIER.items():
        if category.startswith(prefix):
            return tier
    return 0.0


def has_exclude_tag(tags: str) -> bool:
    """Check if tags contain any exclusion tags."""
    if not tags:
        return False
    tag_list = [t.strip() for t in tags.split(':')]
    for tag in tag_list:
        if tag in EXCLUDE_TAGS:
            return True
    return False


def normalize_0_1(values: List[float]) -> List[float]:
    """Min-max normalize a list of values to [0, 1]."""
    if not values:
        return []
    min_v = min(values)
    max_v = max(values)
    if max_v == min_v:
        return [0.5] * len(values)
    return [(v - min_v) / (max_v - min_v) for v in values]


def main():
    parser = argparse.ArgumentParser(description='Stage 1: Filter and rank Shopify stores for gift relevance')
    parser.add_argument('--csv', default=CSV_PATH, help='Path to domains_export.csv')
    parser.add_argument('--output', default=OUTPUT_PATH, help='Output JSON path')
    parser.add_argument('--limit', type=int, default=500, help='Max stores to output (default: 500)')
    parser.add_argument('--offset', type=int, default=0, help='Start offset after ranking (default: 0)')
    parser.add_argument('--min-sales', type=float, default=10000, help='Min monthly sales USD (default: $10K)')
    parser.add_argument('--min-rating', type=float, default=0.0, help='Min avg rating (default: 0 = no filter)')
    parser.add_argument('--dry-run', action='store_true', help='Print stats only, no output file')
    parser.add_argument('--learnings', type=str, default=None,
                        help='Path to run_learnings.json for adjusted weights')
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  STAGE 1: CSV FILTER & RANK")
    print(f"{'='*60}")
    print(f"  CSV: {args.csv}")
    print(f"  Min monthly sales: ${args.min_sales:,.0f}")
    print(f"  Offset: {args.offset}")
    print(f"  Output limit: {args.limit}")
    print()

    # Load learnings if available (feedback loop from Stage 6)
    learnings = {}
    learnings_path = args.learnings or os.path.join(OUTPUT_DIR, 'run_learnings.json')
    if os.path.exists(learnings_path):
        with open(learnings_path) as f:
            learnings = json.load(f)
        print(f"  Loaded learnings from {learnings_path}")
        if learnings.get('category_weight_adjustments'):
            print(f"  Applying category weight adjustments from previous run")

    # Pass 1: Read and filter
    start_time = time.time()
    total_rows = 0
    filtered_stores: List[Dict[str, Any]] = []

    stats = {
        'total_rows': 0,
        'no_category': 0,
        'non_gift_category': 0,
        'below_sales': 0,
        'excluded_tags': 0,
        'excluded_country': 0,
        'no_domain_url': 0,
        'passed_filters': 0,
        'category_distribution': {},
    }

    print(f"  Reading CSV (this may take a moment for 2.8M rows)...")

    with open(args.csv, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1

            if total_rows % 500000 == 0:
                print(f"    Processed {total_rows:,} rows...")

            # --- Filters ---

            # Must have domain_url
            domain_url = (row.get('domain_url') or '').strip()
            if not domain_url:
                stats['no_domain_url'] += 1
                continue

            # Category filter
            category = (row.get('categories') or '').strip()
            if not category:
                stats['no_category'] += 1
                continue

            if not matches_gift_category(category):
                stats['non_gift_category'] += 1
                continue

            # Sales filter
            monthly_sales = parse_sales(row.get('estimated_monthly_sales', ''))
            if monthly_sales < args.min_sales:
                stats['below_sales'] += 1
                continue

            # Exclude tags (dropshipper, print-on-demand)
            tags = (row.get('tags') or '').strip()
            if has_exclude_tag(tags):
                stats['excluded_tags'] += 1
                continue

            # Country filter
            country = (row.get('country_code') or '').strip().upper()
            if country and country not in ALLOWED_COUNTRIES:
                stats['excluded_country'] += 1
                continue

            # --- Passed all filters ---
            stats['passed_filters'] += 1

            # Parse additional fields for ranking
            monthly_visits = parse_int(row.get('estimated_monthly_visits', ''))
            avg_rating = parse_float(row.get('combined_avgrating', ''))
            review_count = parse_int(row.get('combined_reviews', ''))
            ig_followers = parse_int(row.get('instagram_followers', ''))
            tiktok_followers = parse_int(row.get('tiktok_followers', ''))
            fb_followers = parse_int(row.get('facebook_followers', ''))
            social_followers = ig_followers + tiktok_followers + fb_followers

            # Track category distribution
            top_cat = category.split('/')[1] if '/' in category else category
            stats['category_distribution'][top_cat] = stats['category_distribution'].get(top_cat, 0) + 1

            store = {
                'domain': (row.get('domain') or '').strip(),
                'merchant_name': (row.get('merchant_name') or '').strip(),
                'category': category,
                'description': (row.get('description') or '').strip()[:500],
                'country_code': country,
                'estimated_monthly_sales': monthly_sales,
                'estimated_monthly_visits': monthly_visits,
                'combined_avgrating': avg_rating,
                'combined_reviews': review_count,
                'social_followers': social_followers,
                'instagram_followers': ig_followers,
                'tiktok_followers': tiktok_followers,
                'facebook_followers': fb_followers,
                'tags': [t.strip() for t in tags.split(':') if t.strip()] if tags else [],
                'domain_url': domain_url,
                'currency': (row.get('currency') or 'USD').strip(),
            }

            filtered_stores.append(store)

    stats['total_rows'] = total_rows
    elapsed = time.time() - start_time

    print(f"\n  CSV processing complete in {elapsed:.1f}s")
    print(f"\n  --- Filter Stats ---")
    print(f"  Total rows:           {stats['total_rows']:>10,}")
    print(f"  No domain URL:        {stats['no_domain_url']:>10,}")
    print(f"  No category:          {stats['no_category']:>10,}")
    print(f"  Non-gift category:    {stats['non_gift_category']:>10,}")
    print(f"  Below sales min:      {stats['below_sales']:>10,}")
    print(f"  Excluded tags:        {stats['excluded_tags']:>10,}")
    print(f"  Excluded country:     {stats['excluded_country']:>10,}")
    print(f"  Passed filters:       {stats['passed_filters']:>10,}")

    print(f"\n  --- Category Distribution (filtered stores) ---")
    for cat, count in sorted(stats['category_distribution'].items(), key=lambda x: -x[1]):
        print(f"    {cat:30s} {count:>8,}")

    # Pass 2: Rank
    print(f"\n  Ranking {len(filtered_stores):,} stores...")

    # Compute raw values for normalization
    sales_vals = [s['estimated_monthly_sales'] for s in filtered_stores]
    visits_vals = [s['estimated_monthly_visits'] for s in filtered_stores]
    reviews_vals = [s['combined_reviews'] for s in filtered_stores]
    social_vals = [s['social_followers'] for s in filtered_stores]

    # Log-scale normalization for sales/visits/social (power law distributions)
    import math
    sales_log = [math.log1p(v) for v in sales_vals]
    visits_log = [math.log1p(v) for v in visits_vals]
    reviews_log = [math.log1p(v) for v in reviews_vals]
    social_log = [math.log1p(v) for v in social_vals]

    sales_norm = normalize_0_1(sales_log)
    visits_norm = normalize_0_1(visits_log)
    reviews_norm = normalize_0_1(reviews_log)
    social_norm = normalize_0_1(social_log)

    # Default weights
    w_sales = 0.30
    w_visits = 0.20
    w_rating = 0.15
    w_reviews = 0.15
    w_social = 0.10
    w_category = 0.10

    # Apply learnings adjustments if available
    if learnings.get('weight_adjustments'):
        adj = learnings['weight_adjustments']
        w_sales = adj.get('sales', w_sales)
        w_visits = adj.get('visits', w_visits)
        w_rating = adj.get('rating', w_rating)
        w_reviews = adj.get('reviews', w_reviews)
        w_social = adj.get('social', w_social)
        w_category = adj.get('category', w_category)

    for i, store in enumerate(filtered_stores):
        # Rating score: normalize to 0-1 (assuming 1-5 scale)
        rating_score = max(0, (store['combined_avgrating'] - 1.0) / 4.0) if store['combined_avgrating'] > 0 else 0.3

        # Category tier bonus
        cat_tier = get_category_tier(store['category'])

        # Apply learnings category adjustments
        if learnings.get('category_weight_adjustments'):
            top_cat = store['category'].split('/')[1] if '/' in store['category'] else ''
            cat_adj = learnings['category_weight_adjustments'].get(top_cat, 0)
            cat_tier = max(0, min(1, cat_tier + cat_adj))

        # Composite score
        score = (
            w_sales * sales_norm[i] +
            w_visits * visits_norm[i] +
            w_rating * rating_score +
            w_reviews * reviews_norm[i] +
            w_social * social_norm[i] +
            w_category * cat_tier
        )

        store['composite_rank_score'] = round(score, 4)

    # Sort by composite score descending
    filtered_stores.sort(key=lambda s: s['composite_rank_score'], reverse=True)

    # Apply offset + limit (for batch slicing through ranked stores)
    output_stores = filtered_stores[args.offset:args.offset + args.limit]

    print(f"\n  --- Top {min(args.limit, len(output_stores))} Stores ---")
    for i, store in enumerate(output_stores[:20]):
        print(f"  {i+1:4d}. {store['composite_rank_score']:.3f}  {store['merchant_name'] or store['domain']:40s}  "
              f"${store['estimated_monthly_sales']:>15,.0f}/mo  "
              f"{store['combined_avgrating']:.1f}* ({store['combined_reviews']:,} reviews)  "
              f"{store['category']}")

    if len(output_stores) > 20:
        print(f"  ... and {len(output_stores) - 20} more")

    # Price band distribution of output
    output_cats = {}
    for s in output_stores:
        top = s['category'].split('/')[1] if '/' in s['category'] else s['category']
        output_cats[top] = output_cats.get(top, 0) + 1
    print(f"\n  --- Output Category Distribution ---")
    for cat, count in sorted(output_cats.items(), key=lambda x: -x[1]):
        print(f"    {cat:30s} {count:>6,}  ({count/len(output_stores)*100:.1f}%)")

    if args.dry_run:
        print(f"\n  DRY RUN — no output file written.")
        return

    # Write output
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output = {
        'metadata': {
            'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'csv_source': args.csv,
            'total_csv_rows': total_rows,
            'passed_filters': stats['passed_filters'],
            'output_count': len(output_stores),
            'offset': args.offset,
            'limit': args.limit,
            'min_sales': args.min_sales,
            'weights': {
                'sales': w_sales,
                'visits': w_visits,
                'rating': w_rating,
                'reviews': w_reviews,
                'social': w_social,
                'category': w_category,
            },
            'filter_stats': stats,
        },
        'stores': output_stores,
    }

    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  Output: {args.output}")
    print(f"  Stores: {len(output_stores)}")
    print(f"  Done!")


if __name__ == '__main__':
    main()
