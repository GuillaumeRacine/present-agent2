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
import { generateEmbedding } from '../../lib/llm.js';
import { logger } from '../../lib/logger.js';

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
      // Extract context with safe defaults
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
        input.meaningContext?.relationshipContext?.relationshipAnalysis?.type || 'friend';

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
   */
  private async hybridSearch(params: HybridSearchParams): Promise<ProductCandidate[]> {
    const session = this.neo4j.session();

    try {
      // 1. Build semantic queries from meaning framework
      const semanticQuery = this.buildSemanticQuery(params.meaningFramework, params.discoveryHints);
      const styleQuery = this.buildStyleQuery(params.meaningFramework);
      const sentimentQuery = this.buildSentimentQuery(params.meaningFramework);
      const useCaseQuery = this.buildUseCaseQuery(params.meaningFramework);

      this.log('Generating embeddings for queries...');

      // 2. Generate embeddings in parallel
      const [
        queryEmbedding,
        styleEmbedding,
        sentimentEmbedding,
        useCaseEmbedding,
      ] = await Promise.all([
        generateEmbedding(semanticQuery),
        generateEmbedding(styleQuery),
        generateEmbedding(sentimentQuery),
        generateEmbedding(useCaseQuery),
      ]);

      this.log('Embeddings generated, executing hybrid Cypher query...');
      this.log(`Interest pathways: ${JSON.stringify(params.discoveryHints.interestPathways || [])}`);

      // 3. Execute hybrid Cypher query
      const cypher = `
        // 1. Vector similarity search across all 4 embeddings
        CALL db.index.vector.queryNodes('product_embedding', 30, $queryEmbedding)
        YIELD node AS product, score AS semanticScore

        // Get other vector scores
        WITH product, semanticScore,
          gds.similarity.cosine(product.style_embedding, $styleEmbedding) AS styleScore,
          gds.similarity.cosine(product.sentiment_embedding, $sentimentEmbedding) AS sentimentScore,
          gds.similarity.cosine(product.use_case_embedding, $useCaseEmbedding) AS useCaseScore

        // Calculate combined vector score
        WITH product,
          (0.40 * semanticScore + 0.25 * styleScore + 0.20 * sentimentScore + 0.15 * useCaseScore) AS vectorScore

        // 2. Apply hard constraints early
        WHERE product.available = true
          AND product.price >= $budgetMin
          AND product.price <= $budgetMax

        // 3. Graph traversal - Interest matching
        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $interests
        WITH product, vectorScore,
          COLLECT(DISTINCT {name: i.name, strength: mi.relevance_score}) AS matchedInterests,
          COALESCE(AVG(mi.relevance_score), 0) AS interestScore

        // 4. Graph traversal - Value alignment (STRICT for requirements)
        OPTIONAL MATCH (product)-[av:ALIGNS_WITH]->(v:Value)
        WITH product, vectorScore, matchedInterests, interestScore,
          COLLECT(DISTINCT {name: v.name, alignment: av.alignment_score}) AS matchedValues,
          COALESCE(AVG(av.alignment_score), 0) AS valueScore

        // Check required values
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          [val IN $requiredValues WHERE val IN [mv IN matchedValues | mv.name]] AS satisfiedRequirements
        WHERE SIZE($requiredValues) = 0 OR SIZE(satisfiedRequirements) = SIZE($requiredValues)

        // 5. Graph traversal - Occasion suitability
        OPTIONAL MATCH (product)-[so:SUITABLE_FOR]->(o:Occasion)
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          COLLECT(DISTINCT {name: o.name, suitability: so.suitability_score}) AS matchedOccasions,
          COALESCE(AVG(so.suitability_score), 0) AS occasionScore

        // 6. Social proof - Similar users who liked this product
        OPTIONAL MATCH (similarUser:User)-[:HAS_RELATIONSHIP {relationship_type: $relationshipType}]->(similarRecipient:Recipient)
        OPTIONAL MATCH (rec:Recommendation {product_id: product.id})
        WHERE rec.was_liked = true OR rec.was_purchased = true
        WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
          matchedOccasions, occasionScore,
          COUNT(DISTINCT rec) AS socialProofCount,
          COALESCE(COUNT(DISTINCT rec) / 10.0, 0) AS socialProofScore

        // 7. Calculate graph score (weighted combination)
        WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount,
          (0.35 * interestScore +
           0.25 * valueScore +
           0.25 * occasionScore +
           0.15 * socialProofScore) AS graphScore

        // 8. Calculate hybrid score (60% graph + 40% vector)
        WITH product, vectorScore, graphScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount,
          (0.60 * graphScore + 0.40 * vectorScore) AS hybridScore,
          (graphScore + vectorScore) / 2.0 AS confidenceScore

        // 9. Order by hybrid score and limit
        ORDER BY hybridScore DESC
        LIMIT 20

        RETURN product, vectorScore, graphScore, hybridScore, confidenceScore,
               matchedInterests, matchedValues, matchedOccasions, socialProofCount
      `;

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
      });

      this.log(`Hybrid query returned ${result.records.length} products`);

      const candidates = result.records.map((record) => this.recordToCandidate(record));

      // Log top candidates with scores for debugging
      if (candidates.length > 0) {
        this.log('Top 3 candidates:');
        candidates.slice(0, 3).forEach((c, i) => {
          this.log(
            `  ${i + 1}. ${c.product.title} - Graph: ${c.scores.graphScore.toFixed(3)}, ` +
            `Vector: ${c.scores.vectorScore.toFixed(3)}, ` +
            `Hybrid: ${c.scores.hybridScore.toFixed(3)}, ` +
            `Interests: [${c.matchReasons.matchedInterests.join(', ')}]`
          );
        });
      }

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
   * - Different vendors
   * - Different product types
   */
  private ensureDiversity(candidates: ProductCandidate[]): ProductCandidate[] {
    if (candidates.length <= 15) return candidates;

    const diverse: ProductCandidate[] = [];
    const usedVendors = new Set<string>();
    const priceRanges = { low: 0, mid: 0, high: 0 };

    // Sort by hybrid score
    const sorted = [...candidates].sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

    for (const candidate of sorted) {
      if (diverse.length >= 15) break;

      // Check vendor diversity
      const vendorUsed = usedVendors.has(candidate.product.vendor);

      // Determine price range
      const price = candidate.product.price;
      const range =
        price < 40 ? 'low' : price < 80 ? 'mid' : 'high';

      // Add if diverse or high scoring
      if (
        !vendorUsed ||
        priceRanges[range] < 3 ||
        candidate.scores.hybridScore > 0.8
      ) {
        diverse.push(candidate);
        usedVendors.add(candidate.product.vendor);
        priceRanges[range]++;
      }
    }

    // If we don't have enough, fill with top scoring
    if (diverse.length < 15) {
      for (const candidate of sorted) {
        if (diverse.length >= 15) break;
        if (!diverse.includes(candidate)) {
          diverse.push(candidate);
        }
      }
    }

    this.log(`Diversity ensured: ${diverse.length} products from ${usedVendors.size} vendors`);

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
