# Experience Gift Data Sources Research

> Comprehensive analysis of experience-based gift platforms for integration into Present Agent2.
> Compiled: 2026-02-17 | Status: Research Complete

---

## Executive Summary

The current Present Agent2 catalog contains 64,964 physical B-Corp products from Shopify stores. This research identifies **50+ platforms** across 5 categories that could fill the experience gift gap. The most viable integration paths are:

1. **Gift Card Aggregator APIs** (Runa, Tango/BHN, Reloadly) -- single integration, thousands of brands
2. **Etsy Open API v3** -- direct product-level data for custom/handmade gifts
3. **Cratejoy Marketplace API** -- subscription box catalog access
4. **SeatGeek API** -- public event/ticket data
5. **Affiliate deep-link networks** (Impact, Awin, FlexOffers) -- most experience platforms available here

**Key finding:** Most experience platforms do NOT offer public product-level APIs. The dominant integration pattern is affiliate links + curated metadata, or gift card aggregator APIs for digital delivery.

---

## 1. Experience Gift Platforms

### 1.1 Tinggly

| Field | Detail |
|-------|--------|
| **URL** | https://tinggly.com |
| **Experiences** | 150,000+ experiences + 150,000 hotel stays |
| **Geographic Coverage** | 100+ countries worldwide |
| **Price Range** | $20 - $1,000 (themed gift cards); $69 - $549 (curated gift boxes) |
| **Categories** | Adventure, culinary, wellness, tours, city-specific, hobby/interest, relationship/occasion |
| **Gift Card/Voucher** | Yes -- themed gift cards and curated gift boxes; also available on Amazon |
| **API Availability** | **No public API.** Affiliate program via Impact Radius (ID: 23213) and Post Affiliate Pro |
| **Affiliate Commission** | 5% (1-3 sales/mo), 10% (4-11 sales/mo) |
| **Integration Assessment** | Affiliate links only. Could scrape gift box catalog (~77 distinct boxes) for metadata. No programmatic product access. |
| **Recommendation Suitability** | HIGH -- broad coverage, occasion-based categorization maps well to gift recommendation. Limited to recommending "collections" not individual experiences. |

### 1.2 Cloud 9 Living / Virgin Experience Gifts (US)

| Field | Detail |
|-------|--------|
| **URL** | https://www.virginexperiencegifts.com (formerly cloud9living.com) |
| **Experiences** | 6,000+ experiences (expanded from original Cloud 9 Living's 2,000+) |
| **Geographic Coverage** | 51+ US cities |
| **Price Range** | Starting at $50; up to several thousand |
| **Categories** | Driving, Flying, Food & Drink, Adventure, Getaways, Golf, Tours & Sightseeing, Attractions, Cruises & Sailing, Creative Experiences, Spa, Water Activities, National Parks, Entertainment & Games, Virtual Experiences (15 categories) |
| **Gift Card/Voucher** | Yes -- gift certificates and experience-specific vouchers |
| **API Availability** | **No public API.** Affiliate program via AvantLink, FlexOffers, VigLink, Skimlinks |
| **Affiliate Commission** | 5% baseline |
| **Integration Assessment** | Affiliate links. Strong US coverage. Category structure aligns well with gift rec taxonomy. |
| **Recommendation Suitability** | HIGH -- 15-category taxonomy, US-focused, good price diversity. Cloud 9 Living vouchers still valid. |

### 1.3 Virgin Experience Days (UK)

| Field | Detail |
|-------|--------|
| **URL** | https://www.virginexperiencedays.co.uk |
| **Experiences** | 4,000+ experiences (UK) |
| **Geographic Coverage** | United Kingdom |
| **Price Range** | GBP 10 - GBP 3,000 |
| **Categories** | 14 categories: Driving, Food & Drink, Days Out & Tours, Adventure, Short Breaks, Afternoon Tea, Spa Days, Stay at Home, Flying, Sports, Animal, Water Sports, Arts & Crafts, Theatre & Events |
| **Gift Card/Voucher** | Yes |
| **API Availability** | **No public API.** Affiliate via Awin (10-12% commission, 90-day cookie) |
| **Affiliate Commission** | 10-12% |
| **Integration Assessment** | UK-only. Higher commission rate than US counterpart. Relevant if platform expands internationally. |
| **Recommendation Suitability** | MEDIUM -- only relevant for UK recipients |

### 1.4 Airbnb Experiences

| Field | Detail |
|-------|--------|
| **URL** | https://www.airbnb.com/experiences |
| **Experiences** | Tens of thousands across 650+ cities, 19 categories |
| **Geographic Coverage** | 650+ cities worldwide |
| **Price Range** | Many under $50; full range up to hundreds |
| **Categories** | 19 categories including Nature & Outdoors (top booked), Food & Drink, Art, Culture, Tours, Adventure, Wellness |
| **Gift Card/Voucher** | Yes -- Airbnb gift cards (not experience-specific) |
| **API Availability** | **No public Experiences API.** General Airbnb API exists but is partner-only, not accepting new applications. No Experiences-specific endpoints. |
| **Integration Assessment** | VERY DIFFICULT. No API, no affiliate program, partner-only access. Would require scraping or gift card aggregator integration. |
| **Recommendation Suitability** | HIGH potential but LOW feasibility -- massive catalog but no data access path. Could recommend Airbnb gift cards via aggregator API. |

### 1.5 ClassBento

| Field | Detail |
|-------|--------|
| **URL** | https://classbento.com |
| **Experiences** | 7,000+ creative classes and kits |
| **Geographic Coverage** | US cities (NYC, LA, SF, and more), also Australia |
| **Price Range** | ~$50 - $300+ per workshop |
| **Categories** | Cooking, arts, crafts, pottery, painting, jewelry making, rug tufting, floristry, woodworking, perfume making, candle making |
| **Gift Card/Voucher** | Yes -- gift cards: $50, $100, $200, $300, $400, custom amounts |
| **API Availability** | **No public API.** Affiliate via Commission Factory (5% commission, 60-day cookie) |
| **Integration Assessment** | Affiliate only. Good creative/hands-on category coverage. |
| **Recommendation Suitability** | HIGH for creative/hobby interests -- strong category-to-interest mapping |

### 1.6 Classpop!

| Field | Detail |
|-------|--------|
| **URL** | https://www.classpop.com |
| **Experiences** | Thousands of classes across US cities |
| **Geographic Coverage** | Major US cities (NYC, Chicago, LA, SF, Seattle, Denver, Philadelphia, Boston, Minneapolis, etc.) |
| **Price Range** | Varies by class type; gift cards available |
| **Categories** | Cooking, painting/sip-and-paint, pottery, dance, photography, creative writing |
| **Gift Card/Voucher** | Yes -- gift certificates for any class nationwide |
| **API Availability** | **No public API.** Has affiliate partnerships. |
| **Integration Assessment** | Similar to ClassBento. Affiliate links. Complements ClassBento coverage. |
| **Recommendation Suitability** | HIGH for creative interests |

### 1.7 MasterClass

| Field | Detail |
|-------|--------|
| **URL** | https://www.masterclass.com |
| **Experiences** | 200+ classes from world-class instructors |
| **Geographic Coverage** | Global (online/digital) |
| **Price Range** | Annual membership ~$120/year (50% off sales common); individual class gifts available |
| **Categories** | Cooking, Writing, Music, Film, Business, Science, Sports, Design, Photography, Wellness |
| **Gift Card/Voucher** | Yes -- annual membership gift or single-class gift; gift does not auto-renew |
| **API Availability** | **Developer portal exists** at developer.masterclass.com. Details sparse but suggests B2B API may be available. |
| **Integration Assessment** | PROMISING. Developer portal exists. Worth contacting for API access. Gift subscription is a clean recommendation target. |
| **Recommendation Suitability** | HIGH -- excellent for learning-oriented recipients. Clean gift flow (no auto-renew). |

### 1.8 Coursera / Skillshare (Learning Gifts)

| Field | Detail |
|-------|--------|
| **Coursera URL** | https://www.coursera.org |
| **Skillshare URL** | https://www.skillshare.com |
| **Price Range** | Coursera Plus ~$59/mo or $399/yr; Skillshare ~$168/yr |
| **Gift Options** | Coursera: can gift individual courses or Coursera Plus (no traditional gift cards). Skillshare: corporate gift cards only (25+ people, 3 or 6 months) -- individual gift cards discontinued. |
| **API Availability** | **No public gift/recommendation API for either.** Skillshare affiliate: $7 per referral or 20% commission. |
| **Integration Assessment** | LOW. No APIs, limited gifting options. Skillshare's gift card discontinuation is a problem. |
| **Recommendation Suitability** | LOW for direct recommendation; could recommend via gift card aggregator |

### 1.9 Goldbelly

| Field | Detail |
|-------|--------|
| **URL** | https://www.goldbelly.com |
| **Products** | 450+ famous food shops; thousands of individual items |
| **Geographic Coverage** | US nationwide shipping |
| **Price Range** | $17 - $900+ (subscriptions $50-$900/year; individual items $17-$200+) |
| **Categories** | Pizza, BBQ, bagels, pastries, seafood (lobster), tacos, sandwiches, macarons, cakes, regional specialties |
| **Gift Card/Voucher** | Yes -- gift cards and subscription gifts |
| **API Availability** | **No public API.** GitHub presence (github.com/Goldbely) but no public API docs. Affiliate via Impact (3-10% commission, 30-day cookie). |
| **Integration Assessment** | Affiliate only. Strong food/culinary gift coverage. |
| **Recommendation Suitability** | HIGH for food lovers -- regional/artisan food gifts are excellent recommendation targets |

### 1.10 Atlas Obscura Experiences

| Field | Detail |
|-------|--------|
| **URL** | https://www.atlasobscura.com/experiences |
| **Experiences** | Curated trips (12-14 travelers), virtual experiences, unique local events |
| **Geographic Coverage** | Global trips (Pakistan, Borneo, Canada, West Africa, Brazil, Ireland, Vietnam, Jordan, Scotland, Benin, Mexico) |
| **Price Range** | Premium -- multi-day trips likely $2,000-$8,000+; virtual experiences lower |
| **Categories** | Adventure travel, food & culture, wildlife & nature, fossil-digging, astronomy, community events |
| **Gift Card/Voucher** | Membership and trip-specific bookings |
| **API Availability** | **No public API.** No affiliate program found. |
| **Integration Assessment** | LOW feasibility. Premium/niche. No data access. Manual curation only. |
| **Recommendation Suitability** | NICHE -- high-end adventure travelers only |

---

## 2. Event & Ticket Platforms

### 2.1 Fever

| Field | Detail |
|-------|--------|
| **URL** | https://feverup.com |
| **Events** | Thousands of curated events; Candlelight Concerts are signature |
| **Geographic Coverage** | 50+ cities worldwide (London, NYC, Paris, Madrid, Singapore, Tokyo, expanding) |
| **Price Range** | Gift cards GBP 30-80; event tickets vary widely |
| **Categories** | Immersive experiences, concerts (Candlelight), art installations, food events, comedy, theater |
| **Gift Card/Voucher** | Yes -- gift cards |
| **API Availability** | **No public API.** Unofficial GitHub scraper exists (github.com/offk0rs/feverup). Acquired DICE (June 2025) and Atom Tickets (March 2025). Partner integrations via TicketingHub. |
| **Integration Assessment** | LOW for direct API. Gift card recommendation via aggregator possible. Scraping risky. |
| **Recommendation Suitability** | HIGH potential -- curated events are perfect gift targets, but no data access |

### 2.2 Eventbrite

| Field | Detail |
|-------|--------|
| **URL** | https://www.eventbrite.com |
| **Events** | Millions of events globally |
| **Geographic Coverage** | Global |
| **Price Range** | Free to hundreds; varies by event |
| **API Availability** | **Public API exists** at eventbrite.com/platform/api. OAuth 2.0 auth. **HOWEVER: Event Search endpoint (GET /v3/events/search/) was deprecated in February 2020.** Remaining endpoints: retrieve event by ID, list by venue, list by organization. |
| **Rate Limits** | ~2,000 requests/hour |
| **Gift-Friendliness** | LOW -- no built-in gift/voucher mechanism. You buy tickets for yourself. |
| **Integration Assessment** | POOR for gift recommendations. Search API deprecated. Cannot discover events programmatically across the platform. Would need to curate specific organizations/venues manually. |
| **Recommendation Suitability** | LOW -- no gift mechanism, no search API |

### 2.3 SeatGeek

| Field | Detail |
|-------|--------|
| **URL** | https://seatgeek.com |
| **Events** | 70,000+ live events; 16M+ tickets |
| **Geographic Coverage** | US, Canada, worldwide |
| **Price Range** | Varies by event ($20 - $1,000+) |
| **API Availability** | **Public API available** at developer.seatgeek.com. Returns events, performers, venues, recommendations. Application-only auth (client_id). Also available on RapidAPI. |
| **Gift-Friendliness** | MEDIUM -- buy tickets as gifts; no gift card mechanism |
| **Affiliate Commission** | Average $11 per sale |
| **Integration Assessment** | GOOD. Public API with event search. Can discover concerts, sports, theater. Gift mechanism is buying tickets for someone. |
| **Recommendation Suitability** | MEDIUM-HIGH -- can recommend specific events based on interests (favorite bands, sports teams) |

### 2.4 StubHub

| Field | Detail |
|-------|--------|
| **URL** | https://stubhub.com |
| **Events** | Massive secondary ticket marketplace |
| **Geographic Coverage** | Global |
| **API Availability** | **Gated API** at developer.stubhub.com. Must email affiliates@stubhub.com for access. OAuth 2.0. Application-only auth for public data (events, listings). |
| **Gift-Friendliness** | LOW -- secondary market, no gift mechanism |
| **Integration Assessment** | MODERATE. API exists but requires approval. Secondary market prices may not be ideal for gift recommendations. |
| **Recommendation Suitability** | LOW-MEDIUM -- useful only for specific event ticket recommendations |

### 2.5 Vivid Seats

| Field | Detail |
|-------|--------|
| **URL** | https://www.vividseats.com |
| **Events** | 70,000+ live events |
| **Geographic Coverage** | US, Canada, worldwide |
| **API Availability** | **Feed API available** with Events and Listings endpoints. Filtering by categories (sports, concerts, theater). Affiliate via Impact (6% commission, 30-day cookie). |
| **Gift-Friendliness** | MEDIUM -- buy tickets as gifts |
| **Integration Assessment** | MODERATE. Feed API for inventory data. Affiliate program for monetization. |
| **Recommendation Suitability** | MEDIUM -- similar to SeatGeek but less public API documentation |

### 2.6 The Escape Game (Escape Rooms)

| Field | Detail |
|-------|--------|
| **URL** | https://theescapegame.com |
| **Experiences** | Multiple escape room themes per location + remote adventures |
| **Geographic Coverage** | Major US cities (expanding -- Tysons Corner, Seattle upcoming) |
| **Price Range** | $25-$40 per person; private games $140-$280; pre-sale bundles 4 e-gift cards for $100 |
| **Gift Card/Voucher** | Yes -- digital e-gift cards (never expire), physical gift cards, remote adventure gift cards |
| **API Availability** | **No public API.** Shopify-based store (store.theescapegame.com). Affiliate program (25% commission). |
| **Integration Assessment** | Affiliate only. Shopify store could potentially be scraped. High affiliate commission. |
| **Recommendation Suitability** | HIGH for adventure/group activity gifts -- clear recommendation target |

---

## 3. Subscription Gift Boxes

### 3.1 Cratejoy Marketplace

| Field | Detail |
|-------|--------|
| **URL** | https://www.cratejoy.com |
| **Boxes** | Hundreds of subscription boxes from independent sellers |
| **Subscribers** | 392,000+ marketplace subscribers |
| **Price Range** | $3 - $100+ per box (Low: $1-15, Medium: $16-25, High: $30-50, Premium: $50+) |
| **Categories** | Books, jewelry, beverages, arts & crafts, beauty, games, home accessories, food, wellness, kids |
| **Gift Options** | Most boxes offer gift subscriptions |
| **API Availability** | **YES -- Cratejoy API available** (docs.cratejoy.com). Seller API (management tools), Storefront API (read access + customer management), Merchant API (data + functionality). |
| **Integration Assessment** | **BEST subscription box integration path.** API available. Marketplace with hundreds of curated boxes. Could pull catalog data, categories, pricing programmatically. |
| **Recommendation Suitability** | VERY HIGH -- diverse categories, gift-friendly, API available, price diversity |

### 3.2 FabFitFun

| Field | Detail |
|-------|--------|
| **URL** | https://fabfitfun.com |
| **Products** | Seasonal boxes with 6-8 full-size products per box |
| **Price Range** | $49.99/seasonal; annual subscription lower per-box |
| **Categories** | Beauty, wellness, fitness, home, fashion accessories |
| **Gift Options** | Yes -- annual or seasonal membership gifts; e-gift cards; group gifting |
| **API Availability** | **No public API.** Affiliate via FlexOffers (VIP program). Original affiliate program closed years ago. |
| **Integration Assessment** | Affiliate only. Single product recommendation (the box itself). |
| **Recommendation Suitability** | MEDIUM -- good for women's wellness/beauty interests but limited to one product |

### 3.3 Book of the Month

| Field | Detail |
|-------|--------|
| **URL** | https://www.bookofthemonth.com |
| **Products** | Curated book selections monthly |
| **Price Range** | 3-book ($49.99), 6-book ($89.99), 12-book ($169.99) gift plans |
| **Categories** | Fiction, literary fiction, thriller, romance, historical |
| **Gift Options** | Yes -- 3, 6, or 12-book gift memberships with gift codes |
| **API Availability** | **No public API.** Affiliate program available. |
| **Integration Assessment** | Affiliate only. Clean gift flow. |
| **Recommendation Suitability** | HIGH for book lovers -- clean gift, well-known brand, good price points |

### 3.4 Wine/Beer/Spirits Subscriptions

#### Winc
| Field | Detail |
|-------|--------|
| **URL** | https://www.winc.com |
| **Products** | Personalized wine selections based on taste profile; 5M+ bottles sold |
| **Price Range** | ~$50-80/shipment; gift cards available |
| **Affiliate Commission** | $18-75 per sale depending on network; 19-25% on gift cards |
| **API Availability** | **No public API.** Affiliates via Impact, FlexOffers, Skimlinks |

#### Firstleaf
| Field | Detail |
|-------|--------|
| **URL** | https://www.firstleaf.com |
| **Products** | Algorithm-powered wine club |
| **Gift Options** | Gift cards (digital, choose amount); curated bundles |
| **Affiliate Commission** | $16 per subscription via FlexOffers |
| **API Availability** | **No public API.** |

#### CraftBeerClub
| Field | Detail |
|-------|--------|
| **URL** | https://www.craftbeerclub.com |
| **Products** | Craft beer subscription from independent breweries |
| **Gift Options** | Gift subscriptions available |
| **API Availability** | **No public API.** Standard affiliate program. |

**Integration Assessment for Beverage Subscriptions:** Affiliate links only across all platforms. Good recommendation targets for specific interests (wine lover, craft beer enthusiast). Age verification required.

### 3.5 Food Subscriptions

| Platform | URL | Price Range | Gift Option | Affiliate | API |
|----------|-----|-------------|-------------|-----------|-----|
| **Universal Yums** | universalyums.com | $17-38/mo (3 sizes) | Yes | Yes | No |
| **SnackCrate** | snackcrate.com | $27/mo (medium) | Yes | Yes | No |
| **Bokksu** | bokksu.com | $49.99/mo (Japanese snacks) | Yes | Yes | No |

**Recommendation Suitability:** HIGH for foodies/adventurous eaters. Each has distinct positioning (global snacks vs. Japanese focus).

### 3.6 Coffee Subscriptions

| Platform | URL | Price Range | Gift Option | Affiliate | API |
|----------|-----|-------------|-------------|-----------|-----|
| **Trade Coffee** | drinktrade.com | ~$15-22/bag; subscriptions | Yes | Yes | No |
| **Atlas Coffee Club** | atlascoffeeclub.com | ~$14/bag; gift subscriptions | Yes | Yes (Pepperjam) | No |
| **Blue Bottle Coffee** | bluebottlecoffee.com | ~$16-22/bag | Yes | Yes | No |

**Recommendation Suitability:** HIGH for coffee enthusiasts. Trade has 400+ coffees from dozens of roasters. Atlas focuses on single-origin world coffees.

### 3.7 Self-Care Subscriptions

| Platform | URL | Price Range | Gift Option | Affiliate | API |
|----------|-----|-------------|-------------|-----------|-----|
| **TheraBox** | mytherabox.com | $37.99/mo (8 items, $200+ value) | Yes (gift subs + gift cards) | Yes | No |
| **FaceTory** | facetory.com | ~$20-40/mo (K-beauty) | Yes | Yes | No |

**Recommendation Suitability:** HIGH for wellness/self-care interests. TheraBox's therapist-curated angle is a differentiator.

### 3.8 Kids/Hobby Subscriptions

#### KiwiCo
| Field | Detail |
|-------|--------|
| **URL** | https://www.kiwico.com |
| **Products** | STEM/STEAM subscription boxes by age group |
| **Age Ranges** | Panda (0-24mo), Koala (2-4), Kiwi (5-8), Atlas (6-11), Yummy (6-14), Doodle (14-16+), Tinker (9-16+), Eureka (14+), Maker (14+) |
| **Price Range** | ~$20-30/month |
| **Gift Options** | Yes -- gift subscriptions and individual store items |
| **Affiliate Commission** | Up to $20 for renewing subs, $10 for non-renewing, 10% on store |
| **API Availability** | **No public API.** |
| **Recommendation Suitability** | VERY HIGH for kids' gifts -- age-segmented, STEM-focused, well-known brand |

---

## 4. Digital Gift Platforms

### 4.1 Streaming Services

| Service | Gift Mechanism | Price Range | Giftability |
|---------|---------------|-------------|-------------|
| **Netflix** | Gift cards ($25-$200); note: cannot cancel until balance depleted | $6.99-$22.99/mo | HIGH |
| **Spotify** | Gift cards (custom amounts) | $10.99-$16.99/mo | HIGH |
| **Disney+** | Gift cards ($25-$200) | $7.99-$13.99/mo | HIGH |
| **Apple TV+** | Via Apple gift cards | $9.99/mo | HIGH |
| **Hulu** | Gift cards available | $7.99-$17.99/mo | HIGH |

**API Availability:** None of these offer public APIs for gift card purchases. Available through **gift card aggregator APIs** (Runa, Tango/BHN, Reloadly).

### 4.2 Wellness Apps

| App | Gift Option | Price | Affiliate |
|-----|------------|-------|-----------|
| **Calm** | Gift subscriptions at calm.com/gift | ~$69.99/year | Yes |
| **Headspace** | Gift subscriptions (individual only, not Family) | ~$69.99/year | Yes (12% monthly, 8% annual via FlexOffers, 45-day cookie) |
| **Strava** | Gift subscription ($79.99/year, no auto-renew) | $79.99/year | Bulk partnership program (min $20K) |

**API Availability:** No public gift APIs. Headspace has best affiliate program.
**Recommendation Suitability:** HIGH for wellness/mindfulness/fitness interests.

### 4.3 Audible / Kindle Unlimited

| Service | Gift Option | Price | Affiliate Commission |
|---------|------------|-------|---------------------|
| **Audible** | Gift memberships (3, 6, 12 months) | ~$45-$150 | $5 free trial, $8-10 gift memberships |
| **Kindle Unlimited** | Gift subscriptions (6, 12, 24 months) | ~$60-$240 | Via Amazon Associates |

**API Availability:** Via Amazon Product Advertising API (limited). Affiliate program well-established.
**Recommendation Suitability:** HIGH for book lovers / podcast listeners.

### 4.4 Gaming Gift Cards

| Platform | Gift Cards | Price Range |
|----------|-----------|-------------|
| **Steam** | Digital gift cards (no API -- must be Steam friends 3+ days) | $5-$100 |
| **PlayStation Store** | Gift cards | $10-$100 |
| **Xbox** | Gift cards | $10-$100 |
| **Nintendo eShop** | Gift cards | $10-$99 |

**API Availability:** Not direct. Available through **gift card aggregator APIs** (Runa, Reloadly, WUPEX).
**Recommendation Suitability:** HIGH for gamers. Platform preference is key data point.

### 4.5 MasterClass (also listed in Section 1)

See Section 1.7. Developer portal exists at developer.masterclass.com.

---

## 5. Personalized/Custom Gift Platforms

### 5.1 Etsy

| Field | Detail |
|-------|--------|
| **URL** | https://www.etsy.com |
| **Products** | Millions of handmade, custom, vintage items |
| **Geographic Coverage** | Global |
| **Price Range** | $1 - $10,000+ |
| **Categories** | Jewelry, home decor, clothing, art, craft supplies, personalized gifts, vintage |
| **API Availability** | **YES -- Etsy Open API v3** (developers.etsy.com). REST API with OAuth 2.0. Endpoints for listings, shops, searches, images, reviews. |
| **Rate Limits** | 10,000 requests/day, 10 QPS |
| **Key Limitation** | API key approval can take days to months. Default is personal/shop access; marketplace-wide search requires higher access level. |
| **Integration Assessment** | **BEST custom/handmade integration path.** API is mature. Can search listings by keyword, category, price range. Can filter for gift-ready items. |
| **Recommendation Suitability** | VERY HIGH -- massive catalog, personalization options, custom items. Could build "personalized gift" recommendations using Etsy search. Not B-Corp but handmade/artisan aligns with ethical sourcing values. |

### 5.2 Minted

| Field | Detail |
|-------|--------|
| **URL** | https://www.minted.com |
| **Products** | Custom stationery, art prints, wedding invitations, home decor, gifts |
| **Price Range** | $10 - $500+ |
| **Categories** | Art prints, stationery, photo cards, wedding, holiday cards, home decor, gifts |
| **Gift Options** | Direct product purchase as gifts |
| **API Availability** | **No public API.** Affiliate via Impact (20% commission, 30-120 day cookie). |
| **Integration Assessment** | Affiliate only. High commission rate. |
| **Recommendation Suitability** | HIGH for personalized/art gifts -- independent artist designs, premium quality |

### 5.3 Shutterfly / Artifact Uprising (Photo Gifts)

| Platform | URL | Price Range | Positioning | API | Affiliate |
|----------|-----|-------------|-------------|-----|-----------|
| **Shutterfly** | shutterfly.com | From $10; huge catalog (mugs, blankets, books, puzzles) | Affordable, wide selection | No public API | Yes |
| **Artifact Uprising** | artifactuprising.com | Premium pricing | Premium quality, elevated aesthetic | No public API | Yes |

**Recommendation Suitability:** MEDIUM -- photo gifts require recipient's photos, which limits recommendation utility. Better as a "type of gift" suggestion than specific product.

---

## 6. Gift Card Aggregator APIs (Meta-Platforms)

These are the **highest-leverage integration points** -- single API, thousands of brands.

### 6.1 Runa (formerly WeGift)

| Field | Detail |
|-------|--------|
| **URL** | https://runa.io |
| **Catalog** | 2,000-5,000+ gift card brands |
| **Geographic Coverage** | 30+ countries, 20 currencies, 190+ countries for delivery |
| **Pricing** | Free API implementation; margin on gift cards |
| **API** | **YES -- full REST API.** Single integration, instant digital delivery. |
| **Brands Include** | Apple, Uber, DoorDash, Starbucks, Nike, Amazon, streaming services, gaming |
| **Integration Assessment** | **TOP PRIORITY.** Single API covers streaming, gaming, dining, retail, wellness gift cards. Immediate path to digital gift coverage. |

### 6.2 Tango / BHN (Blackhawk Network)

| Field | Detail |
|-------|--------|
| **URL** | https://www.tangocard.com |
| **Catalog** | 3,100+ reward options (physical + digital gift cards, prepaid cards, charitable donations) |
| **Geographic Coverage** | 225+ countries |
| **API** | **YES -- full REST API** (developers.tangocard.com). Methods: post accounts/funds, get catalog, post orders. |
| **Note** | Tango acquired by Blackhawk Network (BHN) in 2024; integration completed March 2025. |
| **Integration Assessment** | **TOP PRIORITY (alternative to Runa).** Larger catalog. Includes charitable donations as gift option. Enterprise-grade. |

### 6.3 Reloadly

| Field | Detail |
|-------|--------|
| **URL** | https://www.reloadly.com |
| **Catalog** | 14,000+ products from 300+ brands |
| **Geographic Coverage** | 170+ countries |
| **API** | **YES -- full REST API** (docs.reloadly.com). Gift cards, mobile top-ups, prepaid cards. |
| **Integration Assessment** | **Largest catalog.** Good for comprehensive coverage. Developer-friendly docs. |

### 6.4 WUPEX

| Field | Detail |
|-------|--------|
| **URL** | https://wupex.com |
| **Products** | Digital gift cards (Amazon, Apple, Google Play, Xbox, Steam) |
| **API** | Yes -- high-performance API for digital gift card distribution |
| **Integration Assessment** | Smaller, gaming/tech focused. Good if primary need is gaming gift cards. |

---

## 7. Integration Strategy Assessment

### Tier 1: Immediate High-Value Integrations

| Platform | Integration Type | Effort | Value | Why |
|----------|-----------------|--------|-------|-----|
| **Runa or Tango/BHN** | Gift Card Aggregator API | Medium | VERY HIGH | Single integration = thousands of digital gift brands (streaming, gaming, dining, retail). Covers entire digital gift category. |
| **Etsy Open API v3** | Direct Product API | Medium | VERY HIGH | Millions of personalized/custom gifts. API mature. Complements B-Corp physical products with artisan/handmade. |
| **Cratejoy API** | Marketplace API | Medium | HIGH | Hundreds of subscription boxes across all interest categories. API available. |

### Tier 2: Affiliate Deep-Link Integration

| Platform | Network | Commission | Value |
|----------|---------|------------|-------|
| **Tinggly** | Impact Radius | 5-10% | Experience collections worldwide |
| **Virgin Experience Gifts** | AvantLink | 5% | 6,000+ US experiences |
| **ClassBento** | Commission Factory | 5% | 7,000+ creative workshops |
| **Goldbelly** | Impact | 3-10% | Artisan food gifts |
| **Book of the Month** | Affiliate | TBD | Book lover gifts |
| **KiwiCo** | Direct | $10-20 | Kids' STEM gifts |
| **MasterClass** | TBD (dev portal) | TBD | Online learning gifts |
| **Minted** | Impact | 20% | Custom art/stationery |
| **The Escape Game** | Direct | 25% | Escape room experiences |
| **Headspace** | FlexOffers | 8-12% | Wellness app gift |

**Implementation Pattern:** Build an affiliate link management system that stores curated experience metadata (title, description, price range, categories, URL, affiliate link) and serves them alongside Neo4j product results.

### Tier 3: Future/Aspirational

| Platform | Barrier | Notes |
|----------|---------|-------|
| **Airbnb Experiences** | No API, no affiliate, partner-only | Monitor for changes; recommend gift cards via aggregator |
| **Fever** | No public API | Could scrape; risky. Recommend gift cards via aggregator |
| **SeatGeek** | Public API but weak gift mechanism | Useful for event discovery; "buy tickets as a gift" |
| **MasterClass API** | Developer portal exists, details unknown | Contact directly for API access |

---

## 8. Complementarity Analysis

### How Experience Gifts Fill Gaps in Current Catalog

| Current Gap | Solution | Platforms |
|-------------|----------|-----------|
| **"I don't want to give a thing"** | Experience vouchers | Tinggly, Virgin Experience Gifts, ClassBento |
| **Digital-native recipients** | Streaming/gaming/app gift cards | Runa/Tango API (Netflix, Spotify, Steam, etc.) |
| **Food & dining experiences** | Artisan food delivery + classes | Goldbelly, ClassBento (cooking), Classpop |
| **Learning & growth gifts** | Online courses + memberships | MasterClass, Audible, Book of the Month |
| **Wellness & self-care** | App subscriptions + boxes | Calm, Headspace, TheraBox, Strava |
| **Kids & family** | Educational subscriptions | KiwiCo, Universal Yums (family activity) |
| **Couple/date experiences** | Local experiences | ClassBento, Classpop, Fever, Escape Game |
| **Custom/personalized** | Handmade + custom items | Etsy API, Minted, Shutterfly |
| **Recurring gifts** | Subscription boxes | Cratejoy API (all categories) |
| **Last-minute gifts** | Digital delivery | All gift card aggregator APIs, Tinggly e-gifts |
| **Budget flexibility** | $5 gift cards to $1,000 experiences | Full spectrum via aggregator APIs |

### Price Range Coverage

| Tier | Current B-Corp Products | Experience Gifts Addition |
|------|------------------------|--------------------------|
| Under $25 | Limited | Gift cards (streaming, gaming, apps), small subscription boxes |
| $25-$50 | Good | Experience gift cards, subscription box gifts, wellness apps |
| $50-$100 | Good | ClassBento workshops, Tinggly collections, MasterClass |
| $100-$250 | Good | Virgin Experience Gifts, premium subscriptions, Etsy custom |
| $250-$500 | Some | Tinggly premium, multi-month subscriptions, Goldbelly subscriptions |
| $500+ | Few | Atlas Obscura trips, premium experience packages |

---

## 9. Recommended Data Model Extensions

To integrate experience gifts into the existing Neo4j schema:

```
New Node Types:
  (:ExperienceGift)     -- individual experience/subscription/gift card
  (:ExperienceProvider)  -- Tinggly, ClassBento, Runa, etc.
  (:GiftCardBrand)       -- Netflix, Steam, Starbucks (from aggregator)

New Properties on ExperienceGift:
  type: 'experience' | 'subscription' | 'gift_card' | 'digital' | 'custom'
  delivery_method: 'digital' | 'physical' | 'in_person'
  source_platform: string
  affiliate_url: string
  affiliate_network: string
  commission_rate: float
  price_min: float
  price_max: float
  geographic_scope: string[]
  is_recurring: boolean
  personalization_level: 'none' | 'choice' | 'custom' | 'fully_personalized'

New Relationships:
  (:ExperienceGift)-[:MATCHES_INTEREST]->(:Interest)
  (:ExperienceGift)-[:GIFT_FOR_OCCASION]->(:GiftOccasion)
  (:ExperienceGift)-[:GIFT_FOR_RELATIONSHIP]->(:GiftRelationship)
  (:ExperienceGift)-[:PROVIDED_BY]->(:ExperienceProvider)
  (:ExperienceGift)-[:IN_CATEGORY]->(:Category)
```

---

## 10. Implementation Roadmap

### Phase 1: Digital Gift Cards (1-2 weeks)
- Integrate Runa or Tango/BHN gift card API
- Immediate coverage: streaming, gaming, dining, retail gift cards
- Low risk, high value, instant digital delivery

### Phase 2: Curated Experience Metadata (2-3 weeks)
- Build affiliate link management system
- Manually curate top 200 experiences from Tinggly, Virgin, ClassBento, Goldbelly, etc.
- Map to existing Interest/Occasion/Relationship taxonomy
- Store in Neo4j alongside physical products

### Phase 3: Etsy & Cratejoy API Integration (3-4 weeks)
- Apply for Etsy API v3 access (may take time for approval)
- Integrate Cratejoy marketplace API
- Programmatic product/box discovery and ingestion

### Phase 4: MasterClass + Premium Partnerships (4-6 weeks)
- Contact MasterClass developer program
- Explore Airbnb partnership possibilities
- Negotiate direct API access with high-value platforms

---

## Sources

### Experience Platforms
- [Tinggly](https://tinggly.com) | [Tinggly Affiliate](https://tinggly.com/affiliate-program)
- [Virgin Experience Gifts (US)](https://www.virginexperiencegifts.com) | [Virgin Experience Days (UK)](https://www.virginexperiencedays.co.uk)
- [Airbnb Experiences](https://www.airbnb.com/experiences) | [Airbnb Developer](https://developer.airbnb.com/)
- [ClassBento](https://classbento.com) | [Classpop](https://www.classpop.com)
- [MasterClass](https://www.masterclass.com) | [MasterClass Developer](https://developer.masterclass.com/)
- [Goldbelly](https://www.goldbelly.com)
- [Atlas Obscura Experiences](https://www.atlasobscura.com/experiences)

### Event & Ticket Platforms
- [Fever](https://feverup.com) | [Wikipedia](https://en.wikipedia.org/wiki/Fever_(app))
- [Eventbrite API](https://www.eventbrite.com/platform/api)
- [SeatGeek API](https://developer.seatgeek.com/)
- [StubHub API](https://developer.stubhub.com/)
- [Vivid Seats](https://www.vividseats.com) | [Vivid Seats Feed API](https://ticketsdata.com/blog/vividseats-feed-api)
- [The Escape Game](https://theescapegame.com)

### Subscription Boxes
- [Cratejoy API](https://docs.cratejoy.com/) | [Cratejoy Marketplace](https://www.cratejoy.com)
- [KiwiCo](https://www.kiwico.com) | [Book of the Month](https://www.bookofthemonth.com)
- [Universal Yums](https://www.universalyums.com) | [Bokksu](https://www.bokksu.com)
- [TheraBox](https://mytherabox.com)

### Digital & Custom Platforms
- [Etsy Open API v3](https://developers.etsy.com/)
- [Minted](https://www.minted.com) | [Shutterfly](https://www.shutterfly.com) | [Artifact Uprising](https://www.artifactuprising.com)

### Gift Card Aggregator APIs
- [Runa](https://runa.io/gift-card-api) | [Tango/BHN](https://www.tangocard.com/gift-card-api) | [Reloadly](https://www.reloadly.com/products/gift-card-api/) | [WUPEX](https://wupex.com/api/)
