/**
 * Giver Profiler Sub-Agent
 *
 * Builds comprehensive giver profile to understand shopping style,
 * giving philosophy, and personalization preferences.
 *
 * Runs as part of Memory agent to enrich giver understanding.
 */

import { BaseAgent } from './base.js';
import { Driver } from 'neo4j-driver';
import { logger } from '../../lib/logger.js';
import type {
  GiverProfile,
  GiverShoppingStyle,
  GivingPhilosophy,
  GiverPreferences,
  GiverSuccessPatterns,
  GiverLearningUpdate,
  GiverInsight,
  BudgetRange,
} from '../../types/giver.js';

export interface GiverProfilerInput {
  userId: string;
  currentQuery: string;
  listenerContext: any;
  pastConversations: any[];
  pastRecipients: any[];
}

export interface GiverProfilerOutput {
  giver_profile: GiverProfile;
  learning_updates: GiverLearningUpdate[];
  insights: GiverInsight[];
  confidence_level: number;
}

/**
 * Sub-agent that builds and maintains deep giver knowledge
 */
export class GiverProfiler extends BaseAgent<GiverProfilerInput, GiverProfilerOutput> {
  name = 'GiverProfiler';

  constructor(private neo4j: Driver) {
    super();
  }

  async process(input: GiverProfilerInput): Promise<GiverProfilerOutput> {
    this.log('Building comprehensive giver profile');

    try {
      // Analyze shopping style from past conversations
      const shoppingStyle = this.analyzeShoppingStyle(
        input.pastConversations,
        input.listenerContext
      );

      // Analyze giving philosophy from patterns
      const givingPhilosophy = this.analyzeGivingPhilosophy(
        input.pastConversations,
        input.pastRecipients,
        input.listenerContext
      );

      // Extract preferences from history (async — queries Neo4j)
      const preferences = await this.extractPreferences(
        input.pastConversations,
        input.pastRecipients
      );

      // Identify success patterns (async — queries Neo4j)
      const successPatterns = await this.identifySuccessPatterns(input.pastRecipients);

      // Calculate confidence
      const confidence = this.calculateConfidence(
        input.pastConversations,
        input.pastRecipients
      );

      const giverProfile: GiverProfile = {
        userId: input.userId,
        shoppingStyle,
        givingPhilosophy,
        preferences,
        successPatterns,
        confidence,
      };

      // Generate insights
      const insights = this.generateInsights(giverProfile);

      // Identify learning updates
      const learning_updates = this.identifyLearningUpdates(giverProfile, input);

      this.log(
        `Giver profile built: ${shoppingStyle.typical_timing} shopper, ` +
        `${givingPhilosophy.sentimentality_score.toFixed(2)} sentimentality, ` +
        `${confidence.data_quality.toFixed(2)} data quality`
      );

      // Persist giver profile to User node (async, best-effort)
      this.saveGiverProfile(input.userId, giverProfile).catch((err) => {
        logger.warn('GiverProfiler: Failed to save profile (non-blocking)', { error: err });
      });

      return {
        giver_profile: giverProfile,
        learning_updates,
        insights,
        confidence_level: confidence.data_quality,
      };
    } catch (error) {
      logger.error('GiverProfiler failed', { error });
      // Return minimal profile on error
      return {
        giver_profile: this.getMinimalProfile(input.userId),
        learning_updates: [],
        insights: [],
        confidence_level: 0,
      };
    }
  }

  /**
   * Analyze shopping style from past behavior
   */
  private analyzeShoppingStyle(
    pastConversations: any[],
    listenerContext: any
  ): GiverShoppingStyle {
    // Analyze timing patterns
    const timing = this.analyzeTimingPattern(pastConversations, listenerContext);

    // Analyze budget patterns
    const budget_patterns = this.analyzeBudgetPatterns(pastConversations);

    // Determine price sensitivity
    const price_sensitivity = this.determinePriceSensitivity(pastConversations);

    return {
      typical_timing: timing.pattern,
      timing_confidence: timing.confidence,
      budget_patterns,
      price_sensitivity: price_sensitivity.level,
      price_sensitivity_confidence: price_sensitivity.confidence,
    };
  }

  /**
   * Analyze timing pattern (last-minute vs. planned)
   */
  private analyzeTimingPattern(pastConversations: any[], listenerContext: any) {
    // Check for urgency keywords in current query
    const currentQuery = listenerContext.userQuery || '';
    const urgencyKeywords = ['quick', 'urgent', 'last-minute', 'asap', 'soon', 'need now'];
    const plannedKeywords = ['planning', 'advance', 'looking ahead', 'next month'];

    const hasUrgency = urgencyKeywords.some((kw) =>
      currentQuery.toLowerCase().includes(kw)
    );
    const hasPlanning = plannedKeywords.some((kw) =>
      currentQuery.toLowerCase().includes(kw)
    );

    // Analyze occasion timing from past conversations
    const occasionLeadTimes: number[] = [];
    pastConversations.forEach((conv) => {
      const occasion = listenerContext.occasion;
      if (occasion?.date) {
        const convDate = new Date(conv.timestamp);
        const occasionDate = new Date(occasion.date);
        const daysBefore = Math.floor(
          (occasionDate.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysBefore >= 0) {
          occasionLeadTimes.push(daysBefore);
        }
      }
    });

    // Determine pattern
    let pattern: GiverShoppingStyle['typical_timing'] = 'unknown';
    let confidence = 0.3;

    if (occasionLeadTimes.length >= 3) {
      const avgLeadTime =
        occasionLeadTimes.reduce((sum, d) => sum + d, 0) / occasionLeadTimes.length;

      if (avgLeadTime < 3) {
        pattern = 'last-minute';
      } else if (avgLeadTime < 10) {
        pattern = 'week-before';
      } else if (avgLeadTime < 30) {
        pattern = 'planned';
      } else {
        pattern = 'month-ahead';
      }
      confidence = 0.8;
    } else if (hasUrgency) {
      pattern = 'last-minute';
      confidence = 0.6;
    } else if (hasPlanning) {
      pattern = 'planned';
      confidence = 0.6;
    }

    return { pattern, confidence };
  }

  /**
   * Analyze budget patterns by occasion and relationship
   */
  private analyzeBudgetPatterns(pastConversations: any[]) {
    const by_occasion = new Map<string, BudgetRange>();
    const by_relationship = new Map<string, BudgetRange>();

    // Extract budget from past conversations
    const budgets: Array<{ amount: number; occasion?: string; relationship?: string }> = [];

    pastConversations.forEach((conv) => {
      // Try to extract budget from query
      const query = conv.query || '';
      const budgetMatch = query.match(/\$(\d+)/);
      const rangeMatch = query.match(/\$(\d+)\s*-\s*\$(\d+)/);
      const underMatch = query.match(/under\s+\$(\d+)/i);

      let amount: number | undefined;
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        amount = (min + max) / 2;
      } else if (underMatch) {
        amount = parseInt(underMatch[1]) * 0.75; // Assume 75% of max
      } else if (budgetMatch) {
        amount = parseInt(budgetMatch[1]);
      }

      if (amount) {
        budgets.push({
          amount,
          occasion: conv.occasion,
          relationship: conv.recipientName,
        });
      }
    });

    // Calculate overall range
    const overall_range: BudgetRange = budgets.length > 0
      ? {
          min: Math.min(...budgets.map((b) => b.amount)),
          max: Math.max(...budgets.map((b) => b.amount)),
          avg: budgets.reduce((sum, b) => sum + b.amount, 0) / budgets.length,
          sample_size: budgets.length,
        }
      : { min: 0, max: 1000, avg: 100, sample_size: 0 };

    return {
      by_occasion,
      by_relationship,
      overall_range,
    };
  }

  /**
   * Determine price sensitivity
   */
  private determinePriceSensitivity(pastConversations: any[]) {
    // Look for budget-related keywords
    const budgetKeywords = {
      'budget-conscious': ['budget', 'affordable', 'cheap', 'inexpensive', 'under'],
      'value-focused': ['value', 'quality', 'worth', 'reasonable'],
      'flexible': ['flexible', 'around', 'approximately'],
      'luxury-oriented': ['luxury', 'premium', 'high-end', 'best', 'finest'],
    };

    const scores = {
      'budget-conscious': 0,
      'value-focused': 0,
      flexible: 0,
      'luxury-oriented': 0,
    };

    pastConversations.forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      Object.entries(budgetKeywords).forEach(([level, keywords]) => {
        keywords.forEach((kw) => {
          if (query.includes(kw)) {
            scores[level as keyof typeof scores]++;
          }
        });
      });
    });

    // Determine highest scoring level
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return { level: 'unknown' as const, confidence: 0.3 };
    }

    const level = Object.keys(scores).find(
      (k) => scores[k as keyof typeof scores] === maxScore
    ) as keyof typeof scores;

    const confidence = Math.min(0.9, 0.5 + maxScore * 0.1);

    return { level, confidence };
  }

  /**
   * Analyze giving philosophy from patterns
   */
  private analyzeGivingPhilosophy(
    pastConversations: any[],
    pastRecipients: any[],
    listenerContext: any
  ): GivingPhilosophy {
    // Extract values from queries
    const primary_values = this.extractGivingValues(pastConversations, listenerContext);

    // Analyze personalization importance
    const personalization_importance = this.analyzePersonalizationImportance(
      pastConversations,
      listenerContext
    );

    // Analyze sentimentality vs. practicality
    const sentimentality_score = this.analyzeSentimentality(
      pastConversations,
      listenerContext
    );

    // Determine risk tolerance
    const risk_tolerance = this.determineRiskTolerance(pastConversations);

    // Analyze gift type preferences
    const gift_type_preferences = this.analyzeGiftTypePreferences(
      pastConversations,
      listenerContext
    );

    // Extract important attributes
    const important_attributes = this.extractImportantAttributes(
      pastConversations,
      listenerContext
    );

    return {
      primary_values,
      personalization_importance,
      sentimentality_score,
      risk_tolerance,
      gift_type_preferences,
      important_attributes,
    };
  }

  /**
   * Extract giving values from conversations
   */
  private extractGivingValues(pastConversations: any[], listenerContext: any): string[] {
    const valueKeywords = new Map<string, number>();

    const values = [
      'thoughtful',
      'practical',
      'experiential',
      'sentimental',
      'meaningful',
      'unique',
      'quality',
      'personalized',
      'memorable',
      'useful',
    ];

    // Current query
    const currentQuery = (listenerContext.userQuery || '').toLowerCase();
    values.forEach((value) => {
      if (currentQuery.includes(value)) {
        valueKeywords.set(value, (valueKeywords.get(value) || 0) + 2);
      }
    });

    // Past conversations
    pastConversations.forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      values.forEach((value) => {
        if (query.includes(value)) {
          valueKeywords.set(value, (valueKeywords.get(value) || 0) + 1);
        }
      });
    });

    // Return top 3 values
    return Array.from(valueKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value]) => value);
  }

  /**
   * Analyze personalization importance
   */
  private analyzePersonalizationImportance(
    pastConversations: any[],
    listenerContext: any
  ): number {
    const personalKeywords = [
      'personal',
      'personalized',
      'custom',
      'unique',
      'special',
      'meaningful',
      'just for',
    ];

    let score = 0;
    const currentQuery = (listenerContext.userQuery || '').toLowerCase();
    personalKeywords.forEach((kw) => {
      if (currentQuery.includes(kw)) score += 0.2;
    });

    pastConversations.slice(0, 10).forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      personalKeywords.forEach((kw) => {
        if (query.includes(kw)) score += 0.05;
      });
    });

    return Math.min(1.0, score);
  }

  /**
   * Analyze sentimentality score
   */
  private analyzeSentimentality(
    pastConversations: any[],
    listenerContext: any
  ): number {
    const sentimentalKeywords = [
      'sentimental',
      'meaningful',
      'memory',
      'remember',
      'special',
      'heartfelt',
      'emotional',
    ];
    const practicalKeywords = [
      'practical',
      'useful',
      'functional',
      'everyday',
      'needs',
      'use',
    ];

    let sentimentalScore = 0;
    let practicalScore = 0;

    const currentQuery = (listenerContext.userQuery || '').toLowerCase();
    sentimentalKeywords.forEach((kw) => {
      if (currentQuery.includes(kw)) sentimentalScore += 0.15;
    });
    practicalKeywords.forEach((kw) => {
      if (currentQuery.includes(kw)) practicalScore += 0.15;
    });

    pastConversations.slice(0, 10).forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      sentimentalKeywords.forEach((kw) => {
        if (query.includes(kw)) sentimentalScore += 0.05;
      });
      practicalKeywords.forEach((kw) => {
        if (query.includes(kw)) practicalScore += 0.05;
      });
    });

    // Normalize to 0-1 scale (0 = practical, 1 = sentimental)
    const totalScore = sentimentalScore + practicalScore;
    if (totalScore === 0) return 0.5; // Default: balanced

    return sentimentalScore / totalScore;
  }

  /**
   * Determine risk tolerance
   */
  private determineRiskTolerance(pastConversations: any[]): GivingPhilosophy['risk_tolerance'] {
    // Look for safe/traditional vs. unique/adventurous keywords
    const conservativeKeywords = ['safe', 'traditional', 'classic', 'reliable', 'standard'];
    const adventurousKeywords = ['unique', 'unusual', 'different', 'adventurous', 'bold'];

    let conservativeScore = 0;
    let adventurousScore = 0;

    pastConversations.forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      conservativeKeywords.forEach((kw) => {
        if (query.includes(kw)) conservativeScore++;
      });
      adventurousKeywords.forEach((kw) => {
        if (query.includes(kw)) adventurousScore++;
      });
    });

    if (conservativeScore > adventurousScore * 2) return 'conservative';
    if (adventurousScore > conservativeScore * 2) return 'adventurous';
    return 'moderate';
  }

  /**
   * Analyze gift type preferences
   */
  private analyzeGiftTypePreferences(
    pastConversations: any[],
    listenerContext: any
  ) {
    const typeScores = {
      physical: 0.5,
      experiential: 0.5,
      consumable: 0.5,
      digital: 0.5,
    };

    const currentQuery = (listenerContext.userQuery || '').toLowerCase();
    if (/experience|activity|class|workshop|trip|event/.test(currentQuery)) {
      typeScores.experiential += 0.3;
    }
    if (/food|coffee|tea|wine|gift card|subscription/.test(currentQuery)) {
      typeScores.consumable += 0.3;
    }
    if (/app|software|digital|ebook|music/.test(currentQuery)) {
      typeScores.digital += 0.3;
    }

    return typeScores;
  }

  /**
   * Extract important attributes
   */
  private extractImportantAttributes(
    pastConversations: any[],
    listenerContext: any
  ): string[] {
    const attributes = new Map<string, number>();

    const commonAttributes = [
      'eco-friendly',
      'sustainable',
      'handmade',
      'local',
      'organic',
      'fair-trade',
      'vintage',
      'modern',
      'minimalist',
      'luxury',
    ];

    const currentQuery = (listenerContext.userQuery || '').toLowerCase();
    commonAttributes.forEach((attr) => {
      if (currentQuery.includes(attr)) {
        attributes.set(attr, (attributes.get(attr) || 0) + 2);
      }
    });

    pastConversations.forEach((conv) => {
      const query = (conv.query || '').toLowerCase();
      commonAttributes.forEach((attr) => {
        if (query.includes(attr)) {
          attributes.set(attr, (attributes.get(attr) || 0) + 1);
        }
      });
    });

    return Array.from(attributes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([attr]) => attr);
  }

  /**
   * Extract preferences from history — queries Neo4j for past feedback patterns
   */
  private async extractPreferences(
    pastConversations: any[],
    pastRecipients: any[]
  ): Promise<GiverPreferences> {
    const session = this.neo4j.session();

    try {
      // Query products user liked/purchased to find vendor and category frequency
      const result = await session.run(
        `
        MATCH (rec:Recommendation)-[action:LIKED|PURCHASED]->(p:Product)
        WHERE rec.userId = $userId
        OPTIONAL MATCH (p)-[:IN_CATEGORY]->(cat:Category)
        RETURN p.brand_url AS vendor,
               cat.name AS category,
               type(action) AS actionType
        `,
        { userId: pastConversations[0]?.userId || '' }
      );

      const vendorCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();

      for (const record of result.records) {
        const vendor = record.get('vendor');
        const category = record.get('category');

        if (vendor) {
          vendorCounts.set(vendor, (vendorCounts.get(vendor) || 0) + 1);
        }
        if (category) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      }

      // Sort by frequency — top vendors/categories are "preferred"
      const sortedVendors = Array.from(vendorCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      const sortedCategories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      const totalPositive = result.records.length || 1;
      const preferred_vendors = sortedVendors.slice(0, 5).map(([vendor_name, count]) => ({
        vendor_name,
        times_purchased: count,
        success_rate: count / totalPositive,
        avg_rating: 0, // Would need rating data to populate
      }));
      const preferred_categories = sortedCategories.slice(0, 5).map(([c]) => c);

      // Brand conscious if top vendor has 3+ positive signals
      const brand_conscious = sortedVendors.length > 0 && sortedVendors[0][1] >= 3;
      const uniqueVendors = vendorCounts.size;
      const brand_importance = brand_conscious ? Math.min(1, sortedVendors[0][1] / (uniqueVendors || 1)) : 0.3;

      return {
        preferred_vendors,
        avoided_vendors: [],
        preferred_categories,
        avoided_categories: [],
        brand_conscious,
        brand_importance,
        quality_over_quantity: true,
      };
    } catch (error) {
      logger.warn('GiverProfiler: extractPreferences query failed, using defaults', { error });
      return {
        preferred_vendors: [],
        avoided_vendors: [],
        preferred_categories: [],
        avoided_categories: [],
        brand_conscious: false,
        brand_importance: 0.5,
        quality_over_quantity: true,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Identify success patterns — queries Neo4j for products with positive feedback
   */
  private async identifySuccessPatterns(pastRecipients: any[]): Promise<GiverSuccessPatterns> {
    const session = this.neo4j.session();

    try {
      // Query products that received positive feedback (LIKED or PURCHASED)
      const result = await session.run(
        `
        MATCH (rec:Recommendation)-[action:LIKED|PURCHASED]->(p:Product)
        OPTIONAL MATCH (p)-[:IN_CATEGORY]->(cat:Category)
        OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
        RETURN p.title AS title,
               p.product_url AS productUrl,
               p.price AS price,
               collect(DISTINCT cat.name) AS categories,
               collect(DISTINCT i.name) AS interests,
               type(action) AS actionType
        LIMIT 50
        `
      );

      const typeCounts = new Map<string, number>();
      const attrCounts = new Map<string, number>();
      const highestRated: Array<{ title: string; product_url: string }> = [];

      for (const record of result.records) {
        const categories: string[] = record.get('categories') || [];
        const interests: string[] = record.get('interests') || [];
        const title = record.get('title');
        const productUrl = record.get('productUrl');
        const actionType = record.get('actionType');

        // Count category frequency as "successful types"
        for (const cat of categories) {
          if (cat) typeCounts.set(cat, (typeCounts.get(cat) || 0) + 1);
        }

        // Count interest hits as "successful attributes"
        for (const interest of interests) {
          if (interest) attrCounts.set(interest, (attrCounts.get(interest) || 0) + 1);
        }

        // Purchased items are highest-rated gifts
        if (actionType === 'PURCHASED' && title) {
          highestRated.push({ title, product_url: productUrl });
        }
      }

      const totalProducts = result.records.length || 1;
      return {
        most_successful_types: Array.from(typeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([pattern, count]) => ({
            pattern,
            success_rate: count / totalProducts,
            times_tried: count,
            confidence: Math.min(1, count / 5),
          })),
        most_successful_attributes: Array.from(attrCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([pattern, count]) => ({
            pattern,
            success_rate: count / totalProducts,
            times_tried: count,
            confidence: Math.min(1, count / 5),
          })),
        highest_rated_gifts: highestRated.slice(0, 5).map((g) => ({
          product_id: g.product_url || '',
          product_title: g.title,
          recipient_name: '',
          occasion: '',
          rating: 5, // Purchased = highest rating
          timestamp: new Date(),
        })),
        avoided_patterns: [],
      };
    } catch (error) {
      logger.warn('GiverProfiler: identifySuccessPatterns query failed, using defaults', { error });
      return {
        most_successful_types: [],
        most_successful_attributes: [],
        highest_rated_gifts: [],
        avoided_patterns: [],
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Persist giver profile properties on the User node
   */
  private async saveGiverProfile(userId: string, profile: GiverProfile): Promise<void> {
    const session = this.neo4j.session();

    try {
      await session.run(
        `
        MERGE (u:User {userId: $userId})
        SET u.giver_timing = $timing,
            u.giver_price_sensitivity = $priceSensitivity,
            u.giver_sentimentality = $sentimentality,
            u.giver_risk_tolerance = $riskTolerance,
            u.giver_primary_values = $primaryValues,
            u.giver_preferred_vendors = $preferredVendors,
            u.giver_preferred_categories = $preferredCategories,
            u.giver_profile_updated = datetime()
        `,
        {
          userId,
          timing: profile.shoppingStyle.typical_timing,
          priceSensitivity: profile.shoppingStyle.price_sensitivity,
          sentimentality: profile.givingPhilosophy.sentimentality_score,
          riskTolerance: profile.givingPhilosophy.risk_tolerance,
          primaryValues: profile.givingPhilosophy.primary_values,
          preferredVendors: profile.preferences.preferred_vendors,
          preferredCategories: profile.preferences.preferred_categories,
        }
      );

      this.log(`Giver profile saved for user ${userId}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate confidence in profile
   */
  private calculateConfidence(pastConversations: any[], pastRecipients: any[]) {
    const total_conversations = pastConversations.length;
    const total_purchases = 0; // Would need to query purchase history
    const total_feedback_signals = 0; // Would need to query feedback

    // Data quality based on history depth
    let data_quality = 0;
    if (total_conversations >= 10) data_quality = 0.9;
    else if (total_conversations >= 5) data_quality = 0.7;
    else if (total_conversations >= 2) data_quality = 0.5;
    else data_quality = 0.3;

    const prediction_confidence = data_quality * 0.9;

    const profile_age_days = 0; // Would calculate from earliest conversation

    return {
      data_quality,
      prediction_confidence,
      total_conversations,
      total_purchases,
      total_feedback_signals,
      last_updated: new Date(),
      profile_age_days,
    };
  }

  /**
   * Generate insights about giver
   */
  private generateInsights(profile: GiverProfile): GiverInsight[] {
    const insights: GiverInsight[] = [];

    // Shopping style insights
    if (profile.shoppingStyle.typical_timing !== 'unknown') {
      insights.push({
        category: 'shopping_style',
        insight: `Typically a ${profile.shoppingStyle.typical_timing} shopper`,
        confidence: profile.shoppingStyle.timing_confidence,
        actionable: true,
      });
    }

    // Philosophy insights
    if (profile.givingPhilosophy.primary_values.length > 0) {
      insights.push({
        category: 'philosophy',
        insight: `Values ${profile.givingPhilosophy.primary_values.join(', ')} in gift-giving`,
        confidence: 0.8,
        actionable: true,
      });
    }

    if (profile.givingPhilosophy.sentimentality_score > 0.7) {
      insights.push({
        category: 'philosophy',
        insight: 'Prefers sentimental and meaningful gifts',
        confidence: 0.8,
        actionable: true,
      });
    } else if (profile.givingPhilosophy.sentimentality_score < 0.3) {
      insights.push({
        category: 'philosophy',
        insight: 'Prefers practical and functional gifts',
        confidence: 0.8,
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * Identify learning updates
   */
  private identifyLearningUpdates(
    profile: GiverProfile,
    input: GiverProfilerInput
  ): GiverLearningUpdate[] {
    const updates: GiverLearningUpdate[] = [];

    // Check if budget was mentioned
    const currentQuery = input.currentQuery.toLowerCase();
    if (/\$\d+|budget|under/.test(currentQuery)) {
      updates.push({
        update_type: 'budget_pattern',
        description: 'Updated budget pattern from current query',
        confidence_delta: 0.1,
        evidence: [currentQuery],
      });
    }

    // Check for philosophy keywords
    const philosophyKeywords = ['meaningful', 'thoughtful', 'practical', 'special'];
    if (philosophyKeywords.some((kw) => currentQuery.includes(kw))) {
      updates.push({
        update_type: 'philosophy',
        description: 'Refined giving philosophy from current interaction',
        confidence_delta: 0.05,
        evidence: [currentQuery],
      });
    }

    return updates;
  }

  /**
   * Get minimal profile when no data available
   */
  private getMinimalProfile(userId: string): GiverProfile {
    return {
      userId,
      shoppingStyle: {
        typical_timing: 'unknown',
        timing_confidence: 0,
        budget_patterns: {
          by_occasion: new Map(),
          by_relationship: new Map(),
          overall_range: { min: 0, max: 1000, avg: 100, sample_size: 0 },
        },
        price_sensitivity: 'unknown',
        price_sensitivity_confidence: 0,
      },
      givingPhilosophy: {
        primary_values: [],
        personalization_importance: 0.5,
        sentimentality_score: 0.5,
        risk_tolerance: 'unknown',
        gift_type_preferences: {
          physical: 0.5,
          experiential: 0.5,
          consumable: 0.5,
          digital: 0.5,
        },
        important_attributes: [],
      },
      preferences: {
        preferred_vendors: [],
        avoided_vendors: [],
        preferred_categories: [],
        avoided_categories: [],
        brand_conscious: false,
        brand_importance: 0.5,
        quality_over_quantity: true,
      },
      successPatterns: {
        most_successful_types: [],
        most_successful_attributes: [],
        highest_rated_gifts: [],
        avoided_patterns: [],
      },
      confidence: {
        data_quality: 0,
        prediction_confidence: 0,
        total_conversations: 0,
        total_purchases: 0,
        total_feedback_signals: 0,
        last_updated: new Date(),
        profile_age_days: 0,
      },
    };
  }
}
