/**
 * Explorer Agent - MOST CRITICAL
 *
 * Discovers product candidates using hybrid graph + vector search
 */

import { BaseAgent } from './base';
import { ExplorerInput, ExplorerOutput, ProductCandidate } from '../../types/agents';
import { Driver } from 'neo4j-driver';

export class ExplorerAgent extends BaseAgent<ExplorerInput, ExplorerOutput> {
  name = 'Explorer';

  constructor(private neo4j: Driver) {
    super();
  }

  async process(input: ExplorerInput): Promise<ExplorerOutput> {
    this.log('Discovering product candidates');

    const startTime = Date.now();

    try {
      // Get budget and constraints
      const budget = input.meaningContext.constraintsContext.hardConstraints.budget;
      const meaningFramework = input.meaningContext.meaningFramework;

      // Execute hybrid search (graph + vector)
      const candidates = await this.hybridSearch(
        meaningFramework,
        budget,
        input.meaningContext.discoveryHints
      );

      // Ensure diversity
      const diverseCandidates = this.ensureDiversity(candidates);

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
  private async hybridSearch(
    meaningFramework: any,
    budget: any,
    discoveryHints: any
  ): Promise<ProductCandidate[]> {
    // TODO: Implement full hybrid Cypher query
    // This is a placeholder that will be expanded

    const session = this.neo4j.session();

    try {
      // Build semantic query from meaning framework
      const semanticQuery = this.buildSemanticQuery(meaningFramework, discoveryHints);

      // Execute hybrid query
      const cypher = `
        // Vector similarity search
        CALL db.index.vector.queryNodes('product_embeddings', 20, $queryEmbedding)
        YIELD node AS product, score AS vectorScore

        // Graph traversal for interests
        OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $interests
        WITH product, vectorScore, COLLECT({interest: i.name, strength: mi.relevance_score}) AS matchedInterests

        // Budget filter
        WHERE product.price >= $budgetMin AND product.price <= $budgetMax

        // Calculate hybrid score
        WITH product,
             vectorScore,
             matchedInterests,
             0.6 * (REDUCE(s = 0, m IN matchedInterests | s + m.strength) / SIZE(matchedInterests)) AS graphScore
        WITH product,
             vectorScore,
             graphScore,
             matchedInterests,
             (0.6 * graphScore + 0.4 * vectorScore) AS hybridScore

        ORDER BY hybridScore DESC
        LIMIT 20

        RETURN product, vectorScore, graphScore, hybridScore, matchedInterests
      `;

      const result = await session.run(cypher, {
        queryEmbedding: [], // TODO: Generate embedding from semantic query
        interests: discoveryHints.interestPathways || [],
        budgetMin: budget.min,
        budgetMax: budget.max,
      });

      return result.records.map((record) => this.recordToCandidate(record));
    } finally {
      await session.close();
    }
  }

  private buildSemanticQuery(meaningFramework: any, discoveryHints: any): string {
    // Combine meaning framework into semantic query
    const parts = [
      meaningFramework.emotionalMessage,
      ...meaningFramework.coreValues,
      ...discoveryHints.semanticQueries,
    ];
    return parts.join(' ');
  }

  private recordToCandidate(record: any): ProductCandidate {
    const product = record.get('product').properties;
    const vectorScore = record.get('vectorScore');
    const graphScore = record.get('graphScore');
    const hybridScore = record.get('hybridScore');
    const matchedInterests = record.get('matchedInterests') || [];

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
        confidenceScore: (graphScore + vectorScore) / 2,
      },
      matchReasons: {
        matchedInterests: matchedInterests.map((m: any) => m.interest),
        matchedValues: [],
        matchedArchetype: '',
        socialProofCount: 0,
      },
    };
  }

  private ensureDiversity(candidates: ProductCandidate[]): ProductCandidate[] {
    // TODO: Implement diversity algorithm
    // - Different price points
    // - Different vendors
    // - Different product types
    return candidates.slice(0, 15); // Take top 15 for now
  }

  private calculateDiversityScore(candidates: ProductCandidate[]): number {
    // TODO: Calculate based on price spread, vendor variety, type variety
    return 0.75;
  }

  private calculateCoverageScore(candidates: ProductCandidate[], framework: any): number {
    // TODO: Check how well candidates cover different aspects of meaning framework
    return 0.8;
  }

  private calculateAvgConfidence(candidates: ProductCandidate[]): number {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((acc, c) => acc + c.scores.confidenceScore, 0);
    return sum / candidates.length;
  }
}
