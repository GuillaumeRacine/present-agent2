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
      const diverseCandidates = this.ensureDiversity(candidates);

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
   * Hybrid search combining graph traversal + vector similarity
   * 60% graph score + 40% vector score
   * Results cached with 15-minute TTL
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

    this.log('Hybrid search cache miss, executing database query...');
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

      // Log cache performance
      const cacheStats = embeddingCache.getStats();
      this.log(`Embeddings ready (cache: ${cacheStats.size} entries, ${cacheStats.totalHits} hits)`);
      this.log(`Interest pathways: ${JSON.stringify(params.discoveryHints.interestPathways || [])}`);

      // 3. Execute optimized hybrid Cypher query
      const cypher = `
        // 1. Vector similarity search across all 4 embeddings (optimized to 30 for performance)
        CALL db.index.vector.queryNodes('product_embedding', 30, $queryEmbedding)
        YIELD node AS product, score AS semanticScore

        // 2. Apply hard constraints immediately (performance optimization)
        WHERE product.available = true
          AND product.price >= $budgetMin
          AND product.price <= $budgetMax

        // Get other vector scores
        WITH product, semanticScore,
          gds.similarity.cosine(product.style_embedding, $styleEmbedding) AS styleScore,
          gds.similarity.cosine(product.sentiment_embedding, $sentimentEmbedding) AS sentimentScore,
          gds.similarity.cosine(product.use_case_embedding, $useCaseEmbedding) AS useCaseScore

        // Calculate combined vector score
        WITH product,
          (0.40 * semanticScore + 0.25 * styleScore + 0.20 * sentimentScore + 0.15 * useCaseScore) AS vectorScore

        // Graph traversal - Interest matching with text fallback for unknown interests
        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $interests

        // Text fallback: if no graph match, check if product title/description contains interest keywords
        WITH product, vectorScore,
          COLLECT(DISTINCT {name: i.name, strength: mi.relevance_score}) AS graphMatchedInterests,
          COALESCE(AVG(mi.relevance_score), 0) AS graphInterestScore,
          [interest IN $interests WHERE
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

        // Calculate graph score (weighted combination with archetype boost)
        WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
          (0.30 * interestScore +
           0.20 * valueScore +
           0.20 * occasionScore +
           0.15 * archetypeMatchScore +
           0.15 * socialProofScore) AS graphScore

        // Calculate hybrid score (60% graph + 40% vector)
        WITH product, vectorScore, graphScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore,
          (0.60 * graphScore + 0.40 * vectorScore) AS hybridScore,
          (graphScore + vectorScore) / 2.0 AS confidenceScore

        // Order by hybrid score and limit results
        ORDER BY hybridScore DESC
        LIMIT 20

        RETURN product, vectorScore, graphScore, hybridScore, confidenceScore,
               matchedInterests, matchedValues, matchedOccasions, socialProofCount, archetypeMatchScore
      `;

      // Get archetype attributes to match
      const archetypeAttributes = this.getArchetypeAttributes(params.meaningFramework.giftArchetype);

      this.log(`Archetype matching: ${params.meaningFramework.giftArchetype} → [${archetypeAttributes.join(', ')}]`);

      const result = await session.run(cypher, {
        queryEmbedding,
        styleEmbedding,
        sentimentEmbedding,
        useCaseEmbedding,
        interests: params.discoveryHints.interestPathways || [],
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        requiredValues: params.requiredValues || [],
        relationshipType: params.relationshipType || 'unknown',
        archetypeAttributes,
      });

      this.log(`Hybrid query returned ${result.records.length} products`);

      // Early termination if no results
      if (result.records.length === 0) {
        this.log('No products found matching criteria');
        return [];
      }

      const candidates = result.records.map((record) => this.recordToCandidate(record));

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

      // Cache the results (15-minute TTL)
      await cache.set(cacheKey, candidates, CacheTTL.HYBRID_SEARCH);
      this.log(`Cached hybrid search results (${candidates.length} candidates) for 15 minutes`);

      return candidates;
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
   */
  private recordToCandidate(record: any): ProductCandidate {
    const product = record.get('product').properties;
    const vectorScore = record.get('vectorScore');
    const graphScore = record.get('graphScore');
    const hybridScore = record.get('hybridScore');
    const confidenceScore = record.get('confidenceScore');
    const matchedInterests = record.get('matchedInterests') || [];
    const matchedValues = record.get('matchedValues') || [];
    const matchedOccasions = record.get('matchedOccasions') || [];
    const socialProofCountRaw = record.get('socialProofCount');
    const socialProofCount = typeof socialProofCountRaw === 'number'
      ? socialProofCountRaw
      : (socialProofCountRaw?.toNumber ? socialProofCountRaw.toNumber() : 0);

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
        matchedArchetype: '', // TODO: Get from product
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
   * - Different categories (max 3 per category)
   * - Different interests (max 4 per primary interest)
   * - Different product types
   */
  private ensureDiversity(candidates: ProductCandidate[]): ProductCandidate[] {
    if (candidates.length <= 15) return candidates;

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
      const category = candidate.product.category || 'uncategorized';
      const primaryInterest = candidate.matchReasons.matchedInterests[0] || 'general';
      const price = candidate.product.price;
      const range = price < 40 ? 'low' : price < 80 ? 'mid' : 'high';

      // Get current counts
      const vendorUsage = vendorCount.get(vendor) || 0;
      const categoryUsage = categoryCount.get(category) || 0;
      const interestUsage = interestCount.get(primaryInterest) || 0;
      const priceUsage = priceRanges[range];

      // Define diversity limits
      const maxPerVendor = 2;      // Max 2 per vendor
      const maxPerCategory = 3;    // Max 3 per category
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
        categoryCount.set(category, categoryUsage + 1);
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
          const category = candidate.product.category || 'uncategorized';
          const vendorUsage = vendorCount.get(vendor) || 0;
          const categoryUsage = categoryCount.get(category) || 0;

          // Respect vendor and category limits even when filling
          if (vendorUsage < 2 && categoryUsage < 3) {
            diverse.push(candidate);
            vendorCount.set(vendor, vendorUsage + 1);
            categoryCount.set(category, categoryUsage + 1);
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
}
