#!/usr/bin/env python3
"""
Review Parser - Extracts structured popularity data from raw B-Corp product reviews.

Parses the scraped review text blobs from bcorp-*.json files into structured per-product
review data: star ratings, review counts, sentiment, fit info, verified buyer counts.

Usage:
    python3 review_parser.py [--input-dir PATH] [--output PATH]

Defaults:
    input:  ~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/json/
    output: ./output/parsed_reviews.json
"""

import json
import os
import re
import glob
import argparse
from collections import defaultdict
from typing import List, Dict, Optional, Any


def parse_individual_reviews(raw_text: str) -> List[Dict[str, Any]]:
    """Parse a raw review text blob into individual structured reviews."""
    if not raw_text or len(raw_text) < 30:
        return []

    reviews = []

    # Split on the reviewer pattern: initials followed by name "Reviewed by"
    # Pattern: "XX     Name X. Reviewed by Name X."
    reviewer_blocks = re.split(
        r'(?=\s{2,}[A-Z]{1,3}\s{2,}[A-Z][a-z]+\s+[A-Z]\.?\s+Reviewed by)',
        raw_text
    )

    for block in reviewer_blocks:
        block = block.strip()
        if len(block) < 30:
            continue

        review = {}

        # Reviewer name
        name_match = re.search(r'Reviewed by\s+([A-Za-z]+\s+[A-Za-z]\.?)', block)
        if name_match:
            review['reviewer_name'] = name_match.group(1).strip()

        # Verified buyer
        review['verified_buyer'] = bool(re.search(r'Verified Buyer', block))

        # Recommends
        review['recommends'] = bool(re.search(r'I recommend this product', block))

        # Star rating
        rating_match = re.search(r'Rated (\d+) out of (\d+)', block)
        if rating_match:
            review['rating'] = int(rating_match.group(1))
            review['rating_max'] = int(rating_match.group(2))

        # Fit rating (-2 to +2 scale)
        fit_match = re.search(
            r'Rated ([-\d]+) on a scale of minus 2 to 2', block
        )
        if fit_match:
            review['fit_rating'] = int(fit_match.group(1))
            # -2=Too Small, 0=True to Size, 2=Too Large

        # Helpful votes
        yes_match = re.search(r'(\d+) people voted yes', block)
        no_match = re.search(r'(\d+) people voted no', block)
        if yes_match:
            review['helpful_yes'] = int(yes_match.group(1))
        if no_match:
            review['helpful_no'] = int(no_match.group(1))

        # Sizing info
        usual_size = re.search(r'Usual Size\s+([A-Z0-9/]+)', block)
        purchased_size = re.search(r'Size Purchased\s+([A-Z0-9/]+)', block)
        height = re.search(r'Height \(Inches\)\s+([\d′″\.\s]+)', block)
        weight = re.search(r'Weight \(Pounds\)\s+([\d\-]+)', block)

        if usual_size:
            review['usual_size'] = usual_size.group(1)
        if purchased_size:
            review['purchased_size'] = purchased_size.group(1)
        if height:
            review['height'] = height.group(1).strip()
        if weight:
            review['weight_range'] = weight.group(1).strip()

        # Extract the actual review text (the narrative part)
        # It's between "Review posted" and "Loading..." or "Fit - Click"
        text_match = re.search(
            r'Review posted\s+(.*?)(?:Loading|Fit - Click|Was this helpful)',
            block,
            re.DOTALL
        )
        if text_match:
            review_text = text_match.group(1).strip()
            # Clean up whitespace
            review_text = re.sub(r'\s+', ' ', review_text).strip()
            if len(review_text) > 5:
                review['text'] = review_text

        # Only keep reviews that have at least a rating or text
        if 'rating' in review or 'text' in review:
            reviews.append(review)

    return reviews


def compute_product_stats(reviews: List[Dict]) -> Dict[str, Any]:
    """Compute aggregate statistics for a product from its parsed reviews."""
    if not reviews:
        return {}

    stats = {
        'review_count': len(reviews),
        'verified_buyer_count': sum(1 for r in reviews if r.get('verified_buyer')),
        'recommends_count': sum(1 for r in reviews if r.get('recommends')),
    }

    # Rating stats
    ratings = [r['rating'] for r in reviews if 'rating' in r]
    if ratings:
        stats['avg_rating'] = round(sum(ratings) / len(ratings), 2)
        stats['min_rating'] = min(ratings)
        stats['max_rating'] = max(ratings)
        stats['rating_distribution'] = {
            str(i): ratings.count(i) for i in range(1, 6)
        }

    # Fit stats
    fit_ratings = [r['fit_rating'] for r in reviews if 'fit_rating' in r]
    if fit_ratings:
        avg_fit = sum(fit_ratings) / len(fit_ratings)
        stats['avg_fit_rating'] = round(avg_fit, 2)
        if avg_fit < -0.5:
            stats['fit_tendency'] = 'runs_small'
        elif avg_fit > 0.5:
            stats['fit_tendency'] = 'runs_large'
        else:
            stats['fit_tendency'] = 'true_to_size'

    # Helpful votes
    total_helpful = sum(r.get('helpful_yes', 0) for r in reviews)
    stats['total_helpful_votes'] = total_helpful

    # Recommendation rate
    if stats['review_count'] > 0:
        stats['recommendation_rate'] = round(
            stats['recommends_count'] / stats['review_count'], 2
        )

    return stats


def process_bcorp_files(input_dir: str) -> Dict[str, Any]:
    """Process all bcorp-*.json files and extract review data."""
    pattern = os.path.join(input_dir, 'bcorp-*.json')
    files = sorted(glob.glob(pattern))

    if not files:
        print(f"No bcorp-*.json files found in {input_dir}")
        return {}

    print(f"Found {len(files)} bcorp files to process")

    # Deduplicate by product URL
    products = {}
    total_records = 0
    skipped_no_review = 0

    for filepath in files:
        filename = os.path.basename(filepath)
        print(f"  Processing {filename}...")

        with open(filepath) as f:
            data = json.load(f)

        for item in data:
            total_records += 1
            product_url = item.get('Product URL', '').strip()
            if not product_url:
                continue

            # Skip if already processed (dedup by URL)
            if product_url in products:
                continue

            raw_review = str(item.get('# product reviews (if available)', ''))
            if len(raw_review) < 30:
                skipped_no_review += 1
                products[product_url] = {
                    'brand_url': item.get('Brand URL', ''),
                    'product_url': product_url,
                    'product_title': item.get('Product Title', ''),
                    'price': item.get('Price', ''),
                    'currency': item.get('Currency', 'USD'),
                    'description': item.get('Text Product Description', ''),
                    'out_of_stock': item.get('Out of stock?', ''),
                    'reviews': [],
                    'review_stats': {},
                }
                continue

            # Parse reviews
            parsed_reviews = parse_individual_reviews(raw_review)
            stats = compute_product_stats(parsed_reviews)

            products[product_url] = {
                'brand_url': item.get('Brand URL', ''),
                'product_url': product_url,
                'product_title': item.get('Product Title', ''),
                'price': item.get('Price', ''),
                'currency': item.get('Currency', 'USD'),
                'description': item.get('Text Product Description', ''),
                'out_of_stock': item.get('Out of stock?', ''),
                'reviews': parsed_reviews,
                'review_stats': stats,
            }

    print(f"\nProcessed {total_records} total records")
    print(f"Unique products: {len(products)}")
    print(f"Products with reviews: {sum(1 for p in products.values() if p['reviews'])}")
    print(f"Products without reviews: {skipped_no_review}")

    return products


def print_summary(products: Dict[str, Any]):
    """Print a summary of the parsed review data."""
    reviewed = {url: p for url, p in products.items() if p['reviews']}

    if not reviewed:
        print("No reviewed products found.")
        return

    # Top products by review count
    by_count = sorted(
        reviewed.items(),
        key=lambda x: x[1]['review_stats'].get('review_count', 0),
        reverse=True
    )

    print("\n=== TOP 20 PRODUCTS BY REVIEW COUNT ===")
    for url, p in by_count[:20]:
        stats = p['review_stats']
        print(
            f"  [{stats.get('review_count', 0)} reviews] "
            f"★{stats.get('avg_rating', 'N/A')} "
            f"| {p['product_title'][:50]} "
            f"| {p['brand_url']}"
        )

    # Top by rating (min 3 reviews)
    by_rating = sorted(
        [(url, p) for url, p in reviewed.items()
         if p['review_stats'].get('review_count', 0) >= 3],
        key=lambda x: x[1]['review_stats'].get('avg_rating', 0),
        reverse=True
    )

    print("\n=== TOP 20 PRODUCTS BY RATING (min 3 reviews) ===")
    for url, p in by_rating[:20]:
        stats = p['review_stats']
        print(
            f"  ★{stats.get('avg_rating', 'N/A')} "
            f"[{stats.get('review_count', 0)} reviews] "
            f"| {p['product_title'][:50]} "
            f"| {p['brand_url']}"
        )

    # Brand-level aggregation
    brand_stats = defaultdict(lambda: {
        'products': 0, 'reviewed_products': 0,
        'total_reviews': 0, 'total_rating_sum': 0, 'rated_count': 0
    })
    for url, p in products.items():
        brand = p['brand_url']
        brand_stats[brand]['products'] += 1
        if p['reviews']:
            brand_stats[brand]['reviewed_products'] += 1
            brand_stats[brand]['total_reviews'] += p['review_stats'].get('review_count', 0)
            if 'avg_rating' in p['review_stats']:
                brand_stats[brand]['total_rating_sum'] += (
                    p['review_stats']['avg_rating'] * p['review_stats']['review_count']
                )
                brand_stats[brand]['rated_count'] += p['review_stats']['review_count']

    print("\n=== TOP 20 BRANDS BY TOTAL REVIEWS ===")
    by_brand_reviews = sorted(
        brand_stats.items(),
        key=lambda x: x[1]['total_reviews'],
        reverse=True
    )
    for brand, bs in by_brand_reviews[:20]:
        avg = round(bs['total_rating_sum'] / bs['rated_count'], 2) if bs['rated_count'] else 'N/A'
        print(
            f"  {brand}: "
            f"{bs['total_reviews']} total reviews across "
            f"{bs['reviewed_products']}/{bs['products']} products "
            f"(avg ★{avg})"
        )


def main():
    parser = argparse.ArgumentParser(description='Parse B-Corp product reviews')
    parser.add_argument(
        '--input-dir',
        default=os.path.expanduser(
            '~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/json/'
        ),
        help='Directory containing bcorp-*.json files'
    )
    parser.add_argument(
        '--output',
        default='./output/parsed_reviews.json',
        help='Output file path'
    )
    args = parser.parse_args()

    print(f"Input: {args.input_dir}")
    print(f"Output: {args.output}")
    print()

    products = process_bcorp_files(args.input_dir)
    if not products:
        print("No products found. Check input path.")
        return

    print_summary(products)

    # Write output
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"\nOutput written to: {args.output}")
    print(f"File size: {os.path.getsize(args.output) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    main()
