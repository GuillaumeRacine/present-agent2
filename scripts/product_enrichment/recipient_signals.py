#!/usr/bin/env python3
"""
Recipient Signal Extractor - Mines gift-giving context from product reviews.

Extracts signals about how products are received as gifts:
- Gift mentions ("bought as a gift for my wife")
- Recipient reactions ("she loved it", "he uses it daily")
- Occasion context ("birthday", "christmas", "anniversary")
- Relationship types ("mom", "husband", "friend", "coworker")
- Recipient demographics (age hints, gender, interests)
- Emotional signals ("made her cry", "perfect surprise")

These attributes feed the recommendation engine's contextual search:
who the gift is for, what occasion, how it was received.

Usage:
    python3 recipient_signals.py --input parsed_reviews.json --output recipient_enriched.json
"""

import json
import re
import os
import argparse
from typing import Dict, List, Any, Optional, Tuple


# --- Signal Patterns ---

GIFT_INTENT_PATTERNS = [
    # Direct gift language
    (r'\b(?:bought|purchased|got|ordered)\s+(?:this|it|these)\s+(?:as\s+)?(?:a\s+)?gift', 'explicit_gift'),
    (r'\b(?:gave|gifted|giving)\s+(?:this|it|these)\s+to\b', 'explicit_gift'),
    (r'\bgift(?:ed|ing)?\s+(?:this|it|these)\b', 'explicit_gift'),
    (r'\b(?:bought|got|ordered)\s+(?:this|it|these)\s+for\s+(?:my|his|her|a)\b', 'purchased_for_someone'),
    (r'\bperfect\s+(?:gift|present)\b', 'gift_endorsement'),
    (r'\bgreat\s+(?:gift|present)\b', 'gift_endorsement'),
    (r'\bmakes?\s+(?:a\s+)?(?:great|perfect|wonderful|lovely)\s+(?:gift|present)\b', 'gift_endorsement'),
    (r'\b(?:gift|present)\s+(?:idea|option|choice)\b', 'gift_suggestion'),
    (r'\bstocking\s+stuffer\b', 'gift_suggestion'),
]

RELATIONSHIP_PATTERNS = [
    # Family
    (r'\b(?:my|his|her)\s+wife\b', 'wife'),
    (r'\b(?:my|his|her)\s+husband\b', 'husband'),
    (r'\b(?:my|his|her)\s+(?:girl|boy)friend\b', 'partner'),
    (r'\b(?:my|his|her)\s+partner\b', 'partner'),
    (r'\b(?:my|his|her)\s+mom(?:my)?\b', 'mother'),
    (r'\b(?:my|his|her)\s+mother\b', 'mother'),
    (r'\b(?:my|his|her)\s+dad(?:dy)?\b', 'father'),
    (r'\b(?:my|his|her)\s+father\b', 'father'),
    (r'\b(?:my|his|her)\s+(?:daughter|girl)\b', 'daughter'),
    (r'\b(?:my|his|her)\s+son\b', 'son'),
    (r'\b(?:my|his|her)\s+(?:kid|child|children|kids)\b', 'children'),
    (r'\b(?:my|his|her)\s+sister\b', 'sister'),
    (r'\b(?:my|his|her)\s+brother\b', 'brother'),
    (r'\b(?:my|his|her)\s+(?:grand(?:ma|mother|pa|father))\b', 'grandparent'),
    (r'\b(?:my|his|her)\s+(?:niece|nephew)\b', 'niece_nephew'),
    (r'\b(?:my|his|her)\s+(?:aunt|uncle)\b', 'aunt_uncle'),
    # Social
    (r'\b(?:my|a)\s+friend\b', 'friend'),
    (r'\b(?:my|a)\s+(?:best\s+)?friend\b', 'friend'),
    (r'\b(?:my|a)\s+(?:co-?worker|colleague)\b', 'coworker'),
    (r'\b(?:my|the)\s+(?:boss|manager)\b', 'boss'),
    (r'\b(?:my|a)\s+(?:teacher|professor)\b', 'teacher'),
    (r'\b(?:my|a)\s+(?:neighbor|neighbour)\b', 'neighbor'),
]

OCCASION_PATTERNS = [
    (r'\bbirthday\b', 'birthday'),
    (r'\bchristmas\b', 'christmas'),
    (r'\bholiday(?:s)?\b', 'holiday'),
    (r'\banniversary\b', 'anniversary'),
    (r'\bvalentine\b', 'valentines'),
    (r"\bmother'?s?\s+day\b", 'mothers_day'),
    (r"\bfather'?s?\s+day\b", 'fathers_day'),
    (r'\bwedding\b', 'wedding'),
    (r'\bbaby\s+shower\b', 'baby_shower'),
    (r'\bhousewarming\b', 'housewarming'),
    (r'\bgraduation\b', 'graduation'),
    (r'\bretirement\b', 'retirement'),
    (r'\bthank\s+you\b', 'thank_you'),
    (r'\bjust\s+because\b', 'just_because'),
    (r'\btreat\s+(?:my|her|him)self\b', 'self_gift'),
]

RECIPIENT_REACTION_PATTERNS = [
    # Positive reactions
    (r'\b(?:she|he|they)\s+(?:loved?|loves?)\s+(?:it|this|them)\b', 'loved_it', 'positive'),
    (r'\b(?:she|he|they)\s+(?:really\s+)?(?:liked?|likes?|enjoys?|enjoyed)\b', 'liked_it', 'positive'),
    (r'\b(?:she|he|they)\s+(?:was|were)\s+(?:so\s+)?(?:happy|thrilled|excited|delighted)\b', 'thrilled', 'positive'),
    (r'\b(?:she|he|they)\s+(?:can\'?t|couldn\'?t)\s+stop\s+(?:wearing|using|talking)\b', 'obsessed', 'positive'),
    (r'\b(?:she|he|they)\s+wear(?:s|ing)\s+(?:it|this|them)\s+(?:every|all)\b', 'daily_use', 'positive'),
    (r'\bbig\s+hit\b', 'big_hit', 'positive'),
    (r'\b(?:hit|smash)\b.*\b(?:gift|present)\b', 'big_hit', 'positive'),
    (r'\bmade\s+(?:her|him|them)\s+(?:cry|tear|smile|laugh)\b', 'emotional_reaction', 'positive'),
    (r'\b(?:absolute|huge)\s+favorite\b', 'favorite', 'positive'),
    # Negative reactions
    (r'\b(?:she|he|they)\s+(?:didn\'?t|did\s+not)\s+(?:like|want|use)\b', 'disliked', 'negative'),
    (r'\breturn(?:ed|ing)?\s+(?:it|this|them)\b', 'returned', 'negative'),
    (r'\bdisappoint(?:ed|ing)?\b', 'disappointed', 'negative'),
]

DEMOGRAPHIC_PATTERNS = [
    # Age hints
    (r'\b(\d{1,2})\s*(?:year|yr)s?\s*old\b', 'age_mentioned'),
    (r'\bteen(?:ager)?\b', 'age_teen'),
    (r'\btoddler\b', 'age_toddler'),
    (r'\bbab(?:y|ies)\b', 'age_baby'),
    (r'\belderly\b', 'age_elderly'),
    (r'\bsenior\b', 'age_senior'),
    # Gender hints from context
    (r'\bfor\s+(?:her|she|woman|women|lady|ladies|girl)\b', 'gender_female'),
    (r'\bfor\s+(?:him|he|man|men|guy|guys|boy)\b', 'gender_male'),
]

USE_CONTEXT_PATTERNS = [
    (r'\b(?:uses?|used)\s+(?:it|this|them)\s+(?:for|to|when|while)\s+(\w+(?:\s+\w+){0,3})', 'use_case'),
    (r'\bperfect\s+for\s+(\w+(?:\s+\w+){0,3})', 'ideal_for'),
    (r'\bgreat\s+for\s+(\w+(?:\s+\w+){0,3})', 'ideal_for'),
    (r'\b(?:wear|wore|wearing)\s+(?:it|this|them)\s+(?:to|for|at|during)\s+(\w+(?:\s+\w+){0,3})', 'wear_context'),
]


def extract_signals_from_review(review_text: str) -> Dict[str, Any]:
    """Extract all gift-giving signals from a single review text."""
    if not review_text:
        return {}

    text = review_text.lower()
    signals = {
        'gift_intent': [],
        'relationships': [],
        'occasions': [],
        'recipient_reactions': [],
        'demographics': [],
        'use_contexts': [],
        'is_gift_review': False,
        'sentiment': 'neutral',
    }

    # Gift intent
    for pattern, label in GIFT_INTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if label not in signals['gift_intent']:
                signals['gift_intent'].append(label)

    # Relationships
    for pattern, label in RELATIONSHIP_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if label not in signals['relationships']:
                signals['relationships'].append(label)

    # Occasions
    for pattern, label in OCCASION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if label not in signals['occasions']:
                signals['occasions'].append(label)

    # Recipient reactions
    for pattern, label, sentiment in RECIPIENT_REACTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            signals['recipient_reactions'].append({
                'reaction': label,
                'sentiment': sentiment
            })

    # Demographics
    for pattern, label in DEMOGRAPHIC_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            demo = {'type': label}
            if label == 'age_mentioned' and match.groups():
                demo['age'] = int(match.group(1))
            signals['demographics'].append(demo)

    # Use contexts
    for pattern, label in USE_CONTEXT_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            ctx = m.strip() if isinstance(m, str) else m
            if ctx and len(ctx) > 2:
                signals['use_contexts'].append({
                    'type': label,
                    'context': ctx
                })

    # Mark as gift review if any gift signals found
    signals['is_gift_review'] = bool(
        signals['gift_intent'] or
        signals['relationships'] or
        signals['occasions']
    )

    # Simple sentiment from reactions
    pos = sum(1 for r in signals['recipient_reactions'] if r['sentiment'] == 'positive')
    neg = sum(1 for r in signals['recipient_reactions'] if r['sentiment'] == 'negative')
    if pos > neg:
        signals['sentiment'] = 'positive'
    elif neg > pos:
        signals['sentiment'] = 'negative'

    # Remove empty lists to keep output clean
    return {k: v for k, v in signals.items() if v}


def extract_gift_quote(review_text: str) -> Optional[str]:
    """Extract the most relevant gift-related quote from a review."""
    if not review_text:
        return None

    sentences = re.split(r'[.!?]+', review_text)
    gift_keywords = [
        'gift', 'present', 'bought for', 'gave', 'loved it',
        'perfect for', 'she loved', 'he loved', 'birthday',
        'christmas', 'surprise'
    ]

    for sentence in sentences:
        lower = sentence.lower().strip()
        if any(kw in lower for kw in gift_keywords) and len(lower) > 15:
            return sentence.strip()

    return None


def aggregate_product_gift_profile(
    reviews_with_signals: List[Dict]
) -> Dict[str, Any]:
    """Build a gift profile for a product from all its review signals."""
    profile = {
        'gift_review_count': 0,
        'total_review_count': len(reviews_with_signals),
        'gift_review_ratio': 0.0,
        'relationships_mentioned': {},
        'occasions_mentioned': {},
        'recipient_reactions_summary': {'positive': 0, 'negative': 0, 'neutral': 0},
        'demographics': [],
        'use_contexts': [],
        'gift_quotes': [],
        'gift_suitability_score': 0.0,
    }

    for entry in reviews_with_signals:
        signals = entry.get('signals', {})

        if signals.get('is_gift_review'):
            profile['gift_review_count'] += 1

        # Aggregate relationships
        for rel in signals.get('relationships', []):
            profile['relationships_mentioned'][rel] = \
                profile['relationships_mentioned'].get(rel, 0) + 1

        # Aggregate occasions
        for occ in signals.get('occasions', []):
            profile['occasions_mentioned'][occ] = \
                profile['occasions_mentioned'].get(occ, 0) + 1

        # Aggregate reactions
        for reaction in signals.get('recipient_reactions', []):
            sent = reaction.get('sentiment', 'neutral')
            profile['recipient_reactions_summary'][sent] += 1

        # Collect demographics
        for demo in signals.get('demographics', []):
            if demo not in profile['demographics']:
                profile['demographics'].append(demo)

        # Collect use contexts
        for ctx in signals.get('use_contexts', []):
            if ctx not in profile['use_contexts']:
                profile['use_contexts'].append(ctx)

        # Collect quotes
        quote = entry.get('gift_quote')
        if quote and len(profile['gift_quotes']) < 5:
            profile['gift_quotes'].append(quote)

    # Compute ratios
    if profile['total_review_count'] > 0:
        profile['gift_review_ratio'] = round(
            profile['gift_review_count'] / profile['total_review_count'], 3
        )

    # Gift suitability score (0-1)
    # Weighted formula:
    #   - Gift mention ratio (0.3)
    #   - Positive reaction ratio (0.3)
    #   - Relationship diversity (0.2)
    #   - Occasion diversity (0.2)
    score = 0.0

    # Gift mention contribution
    score += min(profile['gift_review_ratio'] * 3, 1.0) * 0.3

    # Positive reaction contribution
    total_reactions = sum(profile['recipient_reactions_summary'].values())
    if total_reactions > 0:
        pos_ratio = profile['recipient_reactions_summary']['positive'] / total_reactions
        score += pos_ratio * 0.3

    # Relationship diversity (more relationship types = more versatile gift)
    rel_count = len(profile['relationships_mentioned'])
    score += min(rel_count / 5, 1.0) * 0.2

    # Occasion diversity
    occ_count = len(profile['occasions_mentioned'])
    score += min(occ_count / 3, 1.0) * 0.2

    profile['gift_suitability_score'] = round(score, 3)

    # Sort relationships and occasions by count
    profile['relationships_mentioned'] = dict(
        sorted(profile['relationships_mentioned'].items(),
               key=lambda x: x[1], reverse=True)
    )
    profile['occasions_mentioned'] = dict(
        sorted(profile['occasions_mentioned'].items(),
               key=lambda x: x[1], reverse=True)
    )

    return profile


def process_parsed_reviews(input_path: str) -> Dict[str, Any]:
    """Process parsed reviews and extract recipient signals."""
    print(f"Loading parsed reviews from {input_path}...")

    with open(input_path) as f:
        products = json.load(f)

    print(f"Loaded {len(products)} products")

    enriched = {}
    gift_products = 0
    total_gift_reviews = 0

    for url, product in products.items():
        reviews = product.get('reviews', [])
        if not reviews:
            enriched[url] = {
                **product,
                'gift_profile': aggregate_product_gift_profile([])
            }
            continue

        # Extract signals from each review
        reviews_with_signals = []
        for review in reviews:
            text = review.get('text', '')
            signals = extract_signals_from_review(text)
            gift_quote = extract_gift_quote(text)
            reviews_with_signals.append({
                'review': review,
                'signals': signals,
                'gift_quote': gift_quote,
            })

        # Build product gift profile
        gift_profile = aggregate_product_gift_profile(reviews_with_signals)

        if gift_profile['gift_review_count'] > 0:
            gift_products += 1
            total_gift_reviews += gift_profile['gift_review_count']

        enriched[url] = {
            **product,
            'reviews_with_signals': reviews_with_signals,
            'gift_profile': gift_profile,
        }

    print(f"\nProducts with gift-related reviews: {gift_products}")
    print(f"Total gift-related reviews: {total_gift_reviews}")

    return enriched


def print_gift_insights(enriched: Dict[str, Any]):
    """Print insights about gift-related products."""
    gift_products = [
        (url, p) for url, p in enriched.items()
        if p.get('gift_profile', {}).get('gift_review_count', 0) > 0
    ]

    if not gift_products:
        print("No gift-related products found.")
        return

    # Top by gift suitability score
    by_score = sorted(
        gift_products,
        key=lambda x: x[1]['gift_profile']['gift_suitability_score'],
        reverse=True
    )

    print("\n=== TOP 20 MOST GIFT-SUITABLE PRODUCTS ===")
    for url, p in by_score[:20]:
        gp = p['gift_profile']
        print(
            f"  Score: {gp['gift_suitability_score']:.3f} | "
            f"{p['product_title'][:40]} | "
            f"Gift reviews: {gp['gift_review_count']}/{gp['total_review_count']} | "
            f"For: {', '.join(list(gp['relationships_mentioned'].keys())[:3]) or 'N/A'} | "
            f"Occasions: {', '.join(list(gp['occasions_mentioned'].keys())[:3]) or 'N/A'}"
        )

    # Most mentioned relationships across all products
    all_rels = {}
    all_occasions = {}
    for url, p in gift_products:
        for rel, count in p['gift_profile']['relationships_mentioned'].items():
            all_rels[rel] = all_rels.get(rel, 0) + count
        for occ, count in p['gift_profile']['occasions_mentioned'].items():
            all_occasions[occ] = all_occasions.get(occ, 0) + count

    print("\n=== MOST COMMON GIFT RECIPIENTS ===")
    for rel, count in sorted(all_rels.items(), key=lambda x: x[1], reverse=True):
        print(f"  {rel}: {count} mentions")

    print("\n=== MOST COMMON GIFT OCCASIONS ===")
    for occ, count in sorted(all_occasions.items(), key=lambda x: x[1], reverse=True):
        print(f"  {occ}: {count} mentions")

    # Sample gift quotes
    print("\n=== SAMPLE GIFT QUOTES ===")
    quotes_shown = 0
    for url, p in by_score:
        for q in p['gift_profile'].get('gift_quotes', []):
            if quotes_shown < 15:
                print(f"  \"{q[:120]}\" - {p['product_title'][:30]}")
                quotes_shown += 1


def main():
    parser = argparse.ArgumentParser(description='Extract gift recipient signals from reviews')
    parser.add_argument(
        '--input',
        default='./output/parsed_reviews.json',
        help='Input parsed reviews JSON'
    )
    parser.add_argument(
        '--output',
        default='./output/recipient_enriched.json',
        help='Output enriched JSON'
    )
    args = parser.parse_args()

    enriched = process_parsed_reviews(args.input)
    print_gift_insights(enriched)

    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"\nOutput written to: {args.output}")
    print(f"File size: {os.path.getsize(args.output) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    main()
