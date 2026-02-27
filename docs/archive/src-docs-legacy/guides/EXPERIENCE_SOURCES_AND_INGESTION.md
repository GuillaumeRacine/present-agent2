# Experience Products: Sources and Ingestion Guide

## Purpose

- Identify reliable sources for experience gifts, expected catalog size, and price coverage.
- Recommend compliant access methods (API/affiliate feeds) over scraping.
- Define data mapping to our graph (interests, occasions, attributes) and an execution plan with KPIs.

## Provider Matrix

- Global Marketplaces
  - Viator (Tripadvisor Experiences)
    - Scope: Global tours, activities, attractions; very large catalog.
    - Access: Partner API (approval required).
    - Pricing: Broad ($30–$200 typical; premium higher).
    - Data: Rich metadata (location, duration, categories, ratings).
    - Notes: Ideal primary source; strong graph enrichment.
  - GetYourGuide
    - Scope: Global; museums, tours, day trips, attractions.
    - Access: Partner API (approval required).
    - Pricing: Similar to Viator; excellent $30–$200 coverage.
    - Data: Clean categories; solid images and reviews.
  - Klook (APAC strong, global expanding)
    - Scope: Activities/attractions/transport; APAC depth.
    - Access: Affiliate/partner API or feeds.
    - Pricing: Wide; $20–$150 strong; family/attraction passes.
    - Notes: Fills regional diversity.
  - KKday (APAC)
    - Scope: Tours, theme parks, local experiences.
    - Access: Affiliate/partner feeds.
    - Pricing: Similar to Klook; family-friendly.

- Regional Specialists
  - Virgin Experience Days (UK)
    - Scope: Giftable bundles (driving, spa, dining, flights).
    - Access: Affiliate feeds via AWIN/CJ/Rakuten.
    - Pricing: $50–$200; strong “for two” packages.
    - Notes: Perfect for occasions (birthday/anniversary/valentines).
  - Buyagift / Red Letter Days (UK)
    - Scope: Similar to Virgin ED; large UK inventory.
    - Access: Affiliate feeds via networks.
    - Pricing: $50–$150; couple bundles.
  - RedBalloon (AU/NZ)
    - Scope: AU/NZ flagship for experiences.
    - Access: Affiliate feeds/program.
    - Pricing: $100–$200 strong.
  - WonderDays (UK), Xperience Days (US)
    - Scope: Smaller curated experience catalogs.
    - Access: Affiliate feeds; scrape only with permission.

- Events & Tickets (Selective)
  - Fever (immersive events)
    - Scope: City-based pop-ups (e.g., candlelight concerts).
    - Access: Partner/affiliate; public API uncommon.
    - Pricing: $30–$150.
    - Notes: High novelty; time-bound availability.
  - TodayTix / Goldstar / Ticketmaster
    - Scope: Theater, concerts (varied access/licensing).
    - Access: Partner programs; datafeeds vary.

- Local Deals Aggregators (Use cautiously)
  - Groupon / Travelzoo
    - Scope: Local experiences & travel deals.
    - Access: Affiliate APIs/feeds vary by region.
    - Pricing: Discount-driven, good for budget gifts.
    - Notes: Require strict quality/dedupe filters; respect ToS.

- Wellness & Classes
  - ClassPass, Mindbody
    - Scope: Classes, wellness sessions; gift cards/passes.
    - Access: Partner APIs typically restricted; no general feed.
    - Notes: Consider gift cards SKUs when direct listings are hard.

- Culinary & Dining Experiences
  - Tock, OpenTable Experiences, culinary schools
    - Scope: Tastings, chef’s tables, special menus.
    - Access: Partner-only in many cases.

## Access Strategy (Compliance First)

- Prefer official APIs and affiliate feeds:
  - APIs (Viator/GetYourGuide/Klook/KKday) provide structured JSON, pagination, stable contracts.
  - Affiliate networks (AWIN/CJ/Rakuten): CSV/XML feeds with title, description, price, URL, images, categories.
- Scraping only with permission and ToS compliance:
  - Check robots.txt and provider ToS.
  - If permitted: use Playwright, low rate, caching, UA rotation; persist source URL + timestamp.

## Expected Inventory & Price Coverage

- Catalog scale (qualitative):
  - Viator/GetYourGuide: very large (hundreds of thousands combined).
  - Klook/KKday: large, especially APAC (tens–hundreds of thousands).
  - Virgin/Buyagift/RedLetterDays/RedBalloon: tens of thousands combined; highly “giftable”.
  - Fever/TodayTix: thousands per region; curated novelty.
- Price bands (gift-friendly):
  - $25–50: workshops, tastings, intro classes.
  - $50–100: dining packages, local tours, spa sessions (entry-level).
  - $100–200: premium tours, spa-for-two, adventure drives (entry); focus to fill our current gap.
  - $200+: luxury adventures, private tours, multi-day.

## Data Model Mapping

- Core fields
  - id (source), title, description, price, currency, vendor, url, image_urls[], availability (if provided)
  - location (city, country, lat/lng), duration, schedule, meeting_point
  - rating, review_count, group_size, age_restrictions (if provided)
- Canonical mapping to graph
  - interests: map provider categories to canonical (adventure, food_drink, spa_wellness, music, art, photography, outdoor, travel, family, romantic, learning)
  - occasions: birthday, christmas/holiday, anniversary, wedding, valentines_day, mothers_day, fathers_day, graduation, housewarming, thank_you, get_well, congratulations, retirement
  - attributes: experiential=true; optionally romantic, luxury (via price/label), for_two=true when indicated; personalized=false (usually)

## Deduplication Strategy

- Cross-source dedupe (marketplaces overlap):
  - Keys: normalized title + location + duration ± vendor.
  - Fuzzy: cosine title similarity + geo proximity + price delta threshold.
  - Keep canonical: prefer highest-quality listing (images, reviews) or lowest price.
- Within-source dedupe:
  - Use provider product_id; handle variant SKUs by options aggregation.

## Sync & Scaling

- Cadence: nightly full sync; hourly deltas for price/availability where supported.
- Rate limits: respect provider quotas; exponential backoff; request pacing.
- Monitoring: log import counts, dedupe rates, error rates per source; alert on anomalies.

## KPIs (Targets)

- Coverage
  - +20–40k experiences in first pass; +50–100k within 4–6 weeks.
  - Each major occasion ≥2,000 items.
- Price balance
  - Raise $100–200 band to ≥15% of catalog via experiences and premium bundles.
- Graph connectivity
  - ≥90% of experiences with ≥1 interest; ≥80% with ≥1 occasion (on import).

## Phased Plan

- Phase 1 (1–2 weeks)
  - Integrate Viator + GetYourGuide APIs; add Virgin Experience Days (affiliate feed).
  - Import 20–40k experiences; map interests/occasions on import.
- Phase 2 (2–4 weeks)
  - Add Klook or KKday (APAC depth); add RedBalloon (AU/NZ).
  - Evaluate Fever/TodayTix for curated city novelty.
- Phase 3 (continuous)
  - Fill long-tail niches (classes, workshops); introduce gift cards for volatile inventories.

## Legal & Compliance

- Always use official APIs/feeds where possible; comply with branding and deeplink rules.
- Maintain provider attribution, deeplink parameters, and tracking where required.
- For scraping: obtain explicit permission; document compliance and rate limits.

## Risks & Mitigations

- Dynamic availability → prefer APIs with availability endpoints; cache cautiously; show live check links.
- Regional restrictions → filter by supported countries; fallback to gift cards where listings are sparse.
- Dedupe complexity → implement conservative thresholds; allow manual overrides for popular cities.

## Next Steps

- Apply to partner APIs (Viator, GetYourGuide) and affiliate programs (Virgin, Buyagift, RedBalloon).
- Draft provider-specific ingestion specs (endpoints, params, pagination, fields, mapping).
- Scaffold importers with robust mapping, dedupe, and logging.
- Pilot import (top 5 cities), validate mapping and KPIs; then scale.

