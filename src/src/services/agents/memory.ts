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

    // Apply confidence decay on stale interests (best-effort, non-blocking)
    this.applyConfidenceDecay().catch((err) => {
      logger.warn('Memory: Confidence decay failed (non-blocking)', { error: err });
    });

    try {
      // Query Neo4j for past conversations and recipients in parallel
      const [pastConversations, pastRecipients, userPreferences] = await Promise.all([
        this.getPastConversations(input.userId, input.listenerOutput),
        this.getPastRecipients(input.userId),
        this.getUserPreferences(input.userId),
      ]);

      this.log(`Found ${pastConversations.length} past conversations, ${pastRecipients.length} recipients`);

      // Check for cold start scenario
      const inColdStart = this.isColdStart(pastConversations, pastRecipients);
      let coldStartContext;
      let coldStartPatterns: Array<{ pattern: string; confidence: number; source: 'past_purchases' | 'past_likes' | 'user_profile' | 'collaborative' | 'catalog_trends' | 'defaults' }> = [];

      if (inColdStart) {
        // Handle cold start with fallback chain
        const coldStartResult = await this.handleColdStart(input);
        coldStartContext = coldStartResult.coldStartContext;
        coldStartPatterns = coldStartResult.patterns;

        this.log(
          `🆕 Cold start handled via ${coldStartContext.source} ` +
          `(confidence: ${coldStartContext.confidence.toFixed(2)}, ` +
          `${coldStartPatterns.length} patterns)`
        );
      }

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

      // Recognize patterns from history (include cold start patterns)
      const recognizedPatterns = this.recognizePatterns(
        input.listenerOutput,
        pastConversations,
        pastRecipients,
        userPreferences
      );

      // Merge with cold start patterns
      const allPatterns = [...recognizedPatterns, ...coldStartPatterns];

      this.log(`Recognized ${allPatterns.length} patterns (${coldStartPatterns.length} from cold start)`);

      return {
        listenerContext: input.listenerOutput,
        pastConversations,
        pastRecipients,
        userPreferences,
        recognizedPatterns: allPatterns,
        enrichedRecipient: recipientLearning.enriched_recipient,
        recipientKnowledgeDepth: recipientLearning.confidence_level,
        recipientKnowledgeGaps: recipientLearning.knowledge_gaps,
        giverProfile: giverProfiling.giver_profile,
        giverInsights: giverProfiling.insights,
        giverConfidence: giverProfiling.confidence_level,
        coldStartContext, // Include cold start context
        recalledAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Decay confidence on interests not mentioned in 90+ days
   * Reduces noise from stale signals while keeping a floor of 0.1
   */
  private async applyConfidenceDecay(): Promise<void> {
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        MATCH (r:Recipient)-[ri:INTERESTED_IN]->(i:Interest)
        WHERE ri.last_mentioned < datetime() - duration({days: 90})
          AND ri.confidence > 0.1
        SET ri.confidence = ri.confidence * 0.9
        RETURN count(ri) AS decayed
        `
      );
      const decayed = result.records[0]?.get('decayed');
      if (decayed > 0) {
        this.log(`Decayed confidence on ${decayed} stale interest relationships`);
      }
    } finally {
      await session.close();
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
  ): Array<{ pattern: string; confidence: number; source: 'past_purchases' | 'past_likes' | 'user_profile' | 'collaborative' | 'catalog_trends' | 'defaults' }> {
    const patterns: Array<{ pattern: string; confidence: number; source: 'past_purchases' | 'past_likes' | 'user_profile' | 'collaborative' | 'catalog_trends' | 'defaults' }> = [];

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

  // ============================================================================
  // Cold Start Methods
  // ============================================================================

  /**
   * Handle cold start scenario with fallback chain:
   * 1. Collaborative filtering (similar users)
   * 2. Catalog-wide trends
   * 3. Default persona patterns
   * 4. Session-based profile
   */
  private async handleColdStart(
    input: MemoryInput
  ): Promise<{ coldStartContext: any; patterns: Array<{ pattern: string; confidence: number; source: 'past_purchases' | 'past_likes' | 'user_profile' | 'collaborative' | 'catalog_trends' | 'defaults' }> }> {
    this.log('⚠️  Cold start detected - using fallback strategies');

    const listenerOutput = input.listenerOutput;

    // Try collaborative filtering first
    const collaborativeResult = await this.tryCollaborativeFiltering(input);
    if (collaborativeResult.success) {
      this.log(`✓ Cold start resolved via collaborative filtering (${collaborativeResult.patterns.length} patterns)`);
      return {
        coldStartContext: {
          source: 'collaborative',
          confidence: collaborativeResult.confidence,
          patterns: collaborativeResult.patterns,
          explanation: 'Found similar users with matching demographics and gift scenarios',
        },
        patterns: collaborativeResult.patterns.map(p => ({
          pattern: `Similar users liked: ${p.productIds.slice(0, 3).join(', ')}`,
          confidence: collaborativeResult.confidence,
          source: 'collaborative' as const,
        })),
      };
    }

    // Fallback to catalog-wide trends
    const trendsResult = await this.getCatalogTrends(input);
    if (trendsResult.success) {
      this.log(`✓ Cold start resolved via catalog trends (${trendsResult.patterns.length} patterns)`);
      return {
        coldStartContext: {
          source: 'trends',
          confidence: trendsResult.confidence,
          patterns: trendsResult.patterns,
          explanation: 'Using popular gifts from catalog-wide trends for this scenario',
        },
        patterns: trendsResult.patterns.map(p => ({
          pattern: `Trending for ${p.relationshipType || p.occasion}: ${p.popularity} users`,
          confidence: trendsResult.confidence,
          source: 'catalog_trends' as const,
        })),
      };
    }

    // Fallback to default personas
    const defaultsResult = await this.getDefaultPersonaPatterns(input);
    this.log(`✓ Cold start resolved via default personas (${defaultsResult.patterns.length} patterns)`);

    // Build session profile for progressive learning
    const sessionProfile = this.buildSessionProfile(input);

    return {
      coldStartContext: {
        source: 'defaults',
        confidence: defaultsResult.confidence,
        patterns: defaultsResult.patterns,
        sessionProfile,
        explanation: 'Using default patterns for this gift scenario, building profile from session',
      },
      patterns: defaultsResult.patterns.map(p => ({
        pattern: `Default pattern: ${p.archetypes?.join(', ') || 'general gifts'} for ${p.relationshipType || 'recipients'}`,
        confidence: defaultsResult.confidence,
        source: 'defaults' as const,
      })),
    };
  }

  /**
   * Try collaborative filtering with similar users
   */
  private async tryCollaborativeFiltering(input: MemoryInput): Promise<{
    success: boolean;
    confidence: number;
    patterns: any[];
  }> {
    const session = this.neo4j.session();

    try {
      const listenerOutput = input.listenerOutput;
      const relationshipType = listenerOutput.recipient?.relationshipType;
      const occasion = listenerOutput.occasion?.name;
      const recipientAge = listenerOutput.recipient?.age;
      const recipientGender = listenerOutput.recipient?.gender;

      // Find products previously recommended to similar users.
      // Use existing Conversation/Recommendation model to avoid schema mismatches.
      const cypher = `
        MATCH (otherUser:User)-[:HAD_CONVERSATION]->(conv:Conversation)-[:INCLUDES_RECOMMENDATION]->(rec:Recommendation)-[:RECOMMENDS_PRODUCT]->(p:Product)
        WHERE otherUser.userId <> $userId
        ${relationshipType ? 'AND rec.relationship_type = $relationshipType' : ''}
        ${occasion ? 'AND rec.occasion = $occasion' : ''}

        WITH p, COUNT(DISTINCT otherUser) AS popularity
        WHERE popularity >= 2

        RETURN p.product_id AS productId,
               popularity AS popularity
        ORDER BY popularity DESC
        LIMIT 20
      `;

      const result = await session.run(cypher, {
        userId: input.userId,
        relationshipType: relationshipType || null,
        occasion: occasion || null,
        minAge: recipientAge ? recipientAge - 5 : null,
        maxAge: recipientAge ? recipientAge + 5 : null,
        recipientGender: recipientGender || null,
      });

      if (result.records.length === 0) {
        return { success: false, confidence: 0, patterns: [] };
      }

      // Convert to patterns
      const patterns = [{
        productIds: result.records.map(r => r.get('productId')),
        relationshipType,
        occasion,
        avgRating: result.records.reduce((sum, r) => sum + r.get('rating'), 0) / result.records.length,
        popularity: result.records.reduce((sum, r) => sum + r.get('popularity'), 0),
      }];

      // Confidence based on number of matches and specificity
      let confidence = 0.6; // Base for collaborative filtering
      if (relationshipType) confidence += 0.1;
      if (occasion) confidence += 0.1;
      if (recipientAge || recipientGender) confidence += 0.1;
      if (result.records.length >= 10) confidence += 0.05;

      return {
        success: true,
        confidence: Math.min(0.85, confidence),
        patterns,
      };
    } catch (error) {
      logger.warn('Collaborative filtering failed', { error });
      return { success: false, confidence: 0, patterns: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Get catalog-wide trends
   */
  private async getCatalogTrends(input: MemoryInput): Promise<{
    success: boolean;
    confidence: number;
    patterns: any[];
  }> {
    const session = this.neo4j.session();

    try {
      const listenerOutput = input.listenerOutput;
      const relationshipType = listenerOutput.recipient?.relationshipType;
      const occasion = listenerOutput.occasion?.name;

      // Get trending/popular products for this scenario
      const cypher = `
        MATCH (gift:Gift)-[:IS_PRODUCT]->(p:Product)
        WHERE gift.timestamp > datetime() - duration({days: 90})
        ${relationshipType ? 'AND gift.relationship_type = $relationshipType' : ''}
        ${occasion ? 'AND gift.occasion = $occasion' : ''}

        WITH p,
             COUNT(*) as gift_count,
             AVG(COALESCE(gift.rating, 3.5)) as avg_rating,
             SUM(CASE WHEN gift.was_purchased THEN 1 ELSE 0 END) as purchase_count
        WHERE gift_count >= 3

        // Calculate trend score
        WITH p, gift_count, avg_rating, purchase_count,
             (gift_count * 0.4 + avg_rating * 0.3 + purchase_count * 0.3) as trend_score

        ORDER BY trend_score DESC
        LIMIT 15

        RETURN p.id as productId,
               gift_count as popularity,
               avg_rating as rating
      `;

      const result = await session.run(cypher, {
        relationshipType: relationshipType || null,
        occasion: occasion || null,
      });

      if (result.records.length === 0) {
        return { success: false, confidence: 0, patterns: [] };
      }

      const patterns = [{
        productIds: result.records.map(r => r.get('productId')),
        relationshipType,
        occasion,
        avgRating: result.records.reduce((sum, r) => sum + r.get('rating'), 0) / result.records.length,
        popularity: result.records.reduce((sum, r) => sum + r.get('popularity'), 0),
      }];

      // Confidence based on trend specificity
      let confidence = 0.5; // Base for trends
      if (relationshipType && occasion) confidence += 0.15;
      else if (relationshipType || occasion) confidence += 0.1;
      if (result.records.length >= 10) confidence += 0.05;

      return {
        success: true,
        confidence: Math.min(0.7, confidence),
        patterns,
      };
    } catch (error) {
      logger.warn('Catalog trends query failed', { error });
      return { success: false, confidence: 0, patterns: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Get default persona patterns for common scenarios
   */
  private async getDefaultPersonaPatterns(input: MemoryInput): Promise<{
    confidence: number;
    patterns: any[];
  }> {
    const session = this.neo4j.session();

    try {
      const listenerOutput = input.listenerOutput;
      const interests = listenerOutput.interests || [];
      const relationshipType = listenerOutput.recipient?.relationshipType;

      // Fallback to interest-based products with high ratings
      const cypher = `
        MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
        WHERE i.name IN $interests

        // Get products with good ratings (from past gifts)
        OPTIONAL MATCH (gift:Gift)-[:IS_PRODUCT]->(p)
        WITH p, i, AVG(COALESCE(gift.rating, 4.0)) as avg_rating, COUNT(gift) as gift_count

        // Prioritize products with some history
        ORDER BY (gift_count > 0) DESC, avg_rating DESC, gift_count DESC
        LIMIT 12

        RETURN p.id as productId,
               COLLECT(DISTINCT i.name) as interests,
               avg_rating as rating
      `;

      const result = await session.run(cypher, {
        interests: interests.length > 0 ? interests : ['general', 'gift'],
      });

      if (result.records.length === 0) {
        // Ultimate fallback - just get highly rated products
        const fallbackCypher = `
          MATCH (gift:Gift)-[:IS_PRODUCT]->(p:Product)
          WITH p, AVG(gift.rating) as avg_rating, COUNT(*) as count
          WHERE avg_rating >= 4.0 AND count >= 5
          ORDER BY avg_rating DESC, count DESC
          LIMIT 10
          RETURN p.id as productId, avg_rating as rating
        `;

        const fallbackResult = await session.run(fallbackCypher);

        return {
          confidence: 0.3,
          patterns: [{
            productIds: fallbackResult.records.map(r => r.get('productId')),
            archetypes: ['general'],
            avgRating: 4.0,
          }],
        };
      }

      const patterns = [{
        productIds: result.records.map(r => r.get('productId')),
        relationshipType,
        archetypes: interests,
        avgRating: result.records.reduce((sum, r) => sum + r.get('rating'), 0) / result.records.length,
      }];

      return {
        confidence: interests.length > 0 ? 0.45 : 0.3,
        patterns,
      };
    } catch (error) {
      logger.error('Default persona patterns failed', { error });
      // Return empty patterns rather than failing
      return {
        confidence: 0.2,
        patterns: [{
          productIds: [],
          archetypes: ['general'],
        }],
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Build session-based profile for progressive learning
   */
  private buildSessionProfile(input: MemoryInput): any {
    const listenerOutput = input.listenerOutput;

    return {
      sessionId: input.sessionId,
      interests: listenerOutput.interests || [],
      values: listenerOutput.values || [],
      recipientContext: {
        name: listenerOutput.recipient?.name,
        relationshipType: listenerOutput.recipient?.relationshipType,
        age: listenerOutput.recipient?.age,
        gender: listenerOutput.recipient?.gender,
      },
      budget: listenerOutput.budget ? {
        min: listenerOutput.budget.min,
        max: listenerOutput.budget.max,
      } : undefined,
      occasion: listenerOutput.occasion?.name,
      confidence: listenerOutput.confidence || 0.6,
      timestamp: new Date(),
    };
  }

  /**
   * Check if user is in cold start scenario
   */
  private isColdStart(pastConversations: any[], pastRecipients: any[]): boolean {
    // Cold start if:
    // - No past conversations, OR
    // - No past recipients, OR
    // - Very limited history (< 2 conversations)
    return (
      pastConversations.length === 0 ||
      pastRecipients.length === 0 ||
      pastConversations.length < 2
    );
  }
}
