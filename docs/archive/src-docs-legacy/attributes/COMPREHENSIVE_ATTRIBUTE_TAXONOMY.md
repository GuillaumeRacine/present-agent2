# Comprehensive Gift Attribute Taxonomy

## Overview

This document defines the **100-attribute system** for gift product classification in Present-Agent2. The system was expanded from 14 attributes to 100 attributes organized into 11 dimension groups to enable richer, more nuanced gift matching.

**Key Metrics**:
- **Attributes**: 100 boolean flags (up from 14)
- **Dimension Groups**: 11 thematic categories (up from 7)
- **Coverage Target**: ~95% of products (up from 39.2%)
- **Attributes per Product**: 10-30 typical (up from 0-4)
- **Inference Method**: LLM-based (GPT-4o-mini) with comprehensive prompting

## Design Principles

### 1. Inference Over Prescription
We **infer** attributes from product characteristics rather than requiring exact keyword matches. This allows us to understand what a product *is* rather than just what it *says*.

### 2. Multi-Dimensional Profiling
Products are not one-dimensional. A single gift can be:
- **Practical** AND **luxurious** (high-end kitchen appliance)
- **Sentimental** AND **modern** (personalized tech gadget)
- **Educational** AND **playful** (STEM toy)

### 3. Boolean Clarity
All attributes are boolean (true/false) for:
- Simple graph queries
- Clear archetype matching
- Easy combination logic
- Consistent data model

### 4. Research-Backed Categories
The 11 dimension groups are based on:
- E-commerce taxonomies (Amazon, Etsy, Schema.org)
- Gift psychology research
- Consumer behavior patterns
- Recommendation system best practices (Netflix, Spotify)

---

## The 11 Dimension Groups

### 1. EXPERIENCE & TIME (8 attributes)

**Purpose**: How the gift is consumed or experienced over time

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isExperiential` | Creates experiences rather than material possession | Concert tickets, cooking class, spa day |
| `isMemoryMaking` | Designed to create lasting memories | Photo album kit, travel experience, family game |
| `isConsumable` | Used up/consumed over time | Candles, food, bath products |
| `isLastingValue` | Maintains utility/value long-term | Quality tools, furniture, classic watches |
| `isOneTimeUse` | Single-use or brief lifespan | Greeting card, party supplies, disposable camera |
| `isSubscriptionBased` | Ongoing/recurring delivery | Streaming service, meal kit, magazine |
| `isImmediateGratification` | Enjoyable right away | Ready-to-eat food, charged electronics, games |
| `isLongTermInvestment` | Appreciates or pays off over years | Fine art, education, quality luggage |

**Archetype Usage**:
- Experience archetype: `isExperiential`, `isMemoryMaking`, `isImmediateGratification`
- Practical archetype: `isLastingValue`
- Practical Luxury: `isLastingValue`, `isLongTermInvestment`

---

### 2. SENTIMENT & EMOTIONAL CONNECTION (10 attributes)

**Purpose**: Emotional resonance and relationship significance

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isSentimental` | Carries emotional weight or meaning | Locket, family photo, childhood book |
| `isPersonalized` | Customized with names, dates, messages | Engraved jewelry, custom portrait, monogrammed item |
| `isRomantic` | Expresses romantic love | Roses, couple's jewelry, love letters |
| `isNostalgic` | Evokes memories of the past | Retro toys, vintage items, old-school candy |
| `isVintage` | From a past era (actual age) | 1960s dress, antique furniture, old records |
| `isCelebratory` | Marks special occasions | Birthday cake, champagne, party decorations |
| `isComforting` | Provides emotional comfort | Soft blanket, comfort food, teddy bear |
| `isSurprising` | Unexpected or delightful | Pop-up book, magic trick, mystery box |
| `isHeartfelt` | Shows genuine care and thought | Handwritten letter, charity donation, scrapbook |
| `isSymbolic` | Represents something beyond itself | Wedding ring, graduation cap, peace symbol |

**Archetype Usage**:
- Sentimental archetype: `isSentimental`, `isPersonalized`, `isHeartfelt`, `isSymbolic`
- Thoughtful archetype: `isPersonalized`, `isSentimental`, `isHeartfelt`, `isSymbolic`

---

### 3. FUNCTION & UTILITY (12 attributes)

**Purpose**: How the gift works and what it does

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isPractical` | Solves everyday problems | Kitchen tools, organizers, flashlight |
| `isLuxury` | Premium quality/price beyond necessity | Designer bag, premium whiskey, spa treatment |
| `isWellness` | Supports physical/mental health | Yoga mat, meditation app, vitamins |
| `isTechEnabled` | Uses electronics or digital tech | Smart home device, wireless earbuds, e-reader |
| `isPortable` | Easy to transport | Travel mug, portable speaker, pocket knife |
| `isReadyToUse` | No assembly/setup required | Pre-charged device, pre-filled kit, complete set |
| `isMultiFunctional` | Serves multiple purposes | Swiss Army knife, multi-cooker, convertible bag |
| `isSpaceSaving` | Compact or foldable | Collapsible colander, wall-mounted shelf, nesting bowls |
| `isEasyToMaintain` | Simple to clean and care for | Machine-washable, dishwasher-safe, self-cleaning |
| `isWeatherResistant` | Withstands outdoor conditions | Waterproof jacket, rust-proof tools, UV-resistant |
| `isUpgradable` | Can be enhanced over time | Modular furniture, expandable camera, add-on compatible |
| `isRepairable` | Can be fixed if broken | Quality leather goods, mechanical watch, cast iron pan |

**Archetype Usage**:
- Practical: `isPractical`, `isMultiFunctional`, `isReadyToUse`, `isEasyToMaintain`
- Practical Luxury: `isPractical`, `isLuxury`, `isRepairable`

---

### 4. SOCIAL & RELATIONSHIP (10 attributes)

**Purpose**: How the gift relates to social dynamics

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isShared` | Meant to be enjoyed with others | Board game, fondue set, wine tasting |
| `isConversationStarter` | Generates discussion | Unique art piece, exotic spice set, quirky decor |
| `isFamilyFriendly` | Appropriate for all family members | Family board game, all-ages movie, general cookbook |
| `isPartyFocused` | Designed for gatherings | Party game, cocktail kit, serving platter |
| `isIntimateGathering` | For small group (2-6 people) | Dinner party cookbook, wine pairing, game for 2-4 |
| `isHostingRelated` | For entertaining guests | Cheese board, cocktail shaker, serving ware |
| `isCrowdPleaser` | Widely appealing | Popular snacks, classic game, universally loved scent |
| `isGenderNeutral` | Not gender-specific | Unisex watch, gender-neutral colors, universal tools |
| `isGenerationallyNeutral` | Appeals across age groups | Classic literature, timeless music, universal hobbies |
| `isCulturallyNeutral` | Not culture-specific | Basic tools, nature themes, geometric patterns |

**Archetype Usage**:
- Social: `isShared`, `isConversationStarter`, `isHostingRelated`, `isFamilyFriendly`, `isPartyFocused`

---

### 5. AESTHETIC & DESIGN (12 attributes)

**Purpose**: Visual and design characteristics

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isArtistic` | Created with artistic intent | Handmade ceramics, illustrated books, gallery print |
| `isMinimalist` | Simple, clean, uncluttered design | White ceramic vase, simple watch, clean-lined furniture |
| `isColorful` | Vibrant, multiple colors | Rainbow set, bright painting, multicolor kit |
| `isElegant` | Refined and graceful aesthetic | Crystal decanter, silk scarf, fine china |
| `isBold` | Strong, statement-making design | Bright red coat, geometric wallpaper, dramatic art |
| `isSubtle` | Understated and refined | Muted colors, simple patterns, quiet luxury |
| `isVintageStyle` | Styled like past era (not age) | Retro-inspired radio, vintage-look poster, antique-style |
| `isModern` | Contemporary design language | Sleek tech, minimalist furniture, current trends |
| `isTraditional` | Classic or heritage design | Classic pattern, heritage recipe book, timeless style |
| `isQuirky` | Unconventional or whimsical | Funny socks, unusual planter, weird flavor |
| `isVisuallyStriking` | Eye-catching and memorable | Dramatic centerpiece, bold color, unique shape |
| `isIconic` | Instantly recognizable design | Classic brand logo, famous design, cultural icon |

**Archetype Usage**:
- Collectible: `isArtistic`, `isVisuallyStriking`, `isIconic`
- Indulgent: `isElegant`

---

### 6. LEARNING & GROWTH (8 attributes)

**Purpose**: Personal development and enrichment

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isAspirational` | Supports personal goals | Fitness tracker, language app, business book |
| `isEducational` | Teaches new knowledge | Course enrollment, textbook, documentary |
| `isSkillBuilding` | Develops specific abilities | Guitar lessons, coding bootcamp, art supplies |
| `isInspirational` | Motivates and encourages | Motivational book, vision board, success stories |
| `isTransformative` | Changes perspectives or habits | Life-changing book, therapy session, meditation retreat |
| `isCreative` | Enables artistic expression | Art supplies, writing journal, music instrument |
| `isProductivityEnhancing` | Improves efficiency | Planner, ergonomic chair, time management app |
| `isMindExpanding` | Broadens worldview | Travel book, philosophy text, cultural experience |

**Archetype Usage**:
- Aspirational: `isAspirational`, `isEducational`, `isInspirational`, `isSkillBuilding`, `isTransformative`, `isCreative`

---

### 7. SUSTAINABILITY & ETHICS (7 attributes)

**Purpose**: Environmental and ethical considerations

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isEcoFriendly` | Environmentally conscious | Reusable bags, solar charger, organic cotton |
| `isHandcrafted` | Made by hand, artisan quality | Handmade pottery, hand-knit scarf, artisan soap |
| `isLocal` | Produced locally | Local honey, regional wine, hometown merch |
| `isEthicallySourced` | Fair labor and sourcing | Fair trade coffee, conflict-free diamonds, ethical leather |
| `isFairTrade` | Certified fair trade | Fair trade chocolate, fair trade textiles |
| `isZeroWaste` | Minimal or no waste | Package-free soap, reusable containers, compostable |
| `isRecycled` | Made from recycled materials | Recycled paper notebook, upcycled furniture, reclaimed wood |

**Archetype Usage**:
- Practical Luxury: `isHandcrafted`
- Thoughtful: `isHandcrafted`, `isEthicallySourced`

---

### 8. PHYSICAL & SENSORY (13 attributes)

**Purpose**: Physical characteristics and sensory experience

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isFragrant` | Has noticeable scent | Perfume, candle, scented soap, fresh flowers |
| `isTactile` | Emphasizes touch | Soft blanket, textured pottery, smooth stone |
| `isEdible` | Can be eaten | Chocolate, cheese, wine, fruit basket |
| `isAuditory` | Emphasizes sound | Music album, singing bowl, wind chimes |
| `isVisual` | Primarily visual experience | Artwork, photography book, decorative item |
| `isCompact` | Small size | Pocket knife, travel-size, mini version |
| `isBulky` | Large or heavy | Furniture, large appliance, oversized item |
| `isLightweight` | Easy to carry | Aluminum water bottle, travel pillow, paperback |
| `isDelicate` | Requires careful handling | Fine glassware, delicate jewelry, silk scarf |
| `isDurable` | Built to last | Cast iron pan, leather boots, quality luggage |
| `isTextured` | Rich surface feel | Knit throw, embossed leather, rough-hewn wood |
| `isSmooth` | Sleek surface | Polished marble, satin fabric, glossy finish |
| `isWarm` | Provides warmth or cozy feel | Wool blanket, heated mug, fleece jacket |

**Archetype Usage**:
- Indulgent: `isFragrant`, `isTactile`, `isEdible`

---

### 9. USAGE CONTEXT (10 attributes)

**Purpose**: Where and how the gift is used

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isIndoor` | Primarily used inside | House plant, board game, kitchen gadget |
| `isOutdoor` | Used outside | Camping gear, garden tools, outdoor furniture |
| `isTravel` | Travel-related or portable | Luggage, travel adapter, guidebook |
| `isHome` | Home/domestic use | Kitchenware, home decor, furniture |
| `isOffice` | Workplace appropriate | Desk organizer, business book, coffee mug |
| `isActive` | Requires physical activity | Sports equipment, hiking gear, dance class |
| `isPassive` | No activity required | Book, music, decorative item |
| `isBeginner` | Great for novices | Starter kit, introductory book, basic tools |
| `isExpert` | For experienced users | Advanced tools, professional-grade, specialty item |
| `isAllAges` | Suitable for all ages | Family game, classic book, universal hobby |

**Archetype Usage**:
- Experience: `isActive`

---

### 10. VALUE & UNIQUENESS (9 attributes)

**Purpose**: Positioning and distinctiveness

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isBudgetFriendly` | Affordable price point | Under $50, everyday item, accessible |
| `isSplurgeWorthy` | Higher price justified by quality | Luxury watch, designer item, investment piece |
| `isLimitedEdition` | Finite availability | Numbered print, seasonal item, exclusive release |
| `isUnique` | One-of-a-kind or rare | Handmade art, custom piece, antique |
| `isCollectible` | Part of series or collection | Trading cards, limited series, collectible figurines |
| `isTimeless` | Won't go out of style | Classic design, enduring appeal, heritage item |
| `isTrendy` | Currently fashionable | Viral product, trending style, hot item |
| `isMainstream` | Widely available and known | Popular brand, common item, household name |
| `isNiche` | Specialized interest | Craft supplies, niche hobby, specialty tool |

**Archetype Usage**:
- Collectible: `isUnique`, `isLimitedEdition`, `isCollectible`

---

### 11. EMOTIONAL TONE (6 attributes)

**Purpose**: The emotional vibe of the gift

| Attribute | Definition | Examples |
|-----------|-----------|----------|
| `isWhimsical` | Playful and fanciful | Fairy lights, illustrated children's book, quirky decor |
| `isSerious` | Formal or significant | Professional tool, important book, formal wear |
| `isPlayful` | Fun and lighthearted | Party game, colorful toy, funny mug |
| `isRespectful` | Shows respect and dignity | Quality pen, professional book, elegant gift |
| `isEnergetic` | Vibrant and exciting | Bright colors, active experience, upbeat music |
| `isCalming` | Soothing and peaceful | Meditation app, soft blanket, gentle music |

**Archetype Usage**:
- Social: `isPlayful`
- Indulgent: `isCalming`

---

## Implementation Notes

### LLM Inference
The system uses GPT-4o-mini with a comprehensive prompt that includes:
- All 11 dimension groups with detailed explanations
- 8 example products showing multi-dimensional analysis
- Explicit guidance on inference philosophy
- Complete JSON template with all 100 fields

### Cost
- Per product: ~$0.002-0.003
- Full catalog (41,704 products): ~$83-125
- Temperature: 0.3 (balanced consistency and variety)

### Coverage Target
- Previous (keyword-based): 39.2% coverage
- New (LLM-based): ~95% coverage target
- Average attributes per product: 10-30 (vs 0-4 previously)

### Validation
Products are tested across diverse categories to ensure:
- All 11 dimension groups are utilized
- Attribute assignments make logical sense
- Edge cases are handled gracefully
- Inference quality is consistent

---

## Usage Examples

### Example 1: Practical + Luxury (Kitchen Appliance)
**Product**: "Le Creuset Dutch Oven" ($350)

**Attributes** (18 total):
```
isPractical, isLuxury, isLastingValue, isLongTermInvestment,
isReadyToUse, isMultiFunctional, isEasyToMaintain, isRepairable,
isElegant, isIconic, isDurable, isWarm, isHome, isIndoor,
isSplurgeWorthy, isTimeless, isMainstream, isSerious
```

### Example 2: Experience + Educational (Class)
**Product**: "Cooking Class for Two - Italian Cuisine" ($150)

**Attributes** (16 total):
```
isExperiential, isMemoryMaking, isEducational, isSkillBuilding,
isShared, isIntimateGathering, isCreative, isActive,
isImmediateGratification, isEdible, isAllAges, isBudgetFriendly,
isPlayful, isEnergetic, isRomantic (if couples), isGenderNeutral
```

### Example 3: Sentimental + Nostalgic (Collectible)
**Product**: "Vintage Fraggle Rock Action Figure" ($59.99)

**Attributes** (28 total):
```
isLastingValue, isImmediateGratification, isNostalgic, isLuxury,
isReadyToUse, isConversationStarter, isFamilyFriendly, isCrowdPleaser,
isGenderNeutral, isGenerationallyNeutral, isCulturallyNeutral,
isColorful, isQuirky, isVisuallyStriking, isIconic, isTactile,
isVisual, isDelicate, isDurable, isIndoor, isHome, isAllAges,
isSplurgeWorthy, isUnique, isCollectible, isNiche, isWhimsical, isPlayful
```

---

## Benefits Over Keyword-Based Approach

### 1. Comprehensive Coverage
- **Keyword**: 39.2% of products got attributes
- **LLM**: ~95% coverage (nearly universal)

### 2. Richer Profiling
- **Keyword**: 0-4 attributes per product
- **LLM**: 10-30 attributes per product

### 3. Intelligent Inference
- **Keyword**: "Bluetooth Headphones" → 0 attributes
- **LLM**: "Bluetooth Headphones" → 18 attributes (isTechEnabled, isPortable, isModern, etc.)

### 4. Context Understanding
- **Keyword**: Must contain exact words like "luxury", "practical"
- **LLM**: Understands that "$789 GORE-TEX Bib" is luxury despite no "luxury" keyword

### 5. Multi-Dimensional
- **Keyword**: Typically 1 dimension per product
- **LLM**: Captures 5-8 dimensions per product

---

## Future Enhancements

1. **Weighted Attributes**: Some attributes more important than others (e.g., `isPractical` vs `isCompact`)
2. **Confidence Scores**: How certain is the LLM about each attribute?
3. **Attribute Relationships**: "If `isVintage` then likely `isNostalgic`"
4. **User Preference Learning**: Which attributes matter most to each user?
5. **Seasonal Attributes**: Time-dependent flags (e.g., `isSeasonal`, `isHoliday`)

---

## Conclusion

The 100-attribute taxonomy represents a **7x expansion** in our gift profiling capability, enabling:
- More nuanced gift matching
- Better archetype alignment
- Richer recommendation explanations
- Improved user satisfaction

By moving from prescriptive keyword matching to intelligent LLM inference, we can now understand gifts across **11 rich dimensions** with **95%+ coverage** of our entire product catalog.
