/**
 * Explorer Agent - MOST CRITICAL
 *
 * Discovers product candidates using hybrid graph + vector search:
 * - Multi-path graph traversal (interests, values, occasions, social proof)
 * - Multi-embedding vector similarity (product, style, sentiment, use_case)
 * - Hybrid scoring: 60% graph + 40% vector
 * - Diversity algorithm
 * - Social proof from similar users
 */

import { BaseAgent } from './base.js';
import {
  ExplorerInput,
  ExplorerOutput,
  ProductCandidate,
  MeaningOutput,
} from '../../types/agents.js';
import { Driver } from 'neo4j-driver';
import { embeddingCache } from '../../lib/embedding-cache.js';
import { logger } from '../../lib/logger.js';
import { ARCHETYPE_ATTRIBUTES, GiftArchetype } from '../../types/gift-attributes.js';
import { cache, CacheTTL } from '../../lib/cache.js';
import { generateEmbedding } from '../../lib/llm.js';

interface HybridSearchParams {
  meaningFramework: MeaningOutput['meaningFramework'];
  budget: { min: number; max: number };
  discoveryHints: MeaningOutput['discoveryHints'];
  relationshipType?: string;
  requiredValues?: string[];
}

export class ExplorerAgent extends BaseAgent<ExplorerInput, ExplorerOutput> {
  name = 'Explorer';

  constructor(private neo4j: Driver) {
    super();
  }

  async process(input: ExplorerInput): Promise<ExplorerOutput> {
    this.log('Discovering product candidates');

    const startTime = Date.now();

    try {
      // Extract only what we need from context (reduce memory footprint)
      const budget = input.meaningContext?.constraintsContext?.hardConstraints?.budget || { min: 0, max: 1000 };
      const meaningFramework = input.meaningContext?.meaningFramework || {
        giftArchetype: 'thoughtful',
        archetypeConfidence: 0.5,
        archetypeReasons: ['default fallback'],
        emotionalMessage: 'appreciation',
        coreValues: [],
        personalRelevance: { connectsToInterests: [], addressesNeeds: [] }
      };
      const discoveryHints = input.meaningContext?.discoveryHints || {
        semanticQueries: [],
        interestPathways: [],
        archetypeFilters: []
      };
      const requiredValues = input.meaningContext?.constraintsContext?.hardConstraints?.requiredAttributes || [];
      const relationshipType =
        input.meaningContext?.constraintsContext?.relationshipContext?.relationshipAnalysis?.type || 'friend';

      // Execute hybrid search (graph + vector)
      const candidates = await this.hybridSearch({
        meaningFramework,
        budget,
        discoveryHints,
        relationshipType,
        requiredValues,
      });

      this.log(`Found ${candidates.length} candidates from hybrid search`);

      // Ensure diversity
      const diverseCandidates = await this.ensureDiversity(candidates);

      this.log(`Narrowed to ${diverseCandidates.length} diverse candidates`);

      const executionTimeMs = Date.now() - startTime;

      return {
        meaningContext: input.meaningContext,
        candidates: diverseCandidates,
        searchMetadata: {
          totalEvaluated: candidates.length,
          diversityScore: this.calculateDiversityScore(diverseCandidates),
          coverageScore: this.calculateCoverageScore(diverseCandidates, meaningFramework),
          avgConfidence: this.calculateAvgConfidence(diverseCandidates),
        },
        exploredAt: new Date(),
        executionTimeMs,
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * ENHANCED: Multi-stage hybrid search with refinement
   * Stage 1: Broad exploration (100 candidates, min_score 0.3)
   * Stage 2: Analyze patterns in candidates
   * Stage 3: Refine query with learned patterns
   * Stage 4: Targeted search (20 candidates, min_score 0.5)
   *
   * Improvements:
   * - Multi-pass search with feedback loops
   * - Query expansion using graph relationships
   * - Enhanced hybrid scoring (5 dimensions)
   * - Results cached with 15-minute TTL
   */
  private async hybridSearch(params: HybridSearchParams): Promise<ProductCandidate[]> {
    // Generate cache key from search parameters
    const cacheKey = cache.generateKey('hybrid-search', {
      archetype: params.meaningFramework.giftArchetype,
      values: params.meaningFramework.coreValues.sort(),
      interests: params.discoveryHints.interestPathways?.sort() || [],
      budget: params.budget,
      relationshipType: params.relationshipType,
      requiredValues: params.requiredValues?.sort() || [],
    });

    // Try to get from cache
    const cached = await cache.get<ProductCandidate[]>(cacheKey);
    if (cached) {
      this.log(`Hybrid search results retrieved from cache (${cached.length} candidates)`);
      return cached;
    }

    this.log('Hybrid search cache miss, executing multi-stage search...');

    // STAGE 1: Broad exploration
    this.log('Stage 1: Broad exploration (100 candidates, min_score 0.3)');
    const broadCandidates = await this.executeBroadSearch(params);

    if (broadCandidates.length === 0) {
      this.log('No candidates found in broad search');
      return [];
    }

    // STAGE 2: Analyze patterns
    this.log('Stage 2: Analyzing patterns in candidates');
    const patterns = this.analyzePatterns(broadCandidates);
    this.log(`Patterns identified: ${JSON.stringify(patterns)}`);

    // STAGE 3: Query expansion
    this.log('Stage 3: Query expansion using graph relationships');
    const expandedParams = await this.expandQuery(params, patterns);

    // STAGE 4: Targeted search with refined query
    this.log('Stage 4: Targeted search (20 candidates, min_score 0.5)');
    const session = this.neo4j.session();

    try {
      // 1. Build semantic queries from meaning framework
      const semanticQuery = this.buildSemanticQuery(params.meaningFramework, params.discoveryHints);
      const styleQuery = this.buildStyleQuery(params.meaningFramework);
      const sentimentQuery = this.buildSentimentQuery(params.meaningFramework);
      const useCaseQuery = this.buildUseCaseQuery(params.meaningFramework);

      this.log('Generating embeddings for queries...');

      // 2. Generate embeddings in parallel (with caching)
      const [
        queryEmbedding,
        styleEmbedding,
        sentimentEmbedding,
        useCaseEmbedding,
      ] = await embeddingCache.getMany([
        semanticQuery,
        styleQuery,
        sentimentQuery,
        useCaseQuery,
      ]);

      // Optional: archetype vector (low-weight). If embedding gen fails, skip.
      let archetypeEmbedding: number[] | null = null;
      try {
        archetypeEmbedding = await generateEmbedding(`archetype: ${params.meaningFramework.giftArchetype}`);
      } catch {
        archetypeEmbedding = null;
      }

      // Log cache performance
      const cacheStats = embeddingCache.getStats();
      this.log(`Embeddings ready (cache: ${cacheStats.size} entries, ${cacheStats.totalHits} hits)`);
      this.log(`Interest pathways: ${JSON.stringify(params.discoveryHints.interestPathways || [])}`);

      // 3. Execute ENHANCED hybrid Cypher query with multi-dimensional scoring
      const cypher = `
        // 1. Vector similarity search - INCREASED to 50 for better recall
        CALL db.index.vector.queryNodes('product_embedding', 50, $queryEmbedding)
        YIELD node AS product, score AS semanticScore

        // 2. Apply hard constraints immediately (performance optimization)
        WHERE product.available = true
          AND product.price >= $budgetMin
          AND product.price <= $budgetMax

        // Get other vector scores
        WITH product, semanticScore,
          gds.similarity.cosine(product.style_embedding, $styleEmbedding) AS styleScore,
          gds.similarity.cosine(product.sentiment_embedding, $sentimentEmbedding) AS sentimentScore,
          gds.similarity.cosine(product.use_case_embedding, $useCaseEmbedding) AS useCaseScore,
          CASE WHEN product.archetype_embedding IS NULL OR $archetypeEmbedding IS NULL
               THEN 0.0
               ELSE gds.similarity.cosine(product.archetype_embedding, $archetypeEmbedding)
          END AS archetypeVecScore

        // Calculate combined vector score
        WITH product,
          (0.35 * semanticScore + 0.25 * styleScore + 0.20 * sentimentScore + 0.15 * useCaseScore + 0.05 * archetypeVecScore) AS vectorScore

        // ENHANCED: Interest matching with expanded interests and 2-hop traversal
        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $interests OR i.name IN $expandedInterests

        // Text fallback: if no graph match, check if product title/description contains interest keywords
        WITH product, vectorScore,
          COLLECT(DISTINCT {name: i.name, strength: mi.relevance_score}) AS graphMatchedInterests,
          COALESCE(AVG(mi.relevance_score), 0) AS graphInterestScore,
          [interest IN ($interests + $expandedInterests) WHERE
            toLower(product.title) CONTAINS toLower(interest) OR
            toLower(product.description) CONTAINS toLower(interest)
          ] AS textMatchedInterests

        // Combine graph and text matches, use text match with score 0.6 if no graph match exists
        WITH product, vectorScore,
          CASE
            WHEN SIZE(graphMatchedInterests) > 0 THEN graphMatchedInterests
            WHEN SIZE(textMatchedInterests) > 0 THEN [interest IN textMatchedInterests | {name: interest, strength: 0.6}]
            ELSE []
          END AS matchedInterests,
          CASE
            WHEN graphInterestScore > 0 THEN graphInterestScore
            WHEN SIZE(textMatchedInterests) > 0 THEN 0.6
            ELSE 0
          END AS interestScore

        // Graph traversal - Value alignment (STRICT for requirements)
        OPTIONAL MATCH (product)-[av:ALIGNS_WITH]->(v:Value)
        WITH product, vectorScore, matchedInterests, interestScore,
          COLLECT(DISTINCT {name: v.name, alignment: av.alignment_score}) AS matchedValues,
          COALESCE(AVG(av.alignment_score), 0) AS valueScore

        // Check required values
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          [val IN $requiredValues WHERE val IN [mv IN matchedValues | mv.name]] AS satisfiedRequirements
        WHERE SIZE($requiredValues) = 0 OR SIZE(satisfiedRequirements) = SIZE($requiredValues)

        // Graph traversal - Occasion suitability
        OPTIONAL MATCH (product)-[so:SUITABLE_FOR]->(o:Occasion)
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          COLLECT(DISTINCT {name: o.name, suitability: so.suitability_score}) AS matchedOccasions,
          COALESCE(AVG(so.suitability_score), 0) AS occasionScore

        // Social proof - Similar users who liked this product
        OPTIONAL MATCH (similarUser:User)-[:HAS_RELATIONSHIP {relationship_type: $relationshipType}]->(similarRecipient:Recipient)
        OPTIONAL MATCH (rec:Recommendation {product_id: product.id})
        WHERE rec.was_liked = true OR rec.was_purchased = true
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          matchedOccasions, occasionScore,
          COUNT(DISTINCT rec) AS socialProofCount,
          COALESCE(COUNT(DISTINCT rec) / 10.0, 0) AS socialProofScore

        // Gift Archetype Matching - Value-based matching
        // Calculate how well product's gift attributes match the desired archetype
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          matchedOccasions, occasionScore, socialProofCount, socialProofScore,
          CASE
            WHEN SIZE($archetypeAttributes) = 0 THEN 0.0
            ELSE REDUCE(matchCount = 0.0, attr IN $archetypeAttributes |
              matchCount + CASE
                WHEN attr = 'isPractical' AND COALESCE(product.is_practical, false) = true THEN 1.0
                WHEN attr = 'isExperiential' AND COALESCE(product.is_experiential, false) = true THEN 1.0
                WHEN attr = 'isSentimental' AND COALESCE(product.is_sentimental, false) = true THEN 1.0
                WHEN attr = 'isPersonalized' AND COALESCE(product.is_personalized, false) = true THEN 1.0
                WHEN attr = 'isLuxury' AND COALESCE(product.is_luxury, false) = true THEN 1.0
                WHEN attr = 'isAspirational' AND COALESCE(product.is_aspirational, false) = true THEN 1.0
                WHEN attr = 'isEducational' AND COALESCE(product.is_educational, false) = true THEN 1.0
                WHEN attr = 'isShared' AND COALESCE(product.is_shared, false) = true THEN 1.0
                WHEN attr = 'isConsumable' AND COALESCE(product.is_consumable, false) = true THEN 1.0
                WHEN attr = 'isMemoryMaking' AND COALESCE(product.is_memory_making, false) = true THEN 1.0
                WHEN attr = 'isLastingValue' AND COALESCE(product.is_lasting_value, false) = true THEN 1.0
                WHEN attr = 'isArtistic' AND COALESCE(product.is_artistic, false) = true THEN 1.0
                WHEN attr = 'isConversationStarter' AND COALESCE(product.is_conversation_starter, false) = true THEN 1.0
                WHEN attr = 'isMinimalist' AND COALESCE(product.is_minimalist, false) = true THEN 1.0
                ELSE 0.0
              END
            ) / SIZE($archetypeAttributes)
          END AS archetypeMatchScore

        // ENHANCED: 5-dimensional hybrid scoring system
        // Functional match (30%), Emotional/archetype match (25%), Interest match (20%),
        // Price fit (15%), Occasion relevance (10%)
        WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
          interestScore, valueScore, occasionScore, socialProofScore,
          // Calculate price fitness score (closer to middle of budget = higher score)
          CASE
            WHEN product.price = 0 THEN 0.0
            ELSE 1.0 - (ABS(product.price - ($budgetMin + $budgetMax) / 2.0) / (($budgetMax - $budgetMin) / 2.0))
          END AS priceFitScore

        // Calculate 5 dimension scores
        WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
          // Functional match (vector score represents functional alignment)
          vectorScore AS functionalMatchScore,
          // Emotional/archetype match (archetype + sentiment)
          archetypeMatchScore AS emotionalMatchScore,
          // Interest match (graph + text fallback)
          interestScore AS interestMatchScore,
          // Price fitness
          priceFitScore,
          // Occasion relevance
          occasionScore AS occasionRelevanceScore

        // Calculate weighted hybrid score (5-dimensional)
        WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
          functionalMatchScore, emotionalMatchScore, interestMatchScore, priceFitScore, occasionRelevanceScore,
          (0.30 * functionalMatchScore +
           0.25 * emotionalMatchScore +
           0.20 * interestMatchScore +
           0.15 * priceFitScore +
           0.10 * occasionRelevanceScore) AS hybridScore,
          // Confidence based on consistency across dimensions
          (functionalMatchScore + emotionalMatchScore + interestMatchScore + priceFitScore + occasionRelevanceScore) / 5.0 AS confidenceScore

        // Order by hybrid score and limit results
        ORDER BY hybridScore DESC
        LIMIT $limit

        RETURN product, vectorScore, hybridScore, confidenceScore,
               matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
               functionalMatchScore, emotionalMatchScore, interestMatchScore, priceFitScore, occasionRelevanceScore
      `;

      // Get archetype attributes to match
      const archetypeAttributes = this.getArchetypeAttributes(params.meaningFramework.giftArchetype);

      this.log(`Archetype matching: ${params.meaningFramework.giftArchetype} → [${archetypeAttributes.join(', ')}]`);
      this.log(`Expanded interests: ${expandedParams.expandedInterests.join(', ')}`);

      const result = await session.run(cypher, {
        queryEmbedding,
        styleEmbedding,
        sentimentEmbedding,
        useCaseEmbedding,
        archetypeEmbedding,
        interests: params.discoveryHints.interestPathways || [],
        expandedInterests: expandedParams.expandedInterests,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        requiredValues: params.requiredValues || [],
        relationshipType: params.relationshipType || 'unknown',
        archetypeAttributes,
        limit: expandedParams.limit,
      });

      this.log(`Hybrid query returned ${result.records.length} products`);

      // Early termination if no results
      if (result.records.length === 0) {
        this.log('No products found matching criteria');
        return [];
      }

      // Log the archetype that will be used for all candidates
      const primaryArchetype = this.getPrimaryArchetype(params.meaningFramework);
      this.log(`Using archetype for candidates: ${primaryArchetype}`);

      const candidates = result.records.map((record) => this.recordToCandidate(record, params.meaningFramework));

      // Log interest matching statistics
      const graphMatches = result.records.filter(r => {
        const interests = r.get('matchedInterests') || [];
        return interests.some((m: any) => m.strength !== 0.6);
      }).length;
      const textMatches = result.records.filter(r => {
        const interests = r.get('matchedInterests') || [];
        return interests.some((m: any) => m.strength === 0.6);
      }).length;
      this.log(`Interest matching: ${graphMatches} via graph, ${textMatches} via text fallback`);

      // Log top candidates with scores for debugging
      if (candidates.length > 0) {
        this.log('Top 3 candidates:');
        candidates.slice(0, 3).forEach((c, i) => {
          const record = result.records[i];
          const matchedInterests = record.get('matchedInterests') || [];
          const matchType = matchedInterests.some((m: any) => m.strength === 0.6) ? 'text' : 'graph';
          const archetypeScore = record.get('archetypeMatchScore') || 0;
          this.log(
            `  ${i + 1}. ${c.product.title} - Graph: ${c.scores.graphScore.toFixed(3)}, ` +
            `Vector: ${c.scores.vectorScore.toFixed(3)}, ` +
            `Archetype: ${archetypeScore.toFixed(3)}, ` +
            `Hybrid: ${c.scores.hybridScore.toFixed(3)}, ` +
            `Interests: [${c.matchReasons.matchedInterests.join(', ')}] (${matchType})`
          );
        });
      }

      // PHASE 1.1: Check if results are sparse and augment with fulltext fallback
      let finalCandidates = candidates;
      if (candidates.length < 5 || this.hasLowScores(candidates)) {
        this.log('Sparse or low-scoring results detected, applying fulltext fallback...');
        const fulltextCandidates = await this.fulltextFallback(params, candidates);

        if (fulltextCandidates.length > 0) {
          // Merge with existing candidates, avoiding duplicates
          const existingIds = new Set(candidates.map(c => c.product.id));
          const newCandidates = fulltextCandidates.filter(c => !existingIds.has(c.product.id));
          finalCandidates = [...candidates, ...newCandidates];
          this.log(`Fulltext fallback added ${newCandidates.length} new candidates (total: ${finalCandidates.length})`);
        }
      }

      // Cache the results (15-minute TTL)
      await cache.set(cacheKey, finalCandidates, CacheTTL.HYBRID_SEARCH);
      this.log(`Cached hybrid search results (${finalCandidates.length} candidates) for 15 minutes`);

      return finalCandidates;
    } catch (error) {
      logger.error('Hybrid search failed', { error });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Build semantic query from meaning framework
   */
  private buildSemanticQuery(
    meaningFramework: MeaningOutput['meaningFramework'],
    discoveryHints: MeaningOutput['discoveryHints']
  ): string {
    const parts = [
      meaningFramework.emotionalMessage,
      ...meaningFramework.coreValues,
      ...discoveryHints.semanticQueries,
    ];
    return parts.filter(Boolean).join('. ');
  }

  /**
   * Build style query
   */
  private buildStyleQuery(meaningFramework: MeaningOutput['meaningFramework']): string {
    return `Aesthetic style: ${meaningFramework.giftArchetype}`;
  }

  /**
   * Build sentiment query
   */
  private buildSentimentQuery(meaningFramework: MeaningOutput['meaningFramework']): string {
    return `Emotional tone: ${meaningFramework.emotionalMessage}`;
  }

  /**
   * Build use case query
   */
  private buildUseCaseQuery(meaningFramework: MeaningOutput['meaningFramework']): string {
    const personalRelevance = meaningFramework.personalRelevance;
    const parts = [
      ...personalRelevance.connectsToInterests,
      ...(personalRelevance.addressesNeeds || []),
    ];
    return `Use case: ${parts.join(', ')}`;
  }

  /**
   * Get primary archetype from MeaningFramework
   * Uses archetypeWeights if available, falls back to giftArchetype
   */
  private getPrimaryArchetype(meaningFramework: MeaningOutput['meaningFramework']): string {
    let primaryArchetype = 'thoughtful'; // Default fallback

    if (meaningFramework?.archetypeWeights) {
      // Find archetype with highest weight
      const entries = Object.entries(meaningFramework.archetypeWeights);
      if (entries.length > 0) {
        const [archetype] = entries.sort((a, b) => b[1] - a[1])[0];
        primaryArchetype = archetype;
      }
    } else if (meaningFramework?.giftArchetype) {
      // Fallback to giftArchetype if archetypeWeights not available
      primaryArchetype = meaningFramework.giftArchetype;
    }

    return primaryArchetype;
  }

  /**
   * Get archetype attributes for matching
   * Maps gift archetype to expected product attributes
   */
  private getArchetypeAttributes(archetype: string): string[] {
    // Normalize archetype string
    const normalizedArchetype = archetype?.toLowerCase().replace(/[_\s-]+/g, '_') || 'thoughtful';

    // Map to GiftArchetype type and get attributes
    const archetypeMap: Record<string, string[]> = {
      practical: ['isPractical', 'isLastingValue'],
      practical_luxury: ['isPractical', 'isLuxury', 'isLastingValue'],
      experience: ['isExperiential', 'isMemoryMaking'],
      sentimental: ['isSentimental', 'isPersonalized', 'isMemoryMaking'],
      aspirational: ['isAspirational', 'isEducational'],
      social: ['isShared', 'isConversationStarter'],
      collectible: ['isArtistic', 'isLastingValue', 'isConversationStarter'],
      indulgent: ['isLuxury', 'isConsumable'],
      thoughtful: ['isPersonalized', 'isSentimental'],
    };

    return archetypeMap[normalizedArchetype] || [];
  }

  /**
   * Convert Neo4j record to ProductCandidate
   * ENHANCED: Now includes 5-dimensional scoring breakdown
   */
  private recordToCandidate(record: any, meaningFramework?: MeaningOutput['meaningFramework']): ProductCandidate {
    const product = record.get('product').properties;
    const vectorScore = record.get('vectorScore');
    const hybridScore = record.get('hybridScore');
    const confidenceScore = record.get('confidenceScore');
    const matchedInterests = record.get('matchedInterests') || [];
    const matchedValues = record.get('matchedValues') || [];
    const matchedOccasions = record.get('matchedOccasions') || [];
    const socialProofCountRaw = record.get('socialProofCount');
    const socialProofCount = typeof socialProofCountRaw === 'number'
      ? socialProofCountRaw
      : (socialProofCountRaw?.toNumber ? socialProofCountRaw.toNumber() : 0);

    // Extract new dimension scores (with fallback for backward compatibility)
    const functionalMatchScore = record.get('functionalMatchScore') || vectorScore;
    const emotionalMatchScore = record.get('emotionalMatchScore') || 0;
    const interestMatchScore = record.get('interestMatchScore') || 0;
    const priceFitScore = record.get('priceFitScore') || 0;
    const occasionRelevanceScore = record.get('occasionRelevanceScore') || 0;

    // Calculate graphScore from dimensions for backward compatibility
    const graphScore = (emotionalMatchScore + interestMatchScore + occasionRelevanceScore) / 3;

    // PHASE 1.2: Populate matchedArchetype from Meaning Agent output
    const primaryArchetype = meaningFramework ? this.getPrimaryArchetype(meaningFramework) : 'thoughtful';

    return {
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        vendor: product.vendor,
        imageUrl: product.imageUrl,
        url: product.url,
      },
      scores: {
        graphScore,
        vectorScore,
        hybridScore,
        confidenceScore,
      },
      matchReasons: {
        matchedInterests: matchedInterests.map((m: any) => m.name),
        matchedValues: matchedValues.map((m: any) => m.name),
        matchedArchetype: primaryArchetype,
        socialProofCount,
      },
      graphContext: {
        pathLength: 1, // Direct match
        relationshipStrengths: {},
      },
    };
  }

  /**
   * Ensure diversity in results
   * - Different price points (budget-friendly, mid-range, stretch)
   * - Different vendors (max 2 per vendor)
   * - Different categories (max 2 per category) - NOW USING REAL CATEGORIES
   * - Different interests (max 4 per primary interest)
   * - Different product types
   */
  private async ensureDiversity(candidates: ProductCandidate[]): Promise<ProductCandidate[]> {
    if (candidates.length <= 15) return candidates;

    const session = this.neo4j.session();

    try {
      // Fetch categories for all candidate products in one query
      const productIds = candidates.map(c => c.product.id);
      const categoryResult = await session.run(
        `
        UNWIND $productIds AS productId
        MATCH (p:Product {id: productId})
        OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
        RETURN p.id AS productId, collect(c.name) AS categories
        `,
        { productIds }
      );

      // Build product -> categories map
      const productCategories = new Map<string, string[]>();
      for (const record of categoryResult.records) {
        const productId = record.get('productId');
        const categories = record.get('categories') || [];
        productCategories.set(productId, categories);
      }

      const diverse: ProductCandidate[] = [];
      const vendorCount = new Map<string, number>();  // Track count per vendor
      const categoryCount = new Map<string, number>(); // Track count per category
      const interestCount = new Map<string, number>(); // Track count per interest
      const priceRanges = { low: 0, mid: 0, high: 0 };

      // Sort by hybrid score
      const sorted = [...candidates].sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

      for (const candidate of sorted) {
        if (diverse.length >= 15) break;

        // Extract diversity dimensions
        const vendor = candidate.product.vendor;
        const categories = productCategories.get(candidate.product.id) || [];
        const primaryCategory = categories[0] || 'uncategorized';
        const primaryInterest = candidate.matchReasons.matchedInterests[0] || 'general';
        const price = candidate.product.price;
        const range = price < 40 ? 'low' : price < 80 ? 'mid' : 'high';

        // Get current counts
        const vendorUsage = vendorCount.get(vendor) || 0;
        const categoryUsage = categoryCount.get(primaryCategory) || 0;
        const interestUsage = interestCount.get(primaryInterest) || 0;
        const priceUsage = priceRanges[range];

        // Define diversity limits
        const maxPerVendor = 2;      // Max 2 per vendor
        const maxPerCategory = 2;    // Max 2 per category (REDUCED from 3 for better diversity)
        const maxPerInterest = 4;    // Max 4 per primary interest
        const maxPerPriceRange = 5;  // Max 5 per price range

        // ENHANCED DIVERSITY LOGIC:
        // Check all diversity dimensions
        const vendorOk = vendorUsage < maxPerVendor;
        const categoryOk = categoryUsage < maxPerCategory;
        const interestOk = interestUsage < maxPerInterest;
        const priceOk = priceUsage < maxPerPriceRange;

        const respectsDiversity = vendorOk && categoryOk && interestOk && priceOk;
        const exceptionalScore = candidate.scores.hybridScore > 0.95;

        if (respectsDiversity || exceptionalScore) {
          diverse.push(candidate);
          vendorCount.set(vendor, vendorUsage + 1);
          categoryCount.set(primaryCategory, categoryUsage + 1);
          interestCount.set(primaryInterest, interestUsage + 1);
          priceRanges[range]++;
        }
      }

      // If we don't have enough, fill with top scoring (still respecting limits)
      if (diverse.length < 10) {  // Aim for at least 10 recommendations
        for (const candidate of sorted) {
          if (diverse.length >= 15) break;
          if (!diverse.includes(candidate)) {
            const vendor = candidate.product.vendor;
            const categories = productCategories.get(candidate.product.id) || [];
            const primaryCategory = categories[0] || 'uncategorized';
            const vendorUsage = vendorCount.get(vendor) || 0;
            const categoryUsage = categoryCount.get(primaryCategory) || 0;

            // Respect vendor and category limits even when filling
            if (vendorUsage < 2 && categoryUsage < 2) {
              diverse.push(candidate);
              vendorCount.set(vendor, vendorUsage + 1);
              categoryCount.set(primaryCategory, categoryUsage + 1);
            }
          }
        }
      }

      const uniqueVendors = vendorCount.size;
      const uniqueCategories = categoryCount.size;
      const uniqueInterests = interestCount.size;
      this.log(
        `Diversity ensured: ${diverse.length} products - ` +
        `${uniqueVendors} vendors, ${uniqueCategories} categories, ${uniqueInterests} interests`
      );

      return diverse;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate diversity score based on:
   * - Price spread
   * - Vendor variety
   * - Type variety
   */
  private calculateDiversityScore(candidates: ProductCandidate[]): number {
    if (candidates.length === 0) return 0;

    // Price diversity
    const prices = candidates.map((c) => c.product.price);
    const priceStdDev = this.standardDeviation(prices);
    const priceScore = Math.min(1, priceStdDev / 30); // Normalize to 0-1

    // Vendor diversity
    const vendors = new Set(candidates.map((c) => c.product.vendor));
    const vendorScore = Math.min(1, vendors.size / candidates.length);

    // Interest diversity
    const allInterests = new Set(
      candidates.flatMap((c) => c.matchReasons.matchedInterests)
    );
    const interestScore = Math.min(1, allInterests.size / 5); // Expect ~5 different interests

    // Combined diversity score
    return (priceScore * 0.4 + vendorScore * 0.4 + interestScore * 0.2);
  }

  /**
   * Calculate coverage score - how well candidates cover meaning framework
   */
  private calculateCoverageScore(
    candidates: ProductCandidate[],
    framework: MeaningOutput['meaningFramework']
  ): number {
    if (candidates.length === 0) return 0;

    // Check coverage of core values
    const coreValues = new Set(framework.coreValues);
    const coveredValues = new Set(
      candidates.flatMap((c) => c.matchReasons.matchedValues)
    );
    const valueCoverage = coveredValues.size / Math.max(coreValues.size, 1);

    // Check coverage of interests
    const interests = new Set(framework.personalRelevance.connectsToInterests);
    const coveredInterests = new Set(
      candidates.flatMap((c) => c.matchReasons.matchedInterests)
    );
    const interestCoverage = coveredInterests.size / Math.max(interests.size, 1);

    // Combined coverage score
    return (valueCoverage * 0.5 + interestCoverage * 0.5);
  }

  /**
   * Calculate average confidence across candidates
   */
  private calculateAvgConfidence(candidates: ProductCandidate[]): number {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((acc, c) => acc + c.scores.confidenceScore, 0);
    return sum / candidates.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * STAGE 1: Execute broad search for initial candidates
   * Returns up to 100 candidates with min_score 0.3
   */
  private async executeBroadSearch(params: HybridSearchParams): Promise<ProductCandidate[]> {
    const session = this.neo4j.session();

    try {
      // Build semantic queries
      const semanticQuery = this.buildSemanticQuery(params.meaningFramework, params.discoveryHints);
      const styleQuery = this.buildStyleQuery(params.meaningFramework);
      const sentimentQuery = this.buildSentimentQuery(params.meaningFramework);
      const useCaseQuery = this.buildUseCaseQuery(params.meaningFramework);

      // Generate embeddings
      const [queryEmbedding, styleEmbedding, sentimentEmbedding, useCaseEmbedding] =
        await embeddingCache.getMany([semanticQuery, styleQuery, sentimentQuery, useCaseQuery]);

      // Simple broad search query
      const cypher = `
        CALL db.index.vector.queryNodes('product_embedding', 100, $queryEmbedding)
        YIELD node AS product, score AS semanticScore
        WHERE product.available = true
          AND product.price >= $budgetMin
          AND product.price <= $budgetMax
          AND semanticScore >= 0.3
        RETURN product, semanticScore
        ORDER BY semanticScore DESC
        LIMIT 100
      `;

      const result = await session.run(cypher, {
        queryEmbedding,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
      });

      // PHASE 1.2: Get primary archetype for broad search candidates
      const primaryArchetype = this.getPrimaryArchetype(params.meaningFramework);

      // Convert to candidates with minimal scoring
      return result.records.map((record) => {
        const product = record.get('product').properties;
        const semanticScore = record.get('semanticScore');

        return {
          product: {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            vendor: product.vendor,
            imageUrl: product.imageUrl,
            url: product.url,
          },
          scores: {
            graphScore: 0,
            vectorScore: semanticScore,
            hybridScore: semanticScore,
            confidenceScore: semanticScore,
          },
          matchReasons: {
            matchedInterests: [],
            matchedValues: [],
            matchedArchetype: primaryArchetype,
            socialProofCount: 0,
          },
          graphContext: {
            pathLength: 1,
            relationshipStrengths: {},
          },
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * STAGE 2: Analyze patterns in broad search results
   * Identifies dominant archetype, price range, and common interests
   */
  private analyzePatterns(candidates: ProductCandidate[]): {
    dominantArchetype: string | null;
    medianPrice: number;
    priceRange: { min: number; max: number };
    relatedInterests: string[];
  } {
    if (candidates.length === 0) {
      return {
        dominantArchetype: null,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        relatedInterests: [],
      };
    }

    // Analyze price distribution
    const prices = candidates.map((c) => c.product.price).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };

    // Analyze dominant archetype (would need product archetype data)
    // For now, return placeholder
    const dominantArchetype = null;

    // Analyze common interests
    const interestCounts = new Map<string, number>();
    candidates.forEach((c) => {
      c.matchReasons.matchedInterests.forEach((interest) => {
        interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
      });
    });

    const relatedInterests = Array.from(interestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([interest]) => interest);

    return {
      dominantArchetype,
      medianPrice,
      priceRange,
      relatedInterests,
    };
  }

  /**
   * STAGE 3: Expand query with related concepts from graph
   * Uses patterns to discover related interests and synonyms
   */
  private async expandQuery(
    params: HybridSearchParams,
    patterns: ReturnType<typeof this.analyzePatterns>
  ): Promise<{
    expandedInterests: string[];
    limit: number;
  }> {
    const session = this.neo4j.session();

    try {
      const originalInterests = params.discoveryHints.interestPathways || [];

      // Query graph for related interests (2-hop traversal)
      const cypher = `
        UNWIND $interests AS interest
        MATCH (i1:Interest {name: interest})
        OPTIONAL MATCH (i1)<-[:MATCHES_INTEREST]-(p:Product)-[:MATCHES_INTEREST]->(i2:Interest)
        WHERE i2.name <> interest
          AND NOT i2.name IN $interests
        WITH i2, COUNT(DISTINCT p) AS connectionStrength
        WHERE i2 IS NOT NULL AND connectionStrength >= 2
        RETURN i2.name AS relatedInterest, connectionStrength
        ORDER BY connectionStrength DESC
        LIMIT 5
      `;

      const result = await session.run(cypher, {
        interests: originalInterests,
      });

      const expandedInterests = result.records.map((r) => r.get('relatedInterest'));

      this.log(`Query expansion: ${originalInterests.length} → ${originalInterests.length + expandedInterests.length} interests`);

      return {
        expandedInterests,
        limit: 20, // Final targeted search limit
      };
    } catch (error) {
      logger.warn('Query expansion failed, continuing with original interests', { error });
      return {
        expandedInterests: [],
        limit: 20,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * PHASE 1.1: Check if results are sparse or low-scoring
   * Sparse: < 5 candidates
   * Low-scoring: average hybrid score < 0.5
   */
  private hasLowScores(candidates: ProductCandidate[]): boolean {
    if (candidates.length === 0) return true;
    const avgHybridScore = candidates.reduce((sum, c) => sum + c.scores.hybridScore, 0) / candidates.length;
    return avgHybridScore < 0.5;
  }

  /**
   * PHASE 1.1: Fulltext fallback for vague queries
   * When graph+vector search returns sparse or low-scoring results,
   * fall back to fulltext search on product title/description
   */
  private async fulltextFallback(
    params: HybridSearchParams,
    existingCandidates: ProductCandidate[]
  ): Promise<ProductCandidate[]> {
    const session = this.neo4j.session();

    try {
      // Build fulltext query from interests and semantic queries
      const queryTerms: string[] = [
        ...(params.discoveryHints.interestPathways || []),
        ...(params.discoveryHints.semanticQueries || []),
        ...params.meaningFramework.coreValues,
      ];

      if (queryTerms.length === 0) {
        this.log('No query terms available for fulltext fallback');
        return [];
      }

      // Create fulltext query string (combine terms with OR)
      const fulltextQuery = queryTerms.join(' OR ');
      this.log(`Fulltext query: "${fulltextQuery}"`);

      // Execute fulltext search
      const cypher = `
        CALL db.index.fulltext.queryNodes('product_fulltext', $query)
        YIELD node AS product, score AS fulltextScore
        WHERE product.available = true
          AND product.price >= $budgetMin
          AND product.price <= $budgetMax
          AND fulltextScore > 0.5

        // Extract matched terms from product text
        WITH product, fulltextScore,
          [term IN $terms WHERE
            toLower(product.title) CONTAINS toLower(term) OR
            toLower(product.description) CONTAINS toLower(term)
          ] AS matchedTerms

        // Normalize fulltext score to 0.6-0.8 range for interestScore
        WITH product, fulltextScore, matchedTerms,
          0.6 + (fulltextScore * 0.2) AS normalizedScore

        ORDER BY fulltextScore DESC
        LIMIT 10

        RETURN product, fulltextScore, normalizedScore, matchedTerms
      `;

      const result = await session.run(cypher, {
        query: fulltextQuery,
        terms: queryTerms,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
      });

      this.log(`Fulltext search returned ${result.records.length} products`);

      // Convert to candidates with normalized scores
      const candidates = result.records.map((record) => {
        const product = record.get('product').properties;
        const fulltextScore = record.get('fulltextScore');
        const normalizedScore = record.get('normalizedScore');
        const matchedTerms = record.get('matchedTerms') || [];

        // Create pseudo-interests from matched terms
        const pseudoInterests = matchedTerms.map((term: string) => ({
          name: term,
          strength: normalizedScore,
        }));

        // PHASE 1.2: Get primary archetype for fulltext fallback candidates
        const primaryArchetype = this.getPrimaryArchetype(params.meaningFramework);

        return {
          product: {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            vendor: product.vendor,
            imageUrl: product.imageUrl,
            url: product.url,
          },
          scores: {
            graphScore: 0,
            vectorScore: normalizedScore,
            hybridScore: normalizedScore,
            confidenceScore: normalizedScore,
          },
          matchReasons: {
            matchedInterests: matchedTerms,
            matchedValues: [],
            matchedArchetype: primaryArchetype,
            socialProofCount: 0,
          },
          graphContext: {
            pathLength: 1,
            relationshipStrengths: {},
          },
        };
      });

      if (candidates.length > 0) {
        this.log(`Fulltext fallback found ${candidates.length} candidates:`);
        candidates.slice(0, 3).forEach((c, i) => {
          this.log(
            `  ${i + 1}. ${c.product.title} - Score: ${c.scores.hybridScore.toFixed(3)}, ` +
            `Terms: [${c.matchReasons.matchedInterests.join(', ')}]`
          );
        });
      }

      return candidates;
    } catch (error) {
      logger.warn('Fulltext fallback failed', { error });
      return [];
    } finally {
      await session.close();
    }
  }
}
