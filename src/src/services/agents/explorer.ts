/**
 * Explorer Agent - MOST CRITICAL
 *
 * Discovers product candidates using hybrid graph + vector search:
 * - Vector similarity search (primary embedding)
 * - Graph traversal: IN_CATEGORY, GIFT_FOR_OCCASION, GIFT_FOR_RELATIONSHIP, FITS_PERSONA
 * - Text fallback for interest matching
 * - Gift quality signals (gift_suitability_score, popularity_score, gift_proven)
 * - Hybrid scoring: Vector (35%) + Interest (25%) + Quality (15%) + Price (15%) + Context (10%)
 * - Diversity algorithm (vendor, category, price range)
 */

import { BaseAgent } from './base.js';
import {
  ExplorerInput,
  ExplorerOutput,
  ProductCandidate,
  MeaningOutput,
} from '../../types/agents.js';
import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { embeddingCache } from '../../lib/embedding-cache.js';
import { logger } from '../../lib/logger.js';
import {
  ARCHETYPE_ATTRIBUTES,
  GiftArchetype,
  extractAttributesFromProductProps,
  getPrimaryArchetype as deriveArchetypeFromAttributes,
} from '../../types/gift-attributes.js';
import { cache, CacheTTL } from '../../lib/cache.js';
import { generateEmbedding } from '../../lib/llm.js';

interface HybridSearchParams {
  meaningFramework: MeaningOutput['meaningFramework'];
  budget: { min: number; max: number };
  discoveryHints: MeaningOutput['discoveryHints'];
  relationshipType?: string;
  requiredValues?: string[];
  isRetry?: boolean;
  searchDirection?: 'broaden' | 'narrow' | 'pivot';
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
      // Handle Bar Raiser retry feedback
      if (input.barRaiserFeedback) {
        this.log('Bar Raiser retry feedback received', {
          missedInterests: input.barRaiserFeedback.missedInterests,
          searchDirection: input.barRaiserFeedback.searchDirection,
          additionalQueries: input.barRaiserFeedback.additionalSearchQueries.length,
        });
      }

      // Extract budget — try multiple sources in priority order
      // 1. Constraints hard budget (from ConstraintsAgent via MeaningAgent)
      // 2. Listener budget (always extracted from user query)
      // 3. Default fallback
      const constraintsBudget = input.meaningContext?.constraintsContext?.hardConstraints?.budget;
      // Deep path: budget flows through constraints → relationship → memory → listener
      const listenerBudget = (input.meaningContext?.constraintsContext as any)?.relationshipContext?.memoryContext?.listenerContext?.budget;
      const meaningListenerBudget = (input.meaningContext as any)?.listenerContext?.budget;
      let budget = constraintsBudget || listenerBudget || meaningListenerBudget || { min: 0, max: 1000 };
      this.log(`Budget source: ${constraintsBudget ? 'constraints' : listenerBudget ? 'listener-via-constraints' : meaningListenerBudget ? 'listener-via-meaning' : 'default'} ($${budget.min}-$${budget.max})`);

      // Apply strict budget enforcement from Bar Raiser if provided
      if (input.barRaiserFeedback?.budgetEnforcement) {
        budget = {
          min: input.barRaiserFeedback.budgetEnforcement.min,
          max: input.barRaiserFeedback.budgetEnforcement.max,
          isStrict: input.barRaiserFeedback.budgetEnforcement.strict,
        } as any;
        this.log(`Budget overridden by Bar Raiser: $${budget.min}-$${budget.max}`);
      }

      const meaningFramework = input.meaningContext?.meaningFramework || {
        giftArchetype: 'thoughtful',
        archetypeConfidence: 0.5,
        archetypeReasons: ['default fallback'],
        emotionalMessage: 'appreciation',
        coreValues: [],
        personalRelevance: { connectsToInterests: [], addressesNeeds: [] }
      };
      let discoveryHints = input.meaningContext?.discoveryHints || {
        semanticQueries: [],
        interestPathways: [],
        archetypeFilters: []
      };

      // Augment discovery hints with Bar Raiser feedback
      if (input.barRaiserFeedback) {
        const feedback = input.barRaiserFeedback;

        // Add missed interests to interest pathways
        if (feedback.missedInterests.length > 0) {
          discoveryHints = {
            ...discoveryHints,
            interestPathways: [
              ...discoveryHints.interestPathways,
              ...feedback.missedInterests.filter(
                (i) => !discoveryHints.interestPathways.includes(i)
              ),
            ],
          };
          this.log(`Added ${feedback.missedInterests.length} missed interests to search`);
        }

        // Add additional search queries
        if (feedback.additionalSearchQueries.length > 0) {
          discoveryHints = {
            ...discoveryHints,
            semanticQueries: [
              ...discoveryHints.semanticQueries,
              ...feedback.additionalSearchQueries,
            ],
          };
          this.log(`Added ${feedback.additionalSearchQueries.length} additional semantic queries`);
        }
      }

      const requiredValues = input.meaningContext?.constraintsContext?.hardConstraints?.requiredAttributes || [];
      const relationshipType =
        input.meaningContext?.constraintsContext?.relationshipContext?.relationshipAnalysis?.type || 'friend';

      // Execute hybrid search (graph + vector)
      const isRetry = !!input.barRaiserFeedback;
      const candidates = await this.hybridSearch({
        meaningFramework,
        budget,
        isRetry,
        searchDirection: input.barRaiserFeedback?.searchDirection,
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
   * Multi-stage hybrid search with refinement
   *
   * Key design: Per-interest parallel search to guarantee coverage of ALL stated interests.
   * A single combined embedding gets dominated by the most common interest — instead we
   * run separate searches per interest and merge.
   *
   * Stage 1: Per-interest vector + graph search (parallel per interest)
   * Stage 2: Merge and deduplicate by normalized title
   * Stage 3: Score and rank with full hybrid scoring
   * Stage 4: Fulltext fallback if sparse
   *
   * Aligned with ACTUAL Neo4j schema:
   * - Relationships: IN_CATEGORY, GIFT_FOR_OCCASION, GIFT_FOR_RELATIONSHIP, FITS_PERSONA, MATCHES_INTEREST
   * - Product props: product_url, title, description, price, brand_url, embedding
   * - Quality signals: gift_suitability_score, popularity_score, gift_proven, avg_rating
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

    // Skip cache on retry (need fresh results with different strategy)
    if (!params.isRetry) {
      const cached = await cache.get<ProductCandidate[]>(cacheKey);
      if (cached) {
        this.log(`Hybrid search results retrieved from cache (${cached.length} candidates)`);
        return cached;
      }
    } else {
      this.log(`Retry mode: skipping cache (direction: ${params.searchDirection || 'broaden'})`);
    }

    this.log('Executing per-interest search...');

    const interests = params.discoveryHints.interestPathways || [];
    this.log(`Interests to search: ${JSON.stringify(interests)}`);

    // STAGE 1: Query expansion first (get related interests)
    const expandedParams = await this.expandQuery(params, {
      dominantArchetype: null,
      medianPrice: (params.budget.min + params.budget.max) / 2,
      priceRange: params.budget,
      relatedInterests: [],
    });

    const allInterests = [...interests, ...expandedParams.expandedInterests];
    this.log(`All interests (original + expanded): ${JSON.stringify(allInterests)}`);

    // STAGE 2: Per-interest parallel search
    // Run separate searches per interest so each interest gets fair representation
    // On retry with 'broaden', increase limits to find more diverse products
    const baseLimitPerInterest = params.isRetry && params.searchDirection === 'broaden' ? 25 : 15;
    const perInterestLimit = Math.max(baseLimitPerInterest, Math.floor(50 / Math.max(interests.length, 1)));
    const allCandidateMaps = new Map<string, ProductCandidate>(); // keyed by product_url

    // Run per-interest vector searches in parallel
    const searchPromises = interests.map(interest =>
      this.searchForInterest(interest, allInterests, params, perInterestLimit)
    );

    // Also run a combined semantic search as supplement
    const combinedQuery = this.buildSemanticQuery(params.meaningFramework, params.discoveryHints);
    searchPromises.push(this.searchByEmbedding(combinedQuery, allInterests, params, 20));

    // Also run interest-graph-first search (starts from Interest nodes, no vector dependency)
    searchPromises.push(this.searchFromInterestGraph(interests, params, perInterestLimit));

    const searchResults = await Promise.all(searchPromises);

    // Merge all results, keeping highest score per product
    for (const candidates of searchResults) {
      for (const candidate of candidates) {
        const key = candidate.product.id;
        const existing = allCandidateMaps.get(key);
        if (!existing || candidate.scores.hybridScore > existing.scores.hybridScore) {
          allCandidateMaps.set(key, candidate);
        }
      }
    }

    const mergedCandidates = Array.from(allCandidateMaps.values());
    this.log(`Merged ${mergedCandidates.length} unique candidates from ${searchResults.length} search paths`);

    // Log per-interest coverage
    for (let i = 0; i < interests.length; i++) {
      this.log(`  ${interests[i]}: ${searchResults[i].length} candidates`);
    }

    // STAGE 3: Title deduplication — same product from different vendors
    const deduplicated = this.deduplicateByTitle(mergedCandidates);
    this.log(`After title dedup: ${deduplicated.length} candidates (removed ${mergedCandidates.length - deduplicated.length} duplicates)`);

    // STAGE 4: Fulltext fallback if sparse
    let finalCandidates = deduplicated;
    if (deduplicated.length < 5 || this.hasLowScores(deduplicated)) {
      this.log('Sparse or low-scoring results detected, applying fulltext fallback...');
      const fulltextCandidates = await this.fulltextFallback(params, deduplicated);

      if (fulltextCandidates.length > 0) {
        const existingIds = new Set(deduplicated.map(c => c.product.id));
        const newCandidates = fulltextCandidates.filter(c => !existingIds.has(c.product.id));
        // Also deduplicate fulltext results by title against existing
        const deduped = this.deduplicateByTitle([...deduplicated, ...newCandidates]);
        finalCandidates = deduped;
        this.log(`Fulltext fallback grew pool to ${finalCandidates.length} candidates`);
      }
    }

    // Sort by hybrid score
    finalCandidates.sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

    // Log top candidates
    if (finalCandidates.length > 0) {
      this.log(`Top 5 candidates after merge+dedup:`);
      finalCandidates.slice(0, 5).forEach((c, i) => {
        this.log(
          `  ${i + 1}. ${c.product.title} ($${c.product.price}) - ` +
          `Hybrid: ${c.scores.hybridScore.toFixed(3)}, ` +
          `Vector: ${c.scores.vectorScore.toFixed(3)}, ` +
          `Interests: [${c.matchReasons.matchedInterests.join(', ')}]`
        );
      });
    }

    // Cache the results (15-minute TTL)
    await cache.set(cacheKey, finalCandidates, CacheTTL.HYBRID_SEARCH);
    this.log(`Cached hybrid search results (${finalCandidates.length} candidates) for 15 minutes`);

    return finalCandidates;
  }

  /**
   * Search for products matching a specific interest via vector + graph
   * Generates an interest-specific embedding to avoid cross-interest dilution
   */
  private async searchForInterest(
    interest: string,
    allInterests: string[],
    params: HybridSearchParams,
    limit: number
  ): Promise<ProductCandidate[]> {
    const session = this.neo4j.session();

    try {
      // Build interest-specific query for embedding
      const interestQuery = `${interest} gift ${params.meaningFramework.emotionalMessage || ''}`.trim();
      const [queryEmbedding] = await embeddingCache.getMany([interestQuery]);

      const cypher = `
        CALL db.index.vector.queryNodes('product_embedding', $vectorLimit, $queryEmbedding)
        YIELD node AS product, score AS vectorScore
        WHERE product.price >= $budgetMin AND product.price <= $budgetMax

        WITH product, vectorScore

        // Interest matching via graph
        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $allInterests
        WITH product, vectorScore,
          COLLECT(DISTINCT i.name) AS graphMatchedInterests,
          COALESCE(AVG(mi.relevance_score), 0) AS graphInterestScore

        // Category matching
        OPTIONAL MATCH (product)-[:IN_CATEGORY]->(c:Category)
        WHERE c.name IN $allInterests
        WITH product, vectorScore, graphMatchedInterests, graphInterestScore,
          COLLECT(DISTINCT c.name) AS graphMatchedCategories

        // Text fallback
        WITH product, vectorScore, graphMatchedInterests, graphInterestScore, graphMatchedCategories,
          [term IN $allInterests WHERE
            toLower(product.title) CONTAINS toLower(term) OR
            toLower(COALESCE(product.description, '')) CONTAINS toLower(term)
          ] AS textMatchedInterests

        // Combine interest paths
        WITH product, vectorScore,
          CASE
            WHEN SIZE(graphMatchedInterests) > 0 THEN
              [name IN graphMatchedInterests | {name: name, strength: 0.9}]
            WHEN SIZE(graphMatchedCategories) > 0 THEN
              [cat IN graphMatchedCategories | {name: cat, strength: 0.8}]
            WHEN SIZE(textMatchedInterests) > 0 THEN
              [t IN textMatchedInterests | {name: t, strength: 0.6}]
            ELSE []
          END AS matchedInterests,
          CASE
            WHEN SIZE(graphMatchedInterests) > 0 THEN
              CASE WHEN graphInterestScore > 0 THEN graphInterestScore ELSE 0.9 END
            WHEN SIZE(graphMatchedCategories) > 0 THEN 0.8
            WHEN SIZE(textMatchedInterests) > 0 THEN 0.6
            ELSE 0
          END AS interestScore

        // Gift quality signals
        WITH product, vectorScore, matchedInterests, interestScore,
          COALESCE(product.gift_suitability_score, 0) / 100.0 AS giftQualityScore,
          COALESCE(product.popularity_score, 0) / 100.0 AS popularityScore,
          CASE WHEN product.gift_proven = true THEN 0.2 ELSE 0.0 END AS giftProvenBonus

        // Price fitness
        WITH product, vectorScore, matchedInterests, interestScore,
          giftQualityScore, popularityScore, giftProvenBonus,
          CASE
            WHEN product.price = 0 THEN 0.0
            WHEN $budgetMax = $budgetMin THEN 1.0
            ELSE 1.0 - (ABS(product.price - ($budgetMin + $budgetMax) / 2.0) / (($budgetMax - $budgetMin) / 2.0 + 0.01))
          END AS priceFitScore

        // Hybrid score
        WITH product, vectorScore, matchedInterests, interestScore,
          giftQualityScore, popularityScore, giftProvenBonus, priceFitScore,
          (0.35 * vectorScore +
           0.25 * interestScore +
           0.15 * ((giftQualityScore + popularityScore) / 2.0 + giftProvenBonus) +
           0.15 * priceFitScore) AS hybridScore,
          (vectorScore + interestScore + priceFitScore) / 3.0 AS confidenceScore

        ORDER BY hybridScore DESC
        LIMIT $limit

        RETURN product, vectorScore, hybridScore, confidenceScore,
               matchedInterests, interestScore, priceFitScore,
               giftQualityScore, popularityScore
      `;

      const result = await session.run(cypher, {
        queryEmbedding,
        allInterests,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        vectorLimit: neo4j.int(limit * 3), // fetch 3x, filter down
        limit: neo4j.int(limit),
      });

      return result.records.map(record => this.recordToCandidateSimple(record, params.meaningFramework));
    } catch (error) {
      logger.warn(`Interest search failed for "${interest}"`, { error });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Search by a combined embedding (supplement to per-interest search)
   */
  private async searchByEmbedding(
    query: string,
    allInterests: string[],
    params: HybridSearchParams,
    limit: number
  ): Promise<ProductCandidate[]> {
    const session = this.neo4j.session();

    try {
      const [queryEmbedding] = await embeddingCache.getMany([query]);

      const cypher = `
        CALL db.index.vector.queryNodes('product_embedding', $vectorLimit, $queryEmbedding)
        YIELD node AS product, score AS vectorScore
        WHERE product.price >= $budgetMin AND product.price <= $budgetMax

        WITH product, vectorScore

        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $allInterests
        WITH product, vectorScore,
          COLLECT(DISTINCT i.name) AS matchedInterestNames,
          COALESCE(AVG(mi.relevance_score), 0) AS interestScore

        WITH product, vectorScore,
          [name IN matchedInterestNames | {name: name, strength: 0.9}] AS matchedInterests,
          CASE WHEN SIZE(matchedInterestNames) > 0 THEN
            CASE WHEN interestScore > 0 THEN interestScore ELSE 0.9 END
          ELSE 0 END AS interestScore,
          COALESCE(product.gift_suitability_score, 0) / 100.0 AS giftQualityScore,
          COALESCE(product.popularity_score, 0) / 100.0 AS popularityScore,
          CASE WHEN product.gift_proven = true THEN 0.2 ELSE 0.0 END AS giftProvenBonus,
          CASE
            WHEN product.price = 0 THEN 0.0
            WHEN $budgetMax = $budgetMin THEN 1.0
            ELSE 1.0 - (ABS(product.price - ($budgetMin + $budgetMax) / 2.0) / (($budgetMax - $budgetMin) / 2.0 + 0.01))
          END AS priceFitScore

        WITH product, vectorScore, matchedInterests, interestScore,
          giftQualityScore, popularityScore, giftProvenBonus, priceFitScore,
          (0.35 * vectorScore +
           0.25 * interestScore +
           0.15 * ((giftQualityScore + popularityScore) / 2.0 + giftProvenBonus) +
           0.15 * priceFitScore) AS hybridScore,
          (vectorScore + interestScore + priceFitScore) / 3.0 AS confidenceScore

        ORDER BY hybridScore DESC
        LIMIT $limit

        RETURN product, vectorScore, hybridScore, confidenceScore,
               matchedInterests, interestScore, priceFitScore,
               giftQualityScore, popularityScore
      `;

      const result = await session.run(cypher, {
        queryEmbedding,
        allInterests,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        vectorLimit: neo4j.int(limit * 3),
        limit: neo4j.int(limit),
      });

      return result.records.map(record => this.recordToCandidateSimple(record, params.meaningFramework));
    } catch (error) {
      logger.warn('Combined embedding search failed', { error });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Interest-graph-first search — starts from Interest/Category nodes, no vector dependency.
   * This guarantees we find products tagged with stated interests even if they're
   * not in the vector neighborhood of the query.
   */
  private async searchFromInterestGraph(
    interests: string[],
    params: HybridSearchParams,
    limit: number
  ): Promise<ProductCandidate[]> {
    if (interests.length === 0) return [];

    const session = this.neo4j.session();

    try {
      const cypher = `
        // Start from Interest nodes directly
        UNWIND $interests AS interestName
        MATCH (i:Interest {name: interestName})<-[mi:MATCHES_INTEREST]-(product:Product)
        WHERE product.price >= $budgetMin AND product.price <= $budgetMax

        WITH product,
          COLLECT(DISTINCT i.name) AS matchedInterestNames,
          AVG(COALESCE(mi.relevance_score, 0.8)) AS avgRelevance

        // Also check category matches
        OPTIONAL MATCH (product)-[:IN_CATEGORY]->(c:Category)
        WHERE c.name IN $interests
        WITH product, matchedInterestNames, avgRelevance,
          COLLECT(DISTINCT c.name) AS matchedCategories

        // Gift quality signals
        WITH product, matchedInterestNames, avgRelevance, matchedCategories,
          COALESCE(product.gift_suitability_score, 0) / 100.0 AS giftQualityScore,
          COALESCE(product.popularity_score, 0) / 100.0 AS popularityScore,
          CASE WHEN product.gift_proven = true THEN 0.2 ELSE 0.0 END AS giftProvenBonus,
          CASE
            WHEN product.price = 0 THEN 0.0
            WHEN $budgetMax = $budgetMin THEN 1.0
            ELSE 1.0 - (ABS(product.price - ($budgetMin + $budgetMax) / 2.0) / (($budgetMax - $budgetMin) / 2.0 + 0.01))
          END AS priceFitScore

        // Score: interest coverage + quality + price fit
        WITH product,
          [name IN matchedInterestNames | {name: name, strength: 0.9}] +
          [cat IN matchedCategories | {name: cat, strength: 0.8}] AS matchedInterests,
          // Interest coverage: fraction of queried interests matched
          toFloat(SIZE(matchedInterestNames) + SIZE(matchedCategories)) / $interestCount AS coverageScore,
          avgRelevance AS interestScore,
          giftQualityScore, popularityScore, giftProvenBonus, priceFitScore,
          // Hybrid score for graph-first (no vector component, boost interest weight)
          (0.40 * avgRelevance +
           0.20 * ((giftQualityScore + popularityScore) / 2.0 + giftProvenBonus) +
           0.20 * priceFitScore +
           0.20 * toFloat(SIZE(matchedInterestNames)) / $interestCount) AS hybridScore

        ORDER BY hybridScore DESC
        LIMIT $limit

        RETURN product, 0.0 AS vectorScore, hybridScore,
               hybridScore AS confidenceScore,
               matchedInterests, interestScore, priceFitScore,
               giftQualityScore, popularityScore
      `;

      const result = await session.run(cypher, {
        interests,
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        interestCount: interests.length,
        limit: neo4j.int(limit),
      });

      this.log(`Interest-graph search found ${result.records.length} candidates`);

      return result.records.map(record => this.recordToCandidateSimple(record, params.meaningFramework));
    } catch (error) {
      logger.warn('Interest graph search failed', { error });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Simplified record → candidate conversion (no occasion/relationship fields)
   */
  private recordToCandidateSimple(record: any, meaningFramework?: MeaningOutput['meaningFramework']): ProductCandidate {
    const product = record.get('product').properties;
    const vectorScore = record.get('vectorScore') || 0;
    const hybridScore = record.get('hybridScore') || 0;
    const confidenceScore = record.get('confidenceScore') || 0;
    const matchedInterests = record.get('matchedInterests') || [];
    const interestScore = record.get('interestScore') || 0;
    const giftQualityScore = record.get('giftQualityScore') || 0;

    const primaryArchetype = meaningFramework ? this.getPrimaryArchetype(meaningFramework) : 'thoughtful';

    return {
      product: {
        id: product.product_url || product.id,
        title: product.title,
        description: product.description,
        price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
        vendor: product.brand_url || product.vendor || 'unknown',
        imageUrl: product.imageUrl || null,
        url: product.product_url || product.url,
        attributes: {},
        giftAttributes: {},
      },
      scores: {
        graphScore: interestScore,
        vectorScore: typeof vectorScore === 'number' ? vectorScore : 0,
        hybridScore: typeof hybridScore === 'number' ? hybridScore : 0,
        confidenceScore: typeof confidenceScore === 'number' ? confidenceScore : 0,
      },
      matchReasons: {
        matchedInterests: matchedInterests.map((m: any) => m.name || m).filter(Boolean),
        matchedValues: [],
        matchedArchetype: primaryArchetype,
        matchedAttributes: [],
        socialProofCount: 0,
      },
      graphContext: {
        pathLength: 1,
        relationshipStrengths: {},
      },
    };
  }

  /**
   * Deduplicate products by normalized title.
   * "AeroPress Coffee Maker" from 5 vendors → keep the one with highest hybrid score.
   */
  private deduplicateByTitle(candidates: ProductCandidate[]): ProductCandidate[] {
    const titleGroups = new Map<string, ProductCandidate>();

    for (const candidate of candidates) {
      const normalizedTitle = this.normalizeTitle(candidate.product.title);
      const existing = titleGroups.get(normalizedTitle);
      if (!existing || candidate.scores.hybridScore > existing.scores.hybridScore) {
        titleGroups.set(normalizedTitle, candidate);
      }
    }

    return Array.from(titleGroups.values());
  }

  /**
   * Normalize a product title for deduplication.
   * Strips vendor-specific suffixes, sizes, colors, subscription variants.
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s*[-–—]\s*(size|color|colour|pack|set|bundle|sub|subscription)\b.*$/i, '')
      .replace(/\s*\(\d+\s*(oz|ml|g|kg|lb|pack|ct)\).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
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
      ...discoveryHints.interestPathways,
    ];
    return parts.filter(Boolean).join('. ');
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

  // recordToCandidate removed — replaced by recordToCandidateSimple

  /**
   * Ensure diversity in results using two-phase selection.
   *
   * Phase 1: Guarantee minimum coverage per stated interest (2 products each).
   *          This prevents a high-scoring interest (coffee) from crowding out others (hiking).
   * Phase 2: Fill remaining slots by hybrid score with vendor/category/interest limits.
   *
   * Constraints:
   * - Max 2 per vendor, max 3 per category, max 4 per interest, max 6 per price range
   * - Title deduplication (same product from different vendors)
   * - Target: 15 diverse products
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
        MATCH (p:Product {product_url: productId})
        OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
        RETURN p.product_url AS productId, collect(c.name) AS categories
        `,
        { productIds }
      );

      const productCategories = new Map<string, string[]>();
      for (const record of categoryResult.records) {
        productCategories.set(record.get('productId'), record.get('categories') || []);
      }

      const diverse: ProductCandidate[] = [];
      const vendorCount = new Map<string, number>();
      const categoryCount = new Map<string, number>();
      const interestCount = new Map<string, number>();
      const titleSeen = new Set<string>();
      const priceRanges = { low: 0, mid: 0, high: 0 };
      const selectedIds = new Set<string>();

      // Collect all unique stated interests from candidates
      const allInterests = new Set<string>();
      for (const c of candidates) {
        for (const i of c.matchReasons.matchedInterests) {
          allInterests.add(i);
        }
      }

      // Helper to add a candidate with tracking
      const addCandidate = (candidate: ProductCandidate): boolean => {
        const normalizedTitle = this.normalizeTitle(candidate.product.title);
        if (titleSeen.has(normalizedTitle)) return false;
        if (selectedIds.has(candidate.product.id)) return false;

        const vendor = candidate.product.vendor;
        const categories = productCategories.get(candidate.product.id) || [];
        const primaryCategory = categories[0] || 'uncategorized';
        const price = candidate.product.price;
        const range = price < 40 ? 'low' : price < 80 ? 'mid' : 'high';

        // Check hard limits
        if ((vendorCount.get(vendor) || 0) >= 2) return false;
        if ((categoryCount.get(primaryCategory) || 0) >= 3) return false;

        diverse.push(candidate);
        selectedIds.add(candidate.product.id);
        titleSeen.add(normalizedTitle);
        vendorCount.set(vendor, (vendorCount.get(vendor) || 0) + 1);
        categoryCount.set(primaryCategory, (categoryCount.get(primaryCategory) || 0) + 1);
        for (const interest of candidate.matchReasons.matchedInterests) {
          interestCount.set(interest, (interestCount.get(interest) || 0) + 1);
        }
        priceRanges[range]++;
        return true;
      };

      // PHASE 1: Guarantee minimum coverage per interest
      // For each stated interest, pick the top 2 products by score
      const minPerInterest = 2;
      const interestCoverage = new Map<string, number>();

      for (const interest of allInterests) {
        // Get candidates matching this interest, sorted by score
        const interestCandidates = candidates
          .filter(c => c.matchReasons.matchedInterests.includes(interest))
          .sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

        let added = 0;
        for (const candidate of interestCandidates) {
          if (added >= minPerInterest) break;
          if (diverse.length >= 15) break;
          if (addCandidate(candidate)) {
            added++;
          }
        }
        interestCoverage.set(interest, added);
      }

      this.log(`Phase 1 (interest coverage): ${diverse.length} products covering ${interestCoverage.size} interests`);
      for (const [interest, count] of interestCoverage) {
        this.log(`  ${interest}: ${count} products`);
      }

      // PHASE 2: Fill remaining slots by hybrid score with diversity limits
      const sorted = [...candidates].sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

      for (const candidate of sorted) {
        if (diverse.length >= 15) break;

        const primaryInterest = candidate.matchReasons.matchedInterests[0] || 'general';
        const interestUsage = interestCount.get(primaryInterest) || 0;
        const price = candidate.product.price;
        const range = price < 40 ? 'low' : price < 80 ? 'mid' : 'high';

        // Check interest + price diversity
        if (interestUsage >= 4) continue;
        if (priceRanges[range] >= 6) continue;

        addCandidate(candidate);
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
    const priceScore = Math.min(1, priceStdDev / 30);

    // Vendor diversity
    const vendors = new Set(candidates.map((c) => c.product.vendor));
    const vendorScore = Math.min(1, vendors.size / candidates.length);

    // Interest diversity
    const allInterests = new Set(
      candidates.flatMap((c) => c.matchReasons.matchedInterests)
    );
    const interestScore = Math.min(1, allInterests.size / 5);

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
   * Expand query with related concepts from graph (2-hop traversal)
   * Uses MATCHES_INTEREST + IN_CATEGORY relationships for discovery
   */
  private async expandQuery(
    params: HybridSearchParams,
    _patterns?: { dominantArchetype: string | null; medianPrice: number; priceRange: { min: number; max: number }; relatedInterests: string[] }
  ): Promise<{
    expandedInterests: string[];
    limit: number;
  }> {
    const session = this.neo4j.session();

    try {
      const originalInterests = params.discoveryHints.interestPathways || [];

      // Query graph for related interests (2-hop traversal via MATCHES_INTEREST + IN_CATEGORY)
      const cypher = `
        UNWIND $interests AS interest
        // Try MATCHES_INTEREST first (more precise)
        OPTIONAL MATCH (i1:Interest {name: interest})
        OPTIONAL MATCH (i1)<-[:MATCHES_INTEREST]-(p:Product)-[:MATCHES_INTEREST]->(i2:Interest)
        WHERE i2.name <> interest AND NOT i2.name IN $interests
        WITH COLLECT(DISTINCT {name: i2.name, strength: COUNT(DISTINCT p)}) AS interestHops
        // Also try IN_CATEGORY
        UNWIND $interests AS interest2
        OPTIONAL MATCH (c1:Category {name: interest2})
        OPTIONAL MATCH (c1)<-[:IN_CATEGORY]-(p2:Product)-[:IN_CATEGORY]->(c2:Category)
        WHERE c2.name <> interest2 AND NOT c2.name IN $interests
        WITH interestHops, COLLECT(DISTINCT {name: c2.name, strength: COUNT(DISTINCT p2)}) AS categoryHops
        // Combine both paths
        WITH interestHops + categoryHops AS allHops
        UNWIND allHops AS hop
        WHERE hop.name IS NOT NULL
        WITH hop.name AS relatedInterest, SUM(hop.strength) AS connectionStrength
        WHERE connectionStrength >= 2
        RETURN relatedInterest, connectionStrength
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
        limit: 20,
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
   * Check if results are sparse or low-scoring
   */
  private hasLowScores(candidates: ProductCandidate[]): boolean {
    if (candidates.length === 0) return true;
    const avgHybridScore = candidates.reduce((sum, c) => sum + c.scores.hybridScore, 0) / candidates.length;
    return avgHybridScore < 0.5;
  }

  /**
   * Fulltext fallback for vague queries
   * Uses fulltext index 'product_search' on title, description, brand_url
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

      // Execute fulltext search using actual index name 'product_search'
      const cypher = `
        CALL db.index.fulltext.queryNodes('product_search', $query)
        YIELD node AS product, score AS fulltextScore
        WHERE product.price >= $budgetMin
          AND product.price <= $budgetMax
          AND fulltextScore > 0.5

        // Extract matched terms from product text
        WITH product, fulltextScore,
          [term IN $terms WHERE
            toLower(product.title) CONTAINS toLower(term) OR
            toLower(product.description) CONTAINS toLower(term)
          ] AS matchedTerms

        // Normalize fulltext score — Neo4j returns raw Lucene scores (0-30+)
        // Cap to [0.4, 0.75] range so fulltext doesn't dominate vector/graph results
        WITH product, fulltextScore, matchedTerms,
          CASE
            WHEN fulltextScore > 10 THEN 0.75
            ELSE 0.4 + (fulltextScore / 10.0 * 0.35)
          END AS normalizedScore

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

      const primaryArchetype = this.getPrimaryArchetype(params.meaningFramework);

      const candidates = result.records.map((record) => {
        const product = record.get('product').properties;
        const normalizedScore = record.get('normalizedScore');
        const matchedTerms = record.get('matchedTerms') || [];

        return {
          product: {
            id: product.product_url || product.id,
            title: product.title,
            description: product.description,
            price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
            vendor: product.brand_url || product.vendor || 'unknown',
            imageUrl: product.imageUrl || null,
            url: product.product_url || product.url,
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
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Procedure.ProcedureNotFound') {
        this.log('Fulltext index not available on this Neo4j instance - using standard search');
      } else {
        logger.warn('Fulltext fallback skipped (procedure unavailable or failed)', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return [];
    } finally {
      await session.close();
    }
  }
}
