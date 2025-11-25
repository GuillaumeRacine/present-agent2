/**
 * Memory Agent
 *
 * Recalls relevant history and patterns from past conversations:
 * - Past conversations with context extraction
 * - Past recipients with gift history and outcomes
 * - User preferences and established patterns
 * - Pattern recognition (interests, budgets, timing)
 */

import { BaseAgent } from './base.js';
import { MemoryInput, MemoryOutput, ListenerOutput } from '../../types/agents.js';
import { Driver } from 'neo4j-driver';
import { logger } from '../../lib/logger.js';
import { RecipientLearner } from './recipient-learner.js';
import { GiverProfiler } from './giver-profiler.js';

export class MemoryAgent extends BaseAgent<MemoryInput, MemoryOutput> {
  name = 'Memory';
  private recipientLearner: RecipientLearner;
  private giverProfiler: GiverProfiler;

  constructor(private neo4j: Driver) {
    super();
    this.recipientLearner = new RecipientLearner(neo4j);
    this.giverProfiler = new GiverProfiler(neo4j);
  }

  async process(input: MemoryInput): Promise<MemoryOutput> {
    this.log('Recalling user history');

    try {
      // Query Neo4j for past conversations and recipients in parallel
      const [pastConversations, pastRecipients, userPreferences] = await Promise.all([
        this.getPastConversations(input.userId, input.listenerOutput),
        this.getPastRecipients(input.userId),
        this.getUserPreferences(input.userId),
      ]);

      this.log(`Found ${pastConversations.length} past conversations, ${pastRecipients.length} recipients`);

      // Build deep recipient profile using sub-agent
      const recipientLearning = await this.recipientLearner.process({
        userId: input.userId,
        recipientName: input.listenerOutput.recipient?.name,
        currentQuery: input.listenerOutput.userQuery || '',
        listenerContext: input.listenerOutput,
        pastRecipients,
      });

      if (recipientLearning.enriched_recipient) {
        this.log(
          `📚 Enriched recipient profile: ${recipientLearning.enriched_recipient.interests.length} interests, ` +
          `${recipientLearning.enriched_recipient.values.length} values, ` +
          `knowledge depth: ${recipientLearning.confidence_level.toFixed(2)}`
        );
      }

      // NEW: Build giver profile using sub-agent
      const giverProfiling = await this.giverProfiler.process({
        userId: input.userId,
        currentQuery: input.listenerOutput.userQuery || '',
        listenerContext: input.listenerOutput,
        pastConversations,
        pastRecipients,
      });

      this.log(
        `🎁 Built giver profile: ${giverProfiling.giver_profile.shoppingStyle.typical_timing} shopper, ` +
        `${giverProfiling.giver_profile.givingPhilosophy.primary_values.join('/')} values, ` +
        `data quality: ${giverProfiling.confidence_level.toFixed(2)}`
      );

      // Recognize patterns from history
      const recognizedPatterns = this.recognizePatterns(
        input.listenerOutput,
        pastConversations,
        pastRecipients,
        userPreferences
      );

      this.log(`Recognized ${recognizedPatterns.length} patterns`);

      return {
        listenerContext: input.listenerOutput,
        pastConversations,
        pastRecipients,
        userPreferences,
        recognizedPatterns,
        enrichedRecipient: recipientLearning.enriched_recipient,
        recipientKnowledgeDepth: recipientLearning.confidence_level,
        recipientKnowledgeGaps: recipientLearning.knowledge_gaps,
        giverProfile: giverProfiling.giver_profile,
        giverInsights: giverProfiling.insights,
        giverConfidence: giverProfiling.confidence_level,
        recalledAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Query past conversations relevant to current context
   */
  private async getPastConversations(userId: string, listenerOutput: ListenerOutput) {
    const session = this.neo4j.session();

    try {
      const recipientName = listenerOutput.recipient?.name;
      const occasion = listenerOutput.occasion?.name;

      const cypher = `
        MATCH (u:User {id: $userId})-[:PARTICIPATED_IN]->(ct:ConversationTurn)
        WHERE ct.timestamp > datetime() - duration({months: 12})
          AND ($recipientName IS NULL OR ct.message CONTAINS $recipientName OR $recipientName IN ct.mentioned_recipients)
        ORDER BY ct.timestamp DESC
        LIMIT 20
        RETURN ct {
          .id,
          .timestamp,
          .message,
          .mentioned_interests,
          .mentioned_values,
          .mentioned_recipients
        } AS conversation
      `;

      const result = await session.run(cypher, {
        userId,
        recipientName: recipientName || null,
      });

      return result.records.map((record) => {
        const conv = record.get('conversation');
        const timestamp = conv.timestamp;
        const daysSince = this.daysBetween(new Date(timestamp), new Date());

        return {
          sessionId: conv.id,
          timestamp: new Date(timestamp),
          query: conv.message,
          recipientName: conv.mentioned_recipients?.[0],
          occasion: undefined, // Not stored in this simplified schema
          recommendationsGiven: 0, // Would need to query Recommendations
          outcomeKnown: false,
          outcome: undefined,
        };
      });
    } catch (error) {
      logger.error('Failed to query past conversations', { userId, error });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Query past recipients with gift history
   */
  private async getPastRecipients(userId: string) {
    const session = this.neo4j.session();

    try {
      const cypher = `
        MATCH (u:User {id: $userId})-[rel:HAS_RELATIONSHIP]->(r:Recipient)

        // Get recipient's interests
        OPTIONAL MATCH (r)-[ri:INTERESTED_IN]->(i:Interest)
        WITH u, r, rel, COLLECT(DISTINCT {name: i.name, strength: ri.strength}) AS interests

        // Get recipient's values
        OPTIONAL MATCH (r)-[rv:VALUES]->(v:Value)
        WITH u, r, rel, interests, COLLECT(DISTINCT {name: v.name, importance: rv.importance}) AS values

        // Get past recommendations for this recipient
        OPTIONAL MATCH (rec:Recommendation)
        WHERE rec.user_id = $userId AND rec.recipient_id = r.id
        OPTIONAL MATCH (rec)-[:RECOMMENDED]->(p:Product)
        WITH r, rel, interests, values,
          COLLECT({
            product_id: p.id,
            product_title: p.title,
            occasion: rec.occasion,
            timestamp: rec.timestamp,
            outcome: CASE
              WHEN rec.was_purchased THEN 'purchased'
              WHEN rec.was_liked THEN 'liked'
              ELSE 'neutral'
            END,
            feedback: rec.feedback
          }) AS gift_history

        // Calculate typical budget from past gifts
        WITH r, rel, interests, values, gift_history,
          REDUCE(sum = 0.0, gh IN gift_history | sum + COALESCE(gh.price, 0)) / SIZE(gift_history) AS typical_budget

        RETURN r {
          .id,
          .name,
          .age,
          .gender
        } AS recipient,
        rel {
          .relationship_type,
          .closeness,
          .years_known
        } AS relationship,
        interests,
        values,
        gift_history,
        typical_budget
      `;

      const result = await session.run(cypher, { userId });

      return result.records.map((record) => {
        const recipient = record.get('recipient');
        const relationship = record.get('relationship');
        const interests = record.get('interests');
        const values = record.get('values');
        const gift_history = record.get('gift_history');
        const typical_budget = record.get('typical_budget');

        // Extract successful patterns
        const successfulGifts = gift_history.filter(
          (gh: any) => gh.outcome === 'purchased' || gh.outcome === 'liked'
        );
        const successfulPatterns = this.extractSuccessPatterns(successfulGifts);

        return {
          recipientId: recipient.id,
          name: recipient.name,
          relationshipType: relationship.relationship_type,
          giftsGivenCount: gift_history.length,
          successfulGifts: successfulGifts.map((gh: any) => gh.product_id),
          knownInterests: interests.map((i: any) => i.name),
        };
      });
    } catch (error) {
      logger.warn('Failed to query past recipients, continuing without history', {
        userId,
        error,
        fallback: 'empty array'
      });
      return []; // Graceful fallback - system can continue without history
    } finally {
      await session.close();
    }
  }

  /**
   * Query user preferences and patterns
   */
  private async getUserPreferences(userId: string) {
    const session = this.neo4j.session();

    try {
      const cypher = `
        MATCH (u:User {id: $userId})

        // Get user's interests
        OPTIONAL MATCH (u)-[hi:HAS_INTEREST]->(i:Interest)
        WITH u, COLLECT(DISTINCT {name: i.name, strength: hi.strength}) AS interests

        // Get user's values
        OPTIONAL MATCH (u)-[hv:VALUES]->(v:Value)
        WITH u, interests, COLLECT(DISTINCT {name: v.name, importance: hv.importance}) AS values

        RETURN u {
          .id,
          .email,
          .name,
          .profile_embedding,
          .value_embedding
        } AS user,
        interests,
        values
      `;

      const result = await session.run(cypher, { userId });

      if (result.records.length === 0) {
        return undefined;
      }

      const record = result.records[0];
      const user = record.get('user');
      const interests = record.get('interests');
      const values = record.get('values');

      return {
        typicalBudgetRange: undefined,
        preferredVendors: undefined,
        avoidedCategories: undefined,
        valueAlignment: undefined,
      };
    } catch (error) {
      logger.warn('Failed to query user preferences, continuing without preferences', {
        userId,
        error,
        fallback: 'undefined'
      });
      return undefined; // Graceful fallback - system can continue without preferences
    } finally {
      await session.close();
    }
  }

  /**
   * Recognize patterns from history
   */
  private recognizePatterns(
    listenerOutput: ListenerOutput,
    pastConversations: any[],
    pastRecipients: any[],
    userPreferences: any
  ): Array<{ pattern: string; confidence: number; source: string }> {
    const patterns: Array<{ pattern: string; confidence: number; source: string }> = [];

    // 1. Established interests (mentioned 3+ times)
    const interestMentions = new Map<string, number>();
    pastConversations.forEach((conv) => {
      conv.mentioned_interests?.forEach((interest: string) => {
        interestMentions.set(interest, (interestMentions.get(interest) || 0) + 1);
      });
    });

    interestMentions.forEach((count, interest) => {
      if (count >= 3) {
        patterns.push({
          pattern: `Established interest in ${interest}`,
          confidence: Math.min(0.95, 0.6 + count * 0.1),
          source: 'user_profile' as const,
        });
      }
    });

    // 2. Evolving interests (mentioned 1-2 times recently)
    const recentConvs = pastConversations.slice(0, 5);
    const recentInterests = new Map<string, number>();
    recentConvs.forEach((conv) => {
      conv.mentioned_interests?.forEach((interest: string) => {
        recentInterests.set(interest, (recentInterests.get(interest) || 0) + 1);
      });
    });

    recentInterests.forEach((count, interest) => {
      if (count <= 2 && !interestMentions.has(interest)) {
        patterns.push({
          pattern: `Evolving interest in ${interest}`,
          confidence: 0.6,
          source: 'user_profile' as const,
        });
      }
    });

    // 3. Budget patterns per relationship type
    const budgetByRelationship = new Map<string, number[]>();
    pastRecipients.forEach((recipient) => {
      const relationshipType = recipient.relationshipType;
      if (relationshipType) {
        // Note: typical_budget logic would need to be restored if needed
        // Currently removed due to schema mismatch
      }
    });

    budgetByRelationship.forEach((budgets, relationshipType) => {
      const avgBudget = budgets.reduce((sum, b) => sum + b, 0) / budgets.length;
      patterns.push({
        pattern: `Typical budget for ${relationshipType}: $${avgBudget.toFixed(0)}`,
        confidence: 0.8,
        source: 'past_purchases' as const,
      });
    });

    // 4. Repeat recipients
    const currentRecipient = listenerOutput.recipient?.name;
    if (currentRecipient) {
      const pastGifts = pastRecipients.find(
        (r) => r.name?.toLowerCase() === currentRecipient.toLowerCase()
      );
      if (pastGifts && pastGifts.giftsGivenCount > 0) {
        patterns.push({
          pattern: `Previously gifted ${currentRecipient} ${pastGifts.giftsGivenCount} times`,
          confidence: 0.9,
          source: 'past_purchases' as const,
        });
      }
    }

    // 5. User profile patterns
    if (userPreferences) {
      patterns.push({
        pattern: 'User prefers thoughtful gifts',
        confidence: 0.75,
        source: 'user_profile' as const,
      });
    }

    return patterns;
  }

  /**
   * Extract successful patterns from gift history
   */
  private extractSuccessPatterns(successfulGifts: any[]): string[] {
    const patterns: string[] = [];

    // Look for common themes
    const productTitles = successfulGifts.map((g) => g.product_title).filter(Boolean);

    if (productTitles.length > 0) {
      // Extract common keywords
      const keywords = new Map<string, number>();
      productTitles.forEach((title: string) => {
        const words = title.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 4) {
            // Ignore short words
            keywords.set(word, (keywords.get(word) || 0) + 1);
          }
        });
      });

      // Get top keywords
      const topKeywords = Array.from(keywords.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword]) => keyword);

      topKeywords.forEach((keyword) => {
        patterns.push(keyword);
      });
    }

    return patterns;
  }

  /**
   * Calculate confidence based on recency
   */
  private calculateRecencyConfidence(daysSince: number): number {
    // High confidence for recent (<90 days)
    if (daysSince < 90) return 0.9;
    // Medium confidence for 3-6 months
    if (daysSince < 180) return 0.7;
    // Low confidence for 6-12 months
    if (daysSince < 365) return 0.5;
    // Very low confidence for >1 year
    return 0.3;
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
