/**
 * Learning Agent
 *
 * Updates the graph based on user feedback to improve future recommendations
 */

import { BaseAgent } from './base';
import { LearningInput, LearningOutput, GraphUpdate, LearnedPattern } from '../../types/agents';
import { Driver } from 'neo4j-driver';

export class LearningAgent extends BaseAgent<LearningInput, LearningOutput> {
  name = 'Learning';

  constructor(private neo4j: Driver) {
    super();
  }

  async process(input: LearningInput): Promise<LearningOutput> {
    this.log('Learning from user feedback');

    try {
      // Record the recommendation event
      await this.recordRecommendation(input);

      // Track user actions
      await this.trackActions(input);

      // Generate graph updates based on feedback
      const graphUpdates = this.generateGraphUpdates(input);

      // Apply updates to Neo4j
      const updatesApplied = await this.applyUpdates(graphUpdates);

      // Identify learned patterns
      const patternsLearned = await this.identifyPatterns(input);

      return {
        graphUpdates,
        patternsLearned,
        outcomes: this.calculateOutcomes(input),
        learnedAt: new Date(),
        updatesApplied,
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private async recordRecommendation(input: LearningInput): Promise<void> {
    const session = this.neo4j.session();

    try {
      await session.run(
        `
        CREATE (rec:Recommendation {
          id: $recommendationId,
          userId: $userId,
          sessionId: $sessionId,
          timestamp: datetime(),
          totalRecommendations: $totalRecommendations
        })
        RETURN rec
      `,
        {
          recommendationId: input.recommendationId,
          userId: input.userId,
          sessionId: input.sessionId,
          totalRecommendations: input.originalContext.totalRecommendations,
        }
      );
    } finally {
      await session.close();
    }
  }

  private async trackActions(input: LearningInput): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Track each action type
      for (const productId of input.userActions.viewed || []) {
        await session.run(
          `
          MATCH (rec:Recommendation {id: $recId})
          MATCH (p:Product {id: $productId})
          MERGE (rec)-[r:VIEWED]->(p)
          SET r.timestamp = datetime()
        `,
          { recId: input.recommendationId, productId }
        );
      }

      for (const productId of input.userActions.clicked || []) {
        await session.run(
          `
          MATCH (rec:Recommendation {id: $recId})
          MATCH (p:Product {id: $productId})
          MERGE (rec)-[r:CLICKED]->(p)
          SET r.timestamp = datetime()
        `,
          { recId: input.recommendationId, productId }
        );
      }

      for (const productId of input.userActions.liked || []) {
        await session.run(
          `
          MATCH (rec:Recommendation {id: $recId})
          MATCH (p:Product {id: $productId})
          MERGE (rec)-[r:LIKED]->(p)
          SET r.timestamp = datetime()
        `,
          { recId: input.recommendationId, productId }
        );
      }

      for (const productId of input.userActions.dismissed || []) {
        await session.run(
          `
          MATCH (rec:Recommendation {id: $recId})
          MATCH (p:Product {id: $productId})
          MERGE (rec)-[r:DISMISSED]->(p)
          SET r.timestamp = datetime()
        `,
          { recId: input.recommendationId, productId }
        );
      }

      for (const productId of input.userActions.purchased || []) {
        await session.run(
          `
          MATCH (rec:Recommendation {id: $recId})
          MATCH (p:Product {id: $productId})
          MERGE (rec)-[r:PURCHASED]->(p)
          SET r.timestamp = datetime()
        `,
          { recId: input.recommendationId, productId }
        );
      }
    } finally {
      await session.close();
    }
  }

  private generateGraphUpdates(input: LearningInput): GraphUpdate[] {
    const updates: GraphUpdate[] = [];

    // Update interest strengths for liked/purchased products
    if (input.userActions.liked || input.userActions.purchased) {
      const positiveProducts = [
        ...(input.userActions.liked || []),
        ...(input.userActions.purchased || []),
      ];

      for (const productId of positiveProducts) {
        updates.push({
          updateType: 'update_relationship',
          cypherQuery: `
            MATCH (p:Product {id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
            SET mi.relevance_score = mi.relevance_score * 1.1,
                mi.success_count = COALESCE(mi.success_count, 0) + 1
          `,
          params: { productId },
          reasoning: 'Strengthen interest connections for liked/purchased products',
        });
      }
    }

    // Weaken interest connections for dismissed products
    if (input.userActions.dismissed) {
      for (const productId of input.userActions.dismissed) {
        updates.push({
          updateType: 'update_relationship',
          cypherQuery: `
            MATCH (p:Product {id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
            SET mi.relevance_score = mi.relevance_score * 0.9
          `,
          params: { productId },
          reasoning: 'Weaken interest connections for dismissed products',
        });
      }
    }

    return updates;
  }

  private async applyUpdates(updates: GraphUpdate[]): Promise<number> {
    const session = this.neo4j.session();
    let applied = 0;

    try {
      for (const update of updates) {
        try {
          await session.run(update.cypherQuery, update.params);
          applied++;
        } catch (error) {
          this.log(`Failed to apply update: ${error}`);
        }
      }
    } finally {
      await session.close();
    }

    return applied;
  }

  private async identifyPatterns(input: LearningInput): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // Identify if user consistently prefers certain types
    if (input.userActions.liked && input.userActions.liked.length > 0) {
      patterns.push({
        patternType: 'user_preference',
        description: 'User showed interest in recommendations',
        confidence: input.userActions.liked.length / input.originalContext.totalRecommendations,
        examples: input.userActions.liked,
      });
    }

    // TODO: More sophisticated pattern recognition
    // - Complementary interests
    // - Preferred price ranges
    // - Vendor preferences
    // - Archetype preferences

    return patterns;
  }

  private calculateOutcomes(input: LearningInput) {
    const totalRecommendations = input.originalContext.totalRecommendations;
    const successfulRecommendations = [
      ...(input.userActions.liked || []),
      ...(input.userActions.purchased || []),
    ].length;

    // Calculate average confidence of successful recommendations
    const successfulIds = new Set([
      ...(input.userActions.liked || []),
      ...(input.userActions.purchased || []),
    ]);

    const successfulRecs = input.originalContext.recommendations.filter((rec) =>
      successfulIds.has(rec.product.id)
    );

    const avgConfidenceOfSuccessful =
      successfulRecs.length > 0
        ? successfulRecs.reduce((sum, rec) => sum + rec.confidence, 0) / successfulRecs.length
        : 0;

    return {
      successfulRecommendations,
      totalRecommendations,
      avgConfidenceOfSuccessful,
    };
  }
}
