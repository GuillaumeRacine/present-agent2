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
          MATCH (p:Product {product_id: $productId})
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
          MATCH (p:Product {product_id: $productId})
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
          MATCH (p:Product {product_id: $productId})
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
          MATCH (p:Product {product_id: $productId})
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
          MATCH (p:Product {product_id: $productId})
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
            MATCH (p:Product {product_id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
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
            MATCH (p:Product {product_id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
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

    // Basic preference pattern from current session
    if (input.userActions.liked && input.userActions.liked.length > 0) {
      patterns.push({
        patternType: 'user_preference',
        description: 'User showed interest in recommendations',
        confidence: input.originalContext.totalRecommendations > 0
          ? input.userActions.liked.length / input.originalContext.totalRecommendations
          : 0.5,
        examples: input.userActions.liked,
      });
    }

    // Advanced patterns from accumulated history (query Neo4j)
    const session = this.neo4j.session();
    try {
      // (a) Complementary interests: co-occurring interests in liked products
      const complementResult = await session.run(
        `
        MATCH (rec:Recommendation {userId: $userId})-[:LIKED|PURCHASED]->(p:Product)
        MATCH (p)-[:MATCHES_INTEREST]->(i1:Interest)
        MATCH (p)-[:MATCHES_INTEREST]->(i2:Interest)
        WHERE id(i1) < id(i2)
        WITH i1, i2, count(*) AS coOccurrence
        WHERE coOccurrence >= 2
        MERGE (i1)-[c:COMPLEMENTS]-(i2)
        ON CREATE SET c.strength = coOccurrence, c.discovered = datetime()
        ON MATCH SET c.strength = coOccurrence, c.updated = datetime()
        RETURN i1.name AS interest1, i2.name AS interest2, coOccurrence
        ORDER BY coOccurrence DESC
        LIMIT 10
        `,
        { userId: input.userId }
      );

      for (const record of complementResult.records) {
        patterns.push({
          patternType: 'complementary_interests',
          description: `Interests "${record.get('interest1')}" and "${record.get('interest2')}" appear together in liked products`,
          confidence: Math.min(1, record.get('coOccurrence') / 5),
          examples: [record.get('interest1'), record.get('interest2')],
        });
      }

      // (b) Price range patterns by relationship type
      const priceResult = await session.run(
        `
        MATCH (rec:Recommendation {userId: $userId})-[:LIKED|PURCHASED]->(p:Product)
        WHERE p.price IS NOT NULL
        RETURN avg(p.price) AS avgPrice,
               min(p.price) AS minPrice,
               max(p.price) AS maxPrice,
               count(p) AS sampleSize
        `,
        { userId: input.userId }
      );

      if (priceResult.records.length > 0) {
        const priceRecord = priceResult.records[0];
        const sampleSize = priceRecord.get('sampleSize');
        if (sampleSize > 0) {
          patterns.push({
            patternType: 'price_range',
            description: `Preferred price range: $${Math.round(priceRecord.get('minPrice'))}-$${Math.round(priceRecord.get('maxPrice'))} (avg $${Math.round(priceRecord.get('avgPrice'))})`,
            confidence: Math.min(1, sampleSize / 10),
          });
        }
      }

      // (c) Vendor preferences from successful purchases
      const vendorResult = await session.run(
        `
        MATCH (rec:Recommendation {userId: $userId})-[:LIKED|PURCHASED]->(p:Product)
        WHERE p.brand_url IS NOT NULL
        WITH p.brand_url AS vendor, count(*) AS successCount
        WHERE successCount >= 2
        RETURN vendor, successCount
        ORDER BY successCount DESC
        LIMIT 5
        `,
        { userId: input.userId }
      );

      for (const record of vendorResult.records) {
        patterns.push({
          patternType: 'vendor_preference',
          description: `Prefers vendor "${record.get('vendor')}" (${record.get('successCount')} successful recommendations)`,
          confidence: Math.min(1, record.get('successCount') / 5),
          examples: [record.get('vendor')],
        });
      }

      // (d) Category/archetype preferences
      const categoryResult = await session.run(
        `
        MATCH (rec:Recommendation {userId: $userId})-[:LIKED|PURCHASED]->(p:Product)
        MATCH (p)-[:IN_CATEGORY]->(cat:Category)
        WITH cat.name AS category, count(*) AS successCount
        WHERE successCount >= 2
        RETURN category, successCount
        ORDER BY successCount DESC
        LIMIT 5
        `,
        { userId: input.userId }
      );

      for (const record of categoryResult.records) {
        patterns.push({
          patternType: 'archetype_preference',
          description: `Successful recommendations in category "${record.get('category')}"`,
          confidence: Math.min(1, record.get('successCount') / 5),
          examples: [record.get('category')],
        });
      }
    } catch (error) {
      this.log(`Pattern identification query failed (non-critical): ${error}`);
    } finally {
      await session.close();
    }

    return patterns;
  }

  private calculateOutcomes(input: LearningInput) {
    const totalRecommendations = input.originalContext?.totalRecommendations || 0;
    const successfulRecommendations = [
      ...(input.userActions.liked || []),
      ...(input.userActions.purchased || []),
    ].length;

    // Calculate average confidence of successful recommendations
    const recommendations = input.originalContext?.recommendations || [];
    const successfulIds = new Set([
      ...(input.userActions.liked || []),
      ...(input.userActions.purchased || []),
    ]);

    const successfulRecs = recommendations.filter((rec: any) =>
      successfulIds.has(rec.product?.id) || successfulIds.has(rec.product?.product_id)
    );

    const avgConfidenceOfSuccessful =
      successfulRecs.length > 0
        ? successfulRecs.reduce((sum: number, rec: any) => sum + (rec.confidence || 0), 0) / successfulRecs.length
        : 0;

    return {
      successfulRecommendations,
      totalRecommendations,
      avgConfidenceOfSuccessful,
    };
  }
}
