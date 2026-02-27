# Customizable/Personalized Products: Sources and Ingestion Guide

## Purpose

- Expand the catalog with high-intent, customizable gifts (engraved, monogrammed, photo-based, made-to-order).
- Favor official APIs and affiliate feeds; use scraping only with permission.
- Define data mapping (options schema, lead times) and a phased ingestion plan with KPIs.

## Why Personalized Gifts

- High perceived thoughtfulness → strong conversion for occasions (anniversary, wedding, valentines, birthday, Mother’s/Father’s Day).
- Bridges gaps in our catalog: currently personalized ≈ 5.9% of products → target 12–15%.
- Natural fit for DialogueManager clarifications (initials, name, date, photo upload, monogram style).

## Provider Matrix

- Marketplaces & POD (Print-on-Demand)
  - Etsy (API)
    - Scope: Massive marketplace; many personalized categories (jewelry, leather goods, boards, prints).
    - Access: Official Etsy API (v3) – requires key and compliance with terms.
    - Data: Title, description, price, options, shop rating/review counts, images.
    - Notes: Quality varies → filter by rating (≥4.7), reviews (≥100), processing time ≤10 days, ships to major markets.
  - Zazzle (API/feeds)
    - Scope: Customizable designs on products (mugs, cards, apparel, home decor).
    - Access: Zazzle API + affiliate feeds (CJ/AWIN).
    - Notes: Strong design template system; robust product attributes.
  - Printful / Printify (APIs)
    - Scope: POD network (merchants). Product base catalog available via API; designs usually merchant-specific.
    - Access: Public APIs (merchant-focused). For general catalog, use partner listings or curated feeds.
    - Notes: Useful for standard customizable bases (T-shirts, mugs, posters) if designs curated.
  - Redbubble / Society6 (no public API)
    - Scope: Artist marketplaces; customized designs rather than personalized text.
    - Access: Affiliate feeds may exist; scraping typically against ToS.
    - Notes: Use selectively via affiliate datafeeds.

- Photo & Stationery
  - Shutterfly / Snapfish / Mixbook / Photobox / CanvasPop
    - Scope: Photo gifts (books, canvases, calendars); deep personalization.
    - Access: Affiliate feeds; merchant APIs are limited.
    - Notes: High gift relevance; good for occasions; strong lead times consideration.
  - Minted / TinyPrints / Papier / Moonpig
    - Scope: Cards, stationery, invitations; name/date customization.
    - Access: Affiliate feeds; sometimes partner APIs.
    - Notes: Occasion tagging is natural; includes romantic/wedding.

- Personalized Retailers (US/EU/UK)
  - Personalization Mall, Things Remembered, Mark & Graham, Leatherology, NotOnTheHighStreet (UK), Uncommon Goods (personalized category)
    - Scope: Engraved/monogrammed leather/metal/wood goods, custom jewelry, home items.
    - Access: Affiliate feeds (CJ/AWIN/Rakuten), occasional partner APIs.
    - Notes: High quality, giftable packaging, clear options.

- Brand Customization (selective)
  - Nike By You, Adidas custom, Casetify, Case-Mate
    - Scope: Brand customization (shoes, cases).
    - Access: Partner-only; likely no public datafeeds.
    - Notes: Use gift cards/landing pages rather than SKU ingestion.

## Access Strategy (Compliance First)

- Prefer: APIs (Etsy, Zazzle), Affiliate feeds (CJ/AWIN/Rakuten) for Personalization Mall, Mark & Graham, Leatherology, NotOnTheHighStreet, Uncommon Goods.
- Scraping only with permission and ToS compliance; log rate limits and capture source URL + timestamp.

## Expected Inventory & Pricing

- Scale (qualitative):
  - Etsy: extremely large; after filters (rating/reviews/lead time) → tens of thousands of high-quality items.
  - Zazzle/minted/shutterfly cluster: tens of thousands across categories.
  - Personalization Mall/Things Remembered/Mark & Graham/Leatherology: thousands each; premium quality.
- Price bands (gift-friendly):
  - $25–50: mugs, phone cases, small accessories, cards.
  - $50–100: leather goods, photo books, home decor, jewelry.
  - $100–200: premium leather, keepsake boxes, framed prints; target band to balance catalog.

## Data Model Mapping

- Core fields
  - id (source), vendor, title, description, price, currency, url, image_urls[], category.
- Personalization fields (new/important)
  - personalization_type: [engraving, monogram, name_text, date, photo_upload, coordinates]
  - options_schema: structured options (fields, input types, constraints, max length, style choices).
  - preview_available: boolean (online preview/generator exists)
  - lead_time_days / processing_time_days
  - rush_available: boolean
  - gift_wrap_available: boolean
- Canonical graph mapping
  - interests: map from category/material/use (leather, cooking, home_decor, travel, office, jewelry, memory_keepsake).
  - occasions: birthday, anniversary, wedding, valentines_day, mothers_day, fathers_day, christmas/holiday, graduation, housewarming, thank_you.
  - attributes: personalized=true; luxury=(price≥$150 or vendor tag); romantic (if wedding/anniversary/valentines); material=[leather, wood, metal, paper]; for_two (if designed for couples).

## Quality Filters & Curation

- Marketplace filters (Etsy): rating ≥4.7, reviews ≥100, processing ≤10 days, ships_to includes target region.
- Retailers: prioritize curated lists (giftable packaging, high CSAT), clear option constraints.
- Drop low-quality/noisy SKUs; keep durable evergreen items.

## Deduplication Strategy

- Within-source: unique product_id; variants (color/size) consolidated; personalization options in options_schema.
- Cross-source: vendor + normalized title + material + base_form (e.g., leather passport cover); fuzzy title similarity + price proximity.
- Prefer higher-quality images, clearer options, better reviews.

## Sync & Scaling

- Cadence: nightly full sync; weekly deep refresh (options/rules change slower).
- Seasonal: ramp pre-holiday; monitor lead_time_days cutoffs.
- Monitoring: import counts, % with options_schema, median lead_time_days, error rates.

## KPIs (Targets)

- Personalized share: raise from ~5.9% → ≥12–15% of catalog.
- Occasion alignment: each major occasion ≥2,000 items mapped; personalized subset ≥30% for anniversary/valentines/wedding.
- Options coverage: ≥80% of personalized products with structured options_schema.
- Lead times: ≥70% with lead_time_days ≤10 (and rush flag where applicable).

## Phased Plan

- Phase 1 (1–2 weeks)
  - Etsy API (curated shops; apply filters); Zazzle API or affiliate feed; Personalization Mall (affiliate feed).
  - Import 10–20k items with options_schema; map interests/occasions on import.
- Phase 2 (2–4 weeks)
  - Add Mark & Graham, Leatherology, Things Remembered, NotOnTheHighStreet (personalized), Uncommon Goods personalized.
  - Add photo gift providers (Shutterfly/Minted/Snapfish).
- Phase 3 (continuous)
  - Expand curated Etsy shops; add stationery (Papier/Moonpig) and premium engravables; optimize by performance.

## Legal & Compliance

- Respect marketplace terms; many require attribution and deeplinks with affiliate tracking.
- Handle personalization inputs carefully (PII-adjacent); avoid storing values until checkout UX is defined.
- For scraping: permission required; document compliance and rate limits.

## Risks & Mitigations

- Option complexity → Use options_schema to render UI and validate inputs; include examples and constraints.
- Lead times → Show delivery estimates; flag items that may miss major occasions.
- Image variability (Etsy) → require min resolution; prioritize multi-image listings.

## Next Steps

- Apply for Etsy API; enroll in CJ/AWIN/Rakuten for Personalization Mall, Mark & Graham, Leatherology, NotOnTheHighStreet, Uncommon Goods; Zazzle Developer Network.
- Draft ingestion specs per source (endpoints/feeds, mapping, filters, dedupe).
- Scaffold importers with options_schema extraction and canonical mapping.
- Pilot import (5–10 curated providers); validate KPIs; scale progressively.

---

## Provider-Specific Ingestion Specs (Quick Reference)

This section provides concrete starting points per provider. Always verify latest docs/terms.

### Etsy (API v3)

- Docs: https://developers.etsy.com/documentation/reference/
- Auth: API key via header `x-api-key: <key>`; OAuth for shop-scoped operations (not required for public listings browse).
- Endpoints (read-only browse):
  - Search listings: `GET /v3/application/listings/active?keywords={q}&category={cat}&limit={n}&offset={o}`
  - Shop listings: `GET /v3/application/shops/{shop_id}/listings/active?limit={n}`
  - Listing details: `GET /v3/application/listings/{listing_id}`
  - Listing images: `GET /v3/application/listings/{listing_id}/images`
- Useful fields: `listing_id`, `title`, `description`, `price.amount` + `price.currency_code`, `is_personalizable`, `processing_min/max`, `who_made`, `when_made`, `tags[]`, `materials[]`, `shop_id`, `shop_section_id`, `state`, `shipping_profile_id`.
- Personalization:
  - `is_personalizable` boolean.
  - Some sellers include option instructions in `personalization_is_required`, `personalization_char_count_max`, `personalization_prompt`, or `description`.
  - Extract into `options_schema` with fields: `name_text` (max chars), `date`, `initials`, `monogram_style`.
- Filters (suggested): rating ≥4.7, total_reviews ≥100 (from `shops/{shop_id}` review summary), `processing_max <= 10`, ships_to includes target regions.
- Pagination: `limit`≤100; iterate with `offset`. Rate limits apply; add retries and backoff.
- Mapping:
  - interests: from `tags`/`materials`→ leather, wood, metal, home_decor, jewelry, cooking, office, travel, memory_keepsake.
  - occasions: infer from tags/title or seller-provided `occasion` fields if present → anniversary, wedding, valentines, birthday, mothers/fathers day, christmas.
  - attributes: personalized=true if `is_personalizable`; luxury if price≥threshold; material from `materials`.

### Zazzle (API / Affiliate Feeds)

- Docs: https://developer.zazzle.com/
- API patterns:
  - Product search: `GET https://api.zazzle.com/search?q={q}&category={cat}&page={p}&ps={page_size}` (parameters vary; check docs)
  - Returns title, price, images, available customization options.
- Affiliate feeds (CJ/AWIN): CSV/XML with fields like `name`, `description`, `price`, `sale_price`, `currency`, `category`, `product_image`, `product_url`, `brand`, `in_stock`.
- Mapping:
  - options_schema from available customization (text fields, image upload flags, template variables when exposed).
  - interests from category (mugs→home/kitchen, apparel→fashion, cards→stationery/memory_keepsake).
  - occasions from card types/seasonal categories.

### Personalization Mall / Mark & Graham / Leatherology / Things Remembered / NotOnTheHighStreet / Uncommon Goods (Personalized)

- Access: Affiliate feeds via CJ, AWIN, Rakuten; request program access.
- Typical feed fields:
  - `product_id`, `name`, `description`, `buy_url`, `image_url`, `category`, `price`, `currency`, `brand`, `availability`, `shipping`, `keywords`.
- Personalization extraction:
  - Many feeds include descriptors like "personalized", "monogram", "engraved" in `name` or `description`.
  - Build regex-based extractor to populate `options_schema` with frequent patterns: initials (2–3 chars), names (max 12–20), dates (YYYY-MM-DD), monogram styles.
- Lead times:
  - Often listed on PDP only; if feed lacks it, maintain a provider-level default and refine with occasional PDP scraping (with permission) or provider docs.
- Mapping:
  - interests: leather (wallets, passport covers), home_decor (frames, boards), office (pens, notebooks), jewelry.
  - occasions: anniversary, wedding, valentines, birthday, graduation, housewarming, christmas.

### Photo Gifts (Shutterfly / Snapfish / Mixbook / Photobox / CanvasPop / Minted / TinyPrints / Papier / Moonpig)

- Access: Affiliate feeds (CJ/AWIN/Rakuten) most common.
- Fields: similar to above; photo-based products will have categories (photo books, canvases, calendars, cards) and clear personalization requirements.
- options_schema:
  - `photo_upload` boolean; `page_count` for books; `size` variants; `paper_type`; `layout_style`.
- Lead time and rush:
  - Extract if present; otherwise maintain provider defaults per product type.
- Occasions: strong mapping to wedding/anniversary/valentines/birthday/holiday.

### Printful / Printify (APIs)

- Scope: Base products for POD; use if you plan to offer in-house designs (future).
- APIs: https://developers.printful.com/ ; https://developers.printify.com/
- Considerations: For aggregated gift catalog, prefer marketplace/retailer listings; otherwise you must curate designs.

### Redbubble / Society6

- Access: No official public product API; rely on affiliate feeds where available.
- Personalization: typically designed, not personalized text; tag as `personalized=false` but `unique/style-forward=true`.

---

## Example Field Mapping (Affiliate Feed → Internal)

| Feed Field        | Internal Field                  |
|-------------------|---------------------------------|
| product_id        | source_id                       |
| name              | title                           |
| description       | description                     |
| price, currency   | price, currency                 |
| product_url       | url                             |
| image_url(s)      | image_urls[]                    |
| category          | category_raw → canonical map    |
| brand/vendor      | vendor                          |
| availability      | availability                    |
| keywords          | tags_raw → interests/occasions  |

Personalization inference (regex on name/description):
- `engraved|engrave` → personalization_type=engraving; options_schema: name_text (max 12–20).
- `monogram|initials` → personalization_type=monogram; options_schema: initials (2–3 chars), monogram_style.
- `photo|upload` → personalization_type=photo_upload; options_schema: photo_upload=true.
- `date` patterns → options_schema: date (YYYY-MM-DD).

---

## Pagination, Rate Limits, and Backoff (General)

- APIs: use cursor/offset pagination; cap page size; parallelize modestly; retry with exponential backoff on 429/5xx.
- Feeds: fetch on schedule; verify checksums/last-modified; diff-based updates to avoid full reloads.
- Logging: per-provider import counts, % personalized detected, % with options_schema, error rates; alert on drops/spikes.
