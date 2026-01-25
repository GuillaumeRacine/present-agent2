# Phase 2.2 Implementation: Interest Normalization and Expansion

## Overview

Successfully implemented the interest normalization and expansion system to address the 18-interest bottleneck identified in the graph audit.

## Implementation Summary

### 1. Extended Interest Synonyms Library

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/src/lib/interest-synonyms.ts`

**Features**:
- Comprehensive interest taxonomy with **105 canonical interests** and **872 total terms**
- Average of **8.3 synonyms/terms per interest**
- Coverage of all common gift-giving interests including previously missing long-tail interests

**Key Functions**:
```typescript
// Normalize any interest term to canonical form
normalizeInterest('video games') // => 'gaming'
normalizeInterest('espresso') // => 'coffee'

// Expand list of interests to canonical forms (deduped)
expandInterests(['video games', 'espresso', 'trekking'])
// => ['gaming', 'coffee', 'hiking']

// Get related interests based on semantic clustering
getRelatedInterests('hiking')
// => ['camping', 'outdoors', 'climbing', 'cycling', 'running']

// Get all synonym terms for a canonical interest
getAllTerms('coffee')
// => ['coffee', 'espresso', 'brewing', 'barista', ...]

// Search for interests matching a query
searchInterests('outdoor')
// => ['outdoors', 'adventure-travel', ...]

// Get taxonomy statistics
getTaxonomyStats()
// => { totalCanonicalInterests: 105, totalTerms: 872, avgTermsPerInterest: 8.3 }
```

**Interest Categories** (105 canonical interests):

- **Outdoor & Adventure** (10): hiking, camping, cycling, outdoors, climbing, fishing, kayaking, skiing, running, surfing
- **Fitness & Wellness** (7): fitness, yoga, pilates, wellness, weightlifting, martial-arts, dancing
- **Food & Beverage** (9): cooking, baking, coffee, tea, wine, craft-beer, cocktails, foodie, bbq
- **Technology** (6): tech, gaming, programming, smart-home, computers, drones
- **Creative Arts** (12): art, painting, drawing, photography, crafts, knitting, sewing, woodworking, pottery, jewelry-making, scrapbooking
- **Music** (7): music, guitar, piano, vinyl, concerts, singing, dj
- **Reading & Learning** (8): reading, fiction, sci-fi, fantasy, mystery, non-fiction, audiobooks, poetry
- **Games & Entertainment** (4): board-games, puzzles, chess, trivia
- **Home & Garden** (5): gardening, houseplants, flowers, home-decor, organizing
- **Pets & Animals** (5): pets, dogs, cats, aquarium, birds
- **Fashion & Style** (5): fashion, jewelry, watches, sneakers, handbags
- **Beauty & Grooming** (5): beauty, skincare, makeup, fragrance, haircare
- **Travel** (4): travel, adventure-travel, luxury-travel, backpacking
- **Hobbies & Interests** (6): collecting, history, science, astronomy, cars, motorcycles
- **Kids & Family** (3): toys, lego, parenting
- **Professional & Business** (3): professional-development, entrepreneurship, productivity
- **Spirituality & Mindfulness** (2): spirituality, meditation
- **Social & Entertainment** (5): movies, tv-shows, podcasts, comedy, theater

### 2. Created Interest Expansion Script

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/scripts/expand-interests.ts`

**Purpose**:
- Create all Interest nodes from the taxonomy (105 nodes)
- Re-tag products with expanded interests based on comprehensive text analysis
- Fix hiking/yoga mapping bugs (regex pattern matching issues)
- Target +1 to +2 additional interests per product on average

**Features**:
- Dry run mode (default) and live mode (`--live`)
- Verbose logging (`--verbose`)
- Comprehensive stats and reporting
- Pattern-based interest extraction from product titles and descriptions
- Smart relevance scoring for new interest relationships

**Usage**:
```bash
# Dry run (preview changes)
tsx scripts/expand-interests.ts

# Apply changes to database
tsx scripts/expand-interests.ts --live

# Apply with detailed logging
tsx scripts/expand-interests.ts --live --verbose
```

**Expected Outcomes**:
- Interest nodes: 18 → 105+
- Products tagged with hiking: 1 → 50+
- Products tagged with yoga: 1 → 30+
- Average interests per product: increase by 1-2 per product
- Better long-tail coverage: jewelry, books, toys, pets, DIY/crafts

**Script Workflow**:
1. Analyze current state (interest count, distribution, poorly-tagged interests)
2. Create/update all 105 Interest nodes from taxonomy
3. Analyze all products (~27K) for interest expansion
4. Extract interests using comprehensive pattern matching
5. Create MATCHES_INTEREST relationships for new interests
6. Report detailed statistics and improvements

### 3. Updated Meaning Agent

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/meaning.ts`

**Changes**:
- Import interest expansion functions from `interest-synonyms.ts`
- Normalize user-provided interests to canonical form
- Expand discovery interests from LLM extraction
- Add related interests based on high-confidence interests (>= 0.7)
- Log interest expansion stats for debugging

**Code Updates**:
```typescript
// Import functions
import { expandInterests, getRelatedInterests } from '../../lib/interest-synonyms';

// In enhanceMeaningFramework method:

// Expand explicit and discovery interests to canonical form
const expandedExplicitInterests = expandInterests(interests);
const expandedDiscoveryInterests = expandInterests(framework.discoveryHints.interestPathways || []);

// Score interests
const scoredInterests = this.scoreInterests(
  expandedExplicitInterests,
  expandedDiscoveryInterests,
  relationship,
  occasion,
  userQuery
);

// Add related interests for high-confidence interests
const relatedInterests = scoredInterests
  .filter(si => si.confidence >= 0.7)
  .flatMap(si => getRelatedInterests(si.interest))
  .filter((interest, index, self) => self.indexOf(interest) === index); // Deduplicate

// Log expansion
this.log(`Interest expansion: ${interests.length} → ${expandedExplicitInterests.length} canonical, +${relatedInterests.length} related`);

// Update discoveryHints with expanded interests
discoveryHints: {
  ...framework.discoveryHints,
  interestPathways: [
    ...expandedExplicitInterests,
    ...expandedDiscoveryInterests,
    ...relatedInterests,
  ].filter((interest, index, self) => self.indexOf(interest) === index), // Deduplicate
  scoredInterests,
  desiredAttributes,
}
```

**Benefits**:
- Better interest matching through normalization (e.g., "video games" → "gaming")
- Expanded search space through related interests
- More consistent interest representation across the system
- Improved product discovery through semantic interest clustering

## Technical Details

### Interest Taxonomy Design

**Canonical Interest Structure**:
```typescript
export const INTEREST_TAXONOMY: Record<string, string[]> = {
  'canonical-interest': [
    'canonical-interest',      // Always include canonical form
    'synonym1',                 // Common synonyms
    'synonym2',
    'related-term',            // Related terms
    'variant-spelling',        // Spelling variants
    'industry-jargon',         // Domain-specific terms
  ],
};
```

**Normalization Strategy**:
1. Convert to lowercase and trim
2. Direct lookup in term → canonical map
3. Partial match (contains) for fuzzy matching
4. Return original if no match (preserve unknown interests)

**Related Interest Clustering**:
Interests are grouped into semantic clusters:
- **Outdoor cluster**: hiking, camping, outdoors, climbing, cycling, running, fishing
- **Fitness cluster**: fitness, yoga, pilates, wellness, weightlifting, martial-arts, dancing
- **Food & drink cluster**: cooking, baking, coffee, tea, wine, craft-beer, cocktails, foodie, bbq
- **Tech cluster**: tech, gaming, programming, smart-home, computers, drones
- **Creative arts cluster**: art, painting, drawing, photography, crafts, knitting, sewing, woodworking
- And more...

### Product Interest Extraction

**Pattern Matching Approach**:
```typescript
function extractInterestsFromProduct(
  title: string,
  description: string | null
): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const foundInterests = new Set<string>();

  // Check each canonical interest and its synonyms
  for (const [canonical, terms] of Object.entries(INTEREST_TAXONOMY)) {
    for (const term of terms) {
      // Create regex that matches whole words
      const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');

      if (pattern.test(text)) {
        foundInterests.add(canonical);
        break; // Found match for this canonical interest
      }
    }
  }

  return Array.from(foundInterests);
}
```

**Key Features**:
- Whole-word matching (prevents false positives like "gaming" in "managing")
- Comprehensive synonym coverage (8.3 terms per interest on average)
- Case-insensitive matching
- Escapes regex special characters in terms

### Database Schema

**Interest Node**:
```cypher
CREATE (i:Interest {
  name: 'canonical-interest',
  created_at: datetime(),
  source: 'taxonomy',           // Source: taxonomy, user-input, llm-extraction
  updated_at: datetime()
})
```

**MATCHES_INTEREST Relationship**:
```cypher
CREATE (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
SET
  r.relevance_score = 0.8,      // How relevant is this interest (0-1)
  r.confidence = 0.7,             // Confidence in the match (0-1)
  r.reasoning = 'Extracted from product text via interest expansion',
  r.extracted_at = datetime(),
  r.extraction_method = 'taxonomy_expansion'  // Method: manual, llm, taxonomy_expansion
```

## Validation and Testing

### Interest Taxonomy Tests

```bash
# Test interest normalization
normalizeInterest('video games') === 'gaming'
normalizeInterest('espresso') === 'coffee'
normalizeInterest('trekking') === 'hiking'

# Test interest expansion
expandInterests(['video games', 'espresso', 'trekking'])
// => ['gaming', 'coffee', 'hiking']

# Test related interests
getRelatedInterests('hiking')
// => ['camping', 'outdoors', 'climbing', 'cycling', 'running']

# Test taxonomy stats
const stats = getTaxonomyStats();
stats.totalCanonicalInterests // => 105
stats.totalTerms // => 872
stats.avgTermsPerInterest // => 8.3
```

### Expansion Script Validation

```bash
# Dry run to preview changes
tsx scripts/expand-interests.ts

# Expected output:
# - Current state analysis
# - 105 interest nodes would be created/updated
# - X products would be updated with Y new interest relationships
# - Avg interests per product: A → B
# - Top new interest tags with counts
# - Specific improvements for hiking, yoga, long-tail interests
```

## Expected Impact

### Quantitative Improvements

1. **Interest Coverage**: 18 → 105 canonical interests (5.8x increase)
2. **Term Coverage**: Limited → 872 terms (comprehensive synonym coverage)
3. **Under-tagged Interests**:
   - Hiking: 1 product → 50+ products (50x increase)
   - Yoga: 1 product → 30+ products (30x increase)
4. **Average Interests per Product**: +1 to +2 additional interests
5. **Long-tail Coverage**: Now includes jewelry, books, toys, pets, DIY/crafts

### Qualitative Improvements

1. **Better Product Discovery**:
   - More precise interest matching through normalization
   - Expanded search space through related interests
   - Better coverage of long-tail interests

2. **Improved Search Quality**:
   - "coffee" query now matches products tagged with "espresso", "barista", "brewing"
   - "hiking" query now matches products tagged with "trekking", "backpacking", "trails"
   - "gaming" query now matches products tagged with "video games", "esports", "pc gaming"

3. **Enhanced Meaning Agent**:
   - Consistent interest representation across the system
   - Automatic expansion of user interests to related concepts
   - Better archetype and attribute alignment

4. **System Consistency**:
   - Canonical interest representation prevents duplicates
   - Normalized interests across all agents and components
   - Easier to maintain and extend taxonomy

## Next Steps

### Phase 2.3: Run Interest Expansion

1. **Backup Database**: Create backup before running expansion
2. **Dry Run Analysis**: Run `tsx scripts/expand-interests.ts` to preview changes
3. **Execute Expansion**: Run `tsx scripts/expand-interests.ts --live` to apply changes
4. **Validate Results**: Query interest distribution and product coverage
5. **Test Recommendations**: Run test scenarios to verify improvements

### Future Enhancements

1. **Dynamic Interest Discovery**:
   - Learn new interests from product descriptions using LLM
   - Automatically add to taxonomy if frequently occurring
   - Confidence-based thresholding for automatic addition

2. **Interest Strength Weighting**:
   - Calculate TF-IDF style scores for interest-product relationships
   - Boost primary interests, demote secondary/tangential interests
   - Use in graph traversal scoring

3. **User Interest Profiling**:
   - Learn user interest preferences from interaction history
   - Personalize interest expansion based on user profile
   - Collaborative filtering for interest discovery

4. **Interest Taxonomy Maintenance**:
   - Regular audits to identify new interest gaps
   - Community-driven taxonomy expansion
   - A/B testing for taxonomy changes

## Files Created/Modified

### Created Files
1. `/Volumes/Crucial X8/Code/Present-Agent2/src/lib/interest-synonyms.ts` (extended with Part 2)
2. `/Volumes/Crucial X8/Code/Present-Agent2/scripts/expand-interests.ts`
3. `/Volumes/Crucial X8/Code/Present-Agent2/PHASE_2_2_IMPLEMENTATION.md` (this file)

### Modified Files
1. `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/meaning.ts`

## Compilation Status

✅ All TypeScript files compile without errors (with `--skipLibCheck` for dependencies)

```bash
# Verify compilation
npx tsc --noEmit --skipLibCheck src/lib/interest-synonyms.ts
npx tsc --noEmit --skipLibCheck src/services/agents/meaning.ts
npx tsc --noEmit --skipLibCheck scripts/expand-interests.ts
```

## Summary

Phase 2.2 successfully implements a comprehensive interest normalization and expansion system that addresses the 18-interest bottleneck. The system provides:

- **105 canonical interests** with **872 synonym terms**
- Automatic normalization and expansion of user interests
- Semantic clustering for related interest discovery
- Comprehensive product re-tagging script
- Integration with Meaning Agent for better recommendations

This implementation sets the foundation for significantly improved product discovery, better interest matching, and more accurate gift recommendations.
