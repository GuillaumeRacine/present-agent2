#!/usr/bin/env python3
"""
Neo4j Loader - Loads enriched product catalog into local Neo4j.

Creates the extended schema with popularity scores, gift signals, and
recipient context as graph relationships. Designed to work alongside
the existing TypeScript schema (additive, not destructive).

New nodes added:
  - (:GiftOccasion {name})      - birthday, christmas, anniversary...
  - (:Relationship {name})       - wife, husband, friend, coworker...
  - (:GiftPersona {name})        - romantic_partner, parent_elder...

New properties on Product:
  - popularity_score, gift_suitability_score, avg_rating, review_count
  - recommendation_rate, is_bestseller, bestseller_rank, gift_proven

New relationships:
  - (Product)-[:GIFT_FOR_OCCASION {count}]->(GiftOccasion)
  - (Product)-[:GIFT_FOR_RELATIONSHIP {count}]->(Relationship)
  - (Product)-[:FITS_PERSONA]->(GiftPersona)

Usage:
    python3 load_neo4j.py --input output/enriched_catalog.json
    python3 load_neo4j.py --input output/enriched_catalog.json --uri bolt://localhost:7687
    python3 load_neo4j.py --schema-only   # Just create constraints/indexes
    python3 load_neo4j.py --stats          # Show current DB stats
"""

import json
import os
import sys
import time
import argparse
from typing import Dict, List, Any, Optional

# Neo4j driver - will be installed via pip if needed
try:
    from neo4j import GraphDatabase, basic_auth
except ImportError:
    print("neo4j driver not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'neo4j', '--quiet'])
    from neo4j import GraphDatabase, basic_auth


# --- Config ---

DEFAULT_URI = "bolt://localhost:7687"
DEFAULT_USER = "neo4j"
DEFAULT_PASSWORD = "presentagent2024"
BATCH_SIZE = 100


# --- Schema ---

CONSTRAINTS = [
    "CREATE CONSTRAINT gift_occasion_name IF NOT EXISTS FOR (go:GiftOccasion) REQUIRE go.name IS UNIQUE",
    "CREATE CONSTRAINT gift_relationship_name IF NOT EXISTS FOR (r:GiftRelationship) REQUIRE r.name IS UNIQUE",
    "CREATE CONSTRAINT gift_persona_name IF NOT EXISTS FOR (gp:GiftPersona) REQUIRE gp.name IS UNIQUE",
    # Product constraint should already exist from TS schema, but ensure it
    "CREATE CONSTRAINT product_url IF NOT EXISTS FOR (p:Product) REQUIRE p.product_url IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX product_popularity IF NOT EXISTS FOR (p:Product) ON (p.popularity_score)",
    "CREATE INDEX product_gift_suitability IF NOT EXISTS FOR (p:Product) ON (p.gift_suitability_score)",
    "CREATE INDEX product_avg_rating IF NOT EXISTS FOR (p:Product) ON (p.avg_rating)",
    "CREATE INDEX product_review_count IF NOT EXISTS FOR (p:Product) ON (p.review_count)",
    "CREATE INDEX product_gift_proven IF NOT EXISTS FOR (p:Product) ON (p.gift_proven)",
    "CREATE INDEX product_is_bestseller IF NOT EXISTS FOR (p:Product) ON (p.is_bestseller)",
    "CREATE INDEX product_brand IF NOT EXISTS FOR (p:Product) ON (p.brand_url)",
]

# Fulltext index for hybrid search
FULLTEXT_INDEX = """
CREATE FULLTEXT INDEX product_search IF NOT EXISTS
FOR (p:Product) ON EACH [p.title, p.description, p.brand_url]
"""

# Reference nodes for gift context
GIFT_OCCASIONS = [
    'birthday', 'christmas', 'holiday', 'anniversary', 'valentines',
    'mothers_day', 'fathers_day', 'wedding', 'baby_shower',
    'housewarming', 'graduation', 'retirement', 'thank_you',
    'just_because', 'self_gift',
]

GIFT_RELATIONSHIPS = [
    'wife', 'husband', 'partner', 'mother', 'father',
    'daughter', 'son', 'children', 'sister', 'brother',
    'grandparent', 'niece_nephew', 'aunt_uncle',
    'friend', 'coworker', 'boss', 'teacher', 'neighbor',
]

GIFT_PERSONAS = [
    'romantic_partner', 'parent_elder',
    'social_professional', 'child_young_adult',
]


def create_driver(uri: str, user: str, password: str):
    """Create Neo4j driver."""
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))


def setup_schema(driver):
    """Create constraints, indexes, and reference nodes."""
    print("Setting up schema...")

    with driver.session() as session:
        # Constraints
        for cypher in CONSTRAINTS:
            try:
                session.run(cypher)
                name = cypher.split("CONSTRAINT ")[1].split(" IF")[0]
                print(f"  Constraint: {name} [OK]")
            except Exception as e:
                if 'already exists' in str(e).lower() or 'equivalent' in str(e).lower():
                    name = cypher.split("CONSTRAINT ")[1].split(" IF")[0]
                    print(f"  Constraint: {name} [EXISTS]")
                else:
                    print(f"  Constraint error: {e}")

        # Indexes
        for cypher in INDEXES:
            try:
                session.run(cypher)
                name = cypher.split("INDEX ")[1].split(" IF")[0]
                print(f"  Index: {name} [OK]")
            except Exception as e:
                if 'already exists' in str(e).lower() or 'equivalent' in str(e).lower():
                    name = cypher.split("INDEX ")[1].split(" IF")[0]
                    print(f"  Index: {name} [EXISTS]")
                else:
                    print(f"  Index error: {e}")

        # Fulltext index
        try:
            session.run(FULLTEXT_INDEX)
            print(f"  Fulltext: product_search [OK]")
        except Exception as e:
            if 'already exists' in str(e).lower():
                print(f"  Fulltext: product_search [EXISTS]")
            else:
                print(f"  Fulltext error: {e}")

        # Reference nodes: GiftOccasion
        print("  Creating GiftOccasion nodes...")
        session.run(
            "UNWIND $names AS name "
            "MERGE (go:GiftOccasion {name: name})",
            names=GIFT_OCCASIONS
        )

        # Reference nodes: GiftRelationship
        print("  Creating GiftRelationship nodes...")
        session.run(
            "UNWIND $names AS name "
            "MERGE (r:GiftRelationship {name: name})",
            names=GIFT_RELATIONSHIPS
        )

        # Reference nodes: GiftPersona
        print("  Creating GiftPersona nodes...")
        session.run(
            "UNWIND $names AS name "
            "MERGE (gp:GiftPersona {name: name})",
            names=GIFT_PERSONAS
        )

    print("Schema setup complete.\n")


def _safe_float(val) -> Optional[float]:
    """Safely parse price strings like '995.00 25.00' or '32.00'."""
    if not val or val == '':
        return None
    try:
        return float(str(val).split()[0])
    except (ValueError, IndexError):
        return None


def load_products_batch(session, products: List[Dict]):
    """Load a batch of products via UNWIND."""
    # Prepare product data for Cypher
    batch = []
    for p in products:
        batch.append({
            'product_url': p['product_url'],
            'title': p.get('product_title', ''),
            'brand_url': p.get('brand_url', ''),
            'price': _safe_float(p.get('price')),
            'currency': p.get('currency', 'USD'),
            'description': (p.get('description', '') or '')[:2000],
            'popularity_score': p.get('popularity_score', 0),
            'gift_suitability_score': p.get('gift_suitability_score', 0),
            'review_count': p.get('review_count', 0),
            'avg_rating': p.get('avg_rating'),
            'recommendation_rate': p.get('recommendation_rate'),
            'gift_proven': p.get('gift_proven', False),
            'is_bestseller': p.get('is_bestseller', False),
            'bestseller_rank': p.get('bestseller_rank'),
        })

    # MERGE products (update if exists, create if not)
    session.run("""
        UNWIND $batch AS row
        MERGE (p:Product {product_url: row.product_url})
        SET p.title = row.title,
            p.brand_url = row.brand_url,
            p.price = row.price,
            p.currency = row.currency,
            p.description = row.description,
            p.popularity_score = row.popularity_score,
            p.gift_suitability_score = row.gift_suitability_score,
            p.review_count = row.review_count,
            p.avg_rating = row.avg_rating,
            p.recommendation_rate = row.recommendation_rate,
            p.gift_proven = row.gift_proven,
            p.is_bestseller = row.is_bestseller,
            p.bestseller_rank = row.bestseller_rank
    """, batch=batch)


def load_gift_relationships(session, products: List[Dict]):
    """Create gift-context relationships for products that have them."""
    # Occasion relationships
    occasion_links = []
    relationship_links = []
    persona_links = []

    for p in products:
        url = p['product_url']

        for occ in p.get('gift_for_occasions', []):
            if occ in GIFT_OCCASIONS:
                occasion_links.append({'url': url, 'occasion': occ})

        for rel in p.get('gift_for_relationships', []):
            if rel in GIFT_RELATIONSHIPS:
                relationship_links.append({'url': url, 'relationship': rel})

        for persona in p.get('gift_personas', []):
            if persona in GIFT_PERSONAS:
                persona_links.append({'url': url, 'persona': persona})

    if occasion_links:
        session.run("""
            UNWIND $links AS link
            MATCH (p:Product {product_url: link.url})
            MATCH (go:GiftOccasion {name: link.occasion})
            MERGE (p)-[:GIFT_FOR_OCCASION]->(go)
        """, links=occasion_links)

    if relationship_links:
        session.run("""
            UNWIND $links AS link
            MATCH (p:Product {product_url: link.url})
            MATCH (r:GiftRelationship {name: link.relationship})
            MERGE (p)-[:GIFT_FOR_RELATIONSHIP]->(r)
        """, links=relationship_links)

    if persona_links:
        session.run("""
            UNWIND $links AS link
            MATCH (p:Product {product_url: link.url})
            MATCH (gp:GiftPersona {name: link.persona})
            MERGE (p)-[:FITS_PERSONA]->(gp)
        """, links=persona_links)


def load_qualitative_attributes(session, products: List[Dict]):
    """Load qualitative attributes as properties and category relationships."""
    # Extract categories and create relationships
    category_links = []
    for p in products:
        qa = p.get('qualitative_attributes', {})
        url = p['product_url']

        vertical = qa.get('vertical')
        if vertical and vertical != 'Not Provided':
            category_links.append({'url': url, 'category': vertical})

        subcategory = qa.get('subcategory')
        if subcategory and subcategory != 'Other':
            category_links.append({'url': url, 'category': subcategory})

    if category_links:
        session.run("""
            UNWIND $links AS link
            MATCH (p:Product {product_url: link.url})
            MERGE (c:Category {name: link.category})
            MERGE (p)-[:IN_CATEGORY]->(c)
        """, links=category_links)

    # Store tags as product property
    for p in products:
        qa = p.get('qualitative_attributes', {})
        tags = qa.get('product_tags', [])
        materials = qa.get('materials', [])
        fit = qa.get('fit_tendency')

        if tags or materials or fit:
            session.run("""
                MATCH (p:Product {product_url: $url})
                SET p.tags = $tags,
                    p.materials = $materials,
                    p.fit_tendency = $fit
            """, url=p['product_url'], tags=tags, materials=materials, fit=fit)


def load_gift_quotes(session, products: List[Dict]):
    """Store gift quotes on products that have them."""
    for p in products:
        quotes = p.get('gift_quotes', [])
        if quotes:
            session.run("""
                MATCH (p:Product {product_url: $url})
                SET p.gift_quotes = $quotes
            """, url=p['product_url'], quotes=quotes[:5])


def load_enriched_catalog(driver, input_path: str):
    """Main loading function."""
    print(f"Loading enriched catalog from {input_path}...")

    with open(input_path) as f:
        products = json.load(f)

    total = len(products)
    print(f"Total products: {total}")

    # Filter out products without a valid URL
    products = [p for p in products if p.get('product_url')]
    print(f"Products with valid URL: {len(products)}")

    start_time = time.time()

    with driver.session() as session:
        # Load products in batches
        for i in range(0, len(products), BATCH_SIZE):
            batch = products[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(products) + BATCH_SIZE - 1) // BATCH_SIZE

            # Products
            load_products_batch(session, batch)

            # Gift context relationships (only for gift-proven products)
            gift_batch = [p for p in batch if p.get('gift_proven')]
            if gift_batch:
                load_gift_relationships(session, gift_batch)

            # Qualitative attributes
            load_qualitative_attributes(session, batch)

            # Gift quotes
            quote_batch = [p for p in batch if p.get('gift_quotes')]
            if quote_batch:
                load_gift_quotes(session, quote_batch)

            elapsed = time.time() - start_time
            rate = (i + len(batch)) / elapsed if elapsed > 0 else 0
            eta = (len(products) - i - len(batch)) / rate if rate > 0 else 0

            print(
                f"\r  Batch {batch_num}/{total_batches} | "
                f"{i + len(batch)}/{len(products)} products | "
                f"{rate:.0f}/sec | ETA: {eta:.0f}s",
                end='', flush=True
            )

    elapsed = time.time() - start_time
    print(f"\n\nLoading complete in {elapsed:.1f}s")


def show_stats(driver):
    """Show current database statistics."""
    with driver.session() as session:
        # Node counts
        result = session.run("""
            CALL {
                MATCH (p:Product) RETURN 'Product' AS label, count(p) AS count
                UNION ALL
                MATCH (c:Category) RETURN 'Category' AS label, count(c) AS count
                UNION ALL
                MATCH (go:GiftOccasion) RETURN 'GiftOccasion' AS label, count(go) AS count
                UNION ALL
                MATCH (r:GiftRelationship) RETURN 'GiftRelationship' AS label, count(r) AS count
                UNION ALL
                MATCH (gp:GiftPersona) RETURN 'GiftPersona' AS label, count(gp) AS count
                UNION ALL
                MATCH (i:Interest) RETURN 'Interest' AS label, count(i) AS count
                UNION ALL
                MATCH (v:Value) RETURN 'Value' AS label, count(v) AS count
                UNION ALL
                MATCH (o:Occasion) RETURN 'Occasion' AS label, count(o) AS count
            }
            RETURN label, count ORDER BY count DESC
        """)
        print("\n=== NODE COUNTS ===")
        for record in result:
            print(f"  {record['label']}: {record['count']}")

        # Relationship counts
        result = session.run("""
            CALL {
                MATCH ()-[r:GIFT_FOR_OCCASION]->() RETURN 'GIFT_FOR_OCCASION' AS type, count(r) AS count
                UNION ALL
                MATCH ()-[r:GIFT_FOR_RELATIONSHIP]->() RETURN 'GIFT_FOR_RELATIONSHIP' AS type, count(r) AS count
                UNION ALL
                MATCH ()-[r:FITS_PERSONA]->() RETURN 'FITS_PERSONA' AS type, count(r) AS count
                UNION ALL
                MATCH ()-[r:IN_CATEGORY]->() RETURN 'IN_CATEGORY' AS type, count(r) AS count
                UNION ALL
                MATCH ()-[r:MATCHES_INTEREST]->() RETURN 'MATCHES_INTEREST' AS type, count(r) AS count
            }
            RETURN type, count ORDER BY count DESC
        """)
        print("\n=== RELATIONSHIP COUNTS ===")
        for record in result:
            print(f"  {record['type']}: {record['count']}")

        # Top products
        result = session.run("""
            MATCH (p:Product)
            WHERE p.popularity_score > 0
            RETURN p.title AS title, p.popularity_score AS score,
                   p.avg_rating AS rating, p.review_count AS reviews,
                   p.gift_proven AS gift, p.brand_url AS brand
            ORDER BY p.popularity_score DESC
            LIMIT 15
        """)
        print("\n=== TOP 15 PRODUCTS ===")
        for r in result:
            gf = " [GIFT]" if r['gift'] else ""
            print(
                f"  {r['score']:5.1f} | ★{r['rating'] or 'N/A'} "
                f"({r['reviews']} reviews) | "
                f"{r['title'][:40]}{gf} | {r['brand']}"
            )

        # Gift graph
        result = session.run("""
            MATCH (p:Product)-[:GIFT_FOR_RELATIONSHIP]->(r:GiftRelationship)
            RETURN r.name AS relationship, count(p) AS products
            ORDER BY products DESC
        """)
        print("\n=== GIFT RELATIONSHIP COVERAGE ===")
        for r in result:
            print(f"  {r['relationship']}: {r['products']} products")

        result = session.run("""
            MATCH (p:Product)-[:GIFT_FOR_OCCASION]->(go:GiftOccasion)
            RETURN go.name AS occasion, count(p) AS products
            ORDER BY products DESC
        """)
        print("\n=== GIFT OCCASION COVERAGE ===")
        for r in result:
            print(f"  {r['occasion']}: {r['products']} products")


def main():
    parser = argparse.ArgumentParser(description='Load enriched catalog into Neo4j')
    parser.add_argument('--input', default='./output/enriched_catalog.json')
    parser.add_argument('--uri', default=DEFAULT_URI)
    parser.add_argument('--user', default=DEFAULT_USER)
    parser.add_argument('--password', default=DEFAULT_PASSWORD)
    parser.add_argument('--schema-only', action='store_true', help='Only create schema')
    parser.add_argument('--stats', action='store_true', help='Show DB stats')
    parser.add_argument('--skip-schema', action='store_true', help='Skip schema creation')

    args = parser.parse_args()

    print(f"Connecting to Neo4j at {args.uri}...")
    driver = create_driver(args.uri, args.user, args.password)

    try:
        # Verify connection
        driver.verify_connectivity()
        print("Connected.\n")

        if args.stats:
            show_stats(driver)
            return

        if not args.skip_schema:
            setup_schema(driver)

        if args.schema_only:
            print("Schema-only mode. Done.")
            return

        load_enriched_catalog(driver, args.input)

        print("\n--- Post-load stats ---")
        show_stats(driver)

    finally:
        driver.close()


if __name__ == '__main__':
    main()
