/**
 * Recipient Learner Sub-Agent
 *
 * Deep learning system that builds comprehensive recipient profiles over time.
 * This runs as part of the Memory agent to enrich recipient understanding.
 */

import { BaseAgent } from './base.js';
import { Driver } from 'neo4j-driver';
import { logger } from '../../lib/logger.js';
import type {
  RecipientProfile,
  RecipientInterest,
  RecipientValue,
  FeedbackSignal,
  LearningUpdate,
} from '../../types/recipient.js';

export interface RecipientLearnerInput {
  userId: string;
  recipientName?: string;
  currentQuery: string;
  listenerContext: any;
  pastRecipients: any[];
}

export interface RecipientLearnerOutput {
  enriched_recipient?: RecipientProfile;
  learning_updates: LearningUpdate[];
  confidence_level: number;
  knowledge_gaps: string[];
}

/**
 * Sub-agent that builds and maintains deep recipient knowledge
 */
export class RecipientLearner extends BaseAgent<RecipientLearnerInput, RecipientLearnerOutput> {
  name = 'RecipientLearner';

  constructor(private neo4j: Driver) {
    super();
  }

  async process(input: RecipientLearnerInput): Promise<RecipientLearnerOutput> {
    this.log('Building comprehensive recipient profile');

    try {
      const recipientName = input.recipientName || input.listenerContext.recipient?.name;

      if (!recipientName) {
        return {
          enriched_recipient: undefined,
          learning_updates: [],
          confidence_level: 0,
          knowledge_gaps: ['No recipient identified'],
        };
      }

      // Find or create recipient profile
      const existingProfile = await this.getRecipientProfile(input.userId, recipientName);

      // Extract new learnings from current query
      const newLearnings = this.extractLearningsFromQuery(input);

      // Merge with existing knowledge
      const enrichedProfile = this.mergeKnowledge(existingProfile, newLearnings, input);

      // Save updated profile
      await this.saveRecipientProfile(input.userId, enrichedProfile);

      // Identify knowledge gaps
      const knowledgeGaps = this.identifyKnowledgeGaps(enrichedProfile);

      this.log(`Enriched profile for ${recipientName}: ${enrichedProfile.interests.length} interests, confidence ${enrichedProfile.knowledge_depth.toFixed(2)}`);

      return {
        enriched_recipient: enrichedProfile,
        learning_updates: newLearnings,
        confidence_level: enrichedProfile.knowledge_depth,
        knowledge_gaps: knowledgeGaps,
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Get existing recipient profile from database
   */
  private async getRecipientProfile(userId: string, recipientName: string): Promise<RecipientProfile | null> {
    const session = this.neo4j.session();

    try {
      const cypher = `
        MATCH (u:User {id: $userId})-[rel:HAS_RELATIONSHIP]->(r:Recipient)
        WHERE toLower(r.name) = toLower($recipientName)

        // Get interests with metadata
        OPTIONAL MATCH (r)-[ri:INTERESTED_IN]->(i:Interest)
        WITH r, rel, COLLECT({
          name: i.name,
          strength: ri.strength,
          confidence: COALESCE(ri.confidence, 0.7),
          last_mentioned: ri.last_mentioned,
          times_mentioned: COALESCE(ri.times_mentioned, 1),
          source: COALESCE(ri.source, 'user_input')
        }) AS interests

        // Get values
        OPTIONAL MATCH (r)-[rv:VALUES]->(v:Value)
        WITH r, rel, interests, COLLECT({
          name: v.name,
          importance: rv.importance,
          confidence: COALESCE(rv.confidence, 0.7),
          last_reinforced: rv.last_reinforced,
          times_observed: COALESCE(rv.times_observed, 1),
          source: COALESCE(rv.source, 'user_input')
        }) AS values

        RETURN r, rel, interests, values
      `;

      const result = await session.run(cypher, { userId, recipientName });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const r = record.get('r').properties;
      const rel = record.get('rel').properties;
      const interests = record.get('interests');
      const values = record.get('values');

      return {
        id: r.id || `recipient_${recipientName.toLowerCase().replace(/\s+/g, '_')}`,
        name: recipientName,
        age: r.age,
        gender: r.gender,
        interests: interests.filter((i: any) => i.name),
        values: values.filter((v: any) => v.name),
        preferences: {
          brands: [],
          colors: [],
          styles: [],
          materials: [],
          categories: [],
          price_sensitivity: 'moderate',
        },
        dislikes: {
          interests: [],
          styles: [],
          materials: [],
          categories: [],
          brands: [],
          archetypes: [],
        },
        gift_archetypes: [],
        occasion_preferences: {},
        life_context: {
          hobbies: [],
          major_life_events: [],
        },
        knowledge_depth: this.calculateKnowledgeDepth(interests, values),
        total_interactions: r.total_interactions || 1,
        last_updated: new Date(),
        created_at: r.created_at ? new Date(r.created_at) : new Date(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Extract learnings from current query
   */
  private extractLearningsFromQuery(input: RecipientLearnerInput): LearningUpdate[] {
    const updates: LearningUpdate[] = [];
    const listener = input.listenerContext;
    const recipientName = listener.recipient?.name || 'unknown';

    // Extract interests mentioned in query
    if (listener.interests && listener.interests.length > 0) {
      listener.interests.forEach((interest: string) => {
        updates.push({
          recipient_id: recipientName,
          update_type: 'add_interest',
          confidence: listener.confidence || 0.8,
          source: 'user_input',
          evidence: `Mentioned in query: "${input.currentQuery}"`,
          timestamp: new Date(),
          data: {
            name: interest,
            strength: 0.8,
          },
        });
      });
    }

    // Extract values from query analysis
    if (listener.values && listener.values.length > 0) {
      listener.values.forEach((value: string) => {
        updates.push({
          recipient_id: recipientName,
          update_type: 'add_value',
          confidence: 0.7,
          source: 'inferred',
          evidence: `Inferred from context: "${input.currentQuery}"`,
          timestamp: new Date(),
          data: {
            name: value,
            importance: 0.7,
          },
        });
      });
    }

    // Extract life context clues
    const queryLower = input.currentQuery.toLowerCase();

    // Age mentions
    const ageMatch = queryLower.match(/(\d+)\s*(?:years?\s*old|yo|year-old)/);
    if (ageMatch) {
      updates.push({
        recipient_id: recipientName,
        update_type: 'add_life_event',
        confidence: 0.95,
        source: 'user_input',
        evidence: `Age mentioned: ${ageMatch[1]}`,
        timestamp: new Date(),
        data: { age: parseInt(ageMatch[1]) },
      });
    }

    // Gender mentions - infer from relationship terms and explicit mentions
    let inferredGender: string | undefined;
    const relationshipType = listener.recipient?.relationshipType;

    // Check explicit gender from listener context first
    if (listener.recipient?.gender) {
      inferredGender = listener.recipient.gender;
    }
    // Infer from relationship type
    else if (relationshipType) {
      const relTypeLower = relationshipType.toLowerCase();
      if (relTypeLower.includes('mom') || relTypeLower.includes('mother') ||
          relTypeLower.includes('wife') || relTypeLower.includes('girlfriend') ||
          relTypeLower.includes('sister') || relTypeLower.includes('daughter') ||
          relTypeLower.includes('aunt') || relTypeLower.includes('grandmother') ||
          relTypeLower.includes('grandma')) {
        inferredGender = 'female';
      } else if (relTypeLower.includes('dad') || relTypeLower.includes('father') ||
                 relTypeLower.includes('husband') || relTypeLower.includes('boyfriend') ||
                 relTypeLower.includes('brother') || relTypeLower.includes('son') ||
                 relTypeLower.includes('uncle') || relTypeLower.includes('grandfather') ||
                 relTypeLower.includes('grandpa')) {
        inferredGender = 'male';
      }
    }
    // Check query for gendered terms
    else if (queryLower.includes(' her ') || queryLower.includes(' she ')) {
      inferredGender = 'female';
    } else if (queryLower.includes(' him ') || queryLower.includes(' he ')) {
      inferredGender = 'male';
    }

    if (inferredGender) {
      updates.push({
        recipient_id: recipientName,
        update_type: 'add_life_event',
        confidence: listener.recipient?.gender ? 0.95 : 0.85,
        source: listener.recipient?.gender ? 'user_input' : 'inferred',
        evidence: listener.recipient?.gender
          ? `Gender provided: ${inferredGender}`
          : `Gender inferred from context: ${inferredGender}`,
        timestamp: new Date(),
        data: { gender: inferredGender },
      });
    }

    // Relationship context
    if (relationshipType) {
      updates.push({
        recipient_id: recipientName,
        update_type: 'add_life_event',
        confidence: 0.9,
        source: 'user_input',
        evidence: `Relationship: ${relationshipType}`,
        timestamp: new Date(),
        data: { relationship_type: relationshipType },
      });
    }

    return updates;
  }

  /**
   * Merge new learnings with existing profile
   */
  private mergeKnowledge(
    existing: RecipientProfile | null,
    newLearnings: LearningUpdate[],
    input: RecipientLearnerInput
  ): RecipientProfile {
    const recipientName = input.recipientName || input.listenerContext.recipient?.name;

    // Start with existing or create new profile
    const profile: RecipientProfile = existing || {
      id: `recipient_${recipientName?.toLowerCase().replace(/\s+/g, '_')}`,
      name: recipientName || 'Unknown',
      interests: [],
      values: [],
      preferences: {
        brands: [],
        colors: [],
        styles: [],
        materials: [],
        categories: [],
        price_sensitivity: 'moderate',
      },
      dislikes: {
        interests: [],
        styles: [],
        materials: [],
        categories: [],
        brands: [],
        archetypes: [],
      },
      gift_archetypes: [],
      occasion_preferences: {},
      life_context: {
        hobbies: [],
        major_life_events: [],
      },
      knowledge_depth: 0,
      total_interactions: 0,
      last_updated: new Date(),
      created_at: new Date(),
    };

    // Apply new learnings
    newLearnings.forEach((learning) => {
      if (learning.update_type === 'add_interest') {
        const existingInterest = profile.interests.find(
          (i) => i.name.toLowerCase() === learning.data.name.toLowerCase()
        );

        if (existingInterest) {
          // Strengthen existing interest
          existingInterest.strength = Math.min(1.0, existingInterest.strength * 1.1);
          existingInterest.confidence = Math.min(1.0, existingInterest.confidence * 1.05);
          existingInterest.times_mentioned += 1;
          existingInterest.last_mentioned = new Date();
          if (!existingInterest.evidence) existingInterest.evidence = [];
          existingInterest.evidence.push(learning.evidence);
        } else {
          // Add new interest
          profile.interests.push({
            name: learning.data.name,
            strength: learning.data.strength || 0.8,
            confidence: learning.confidence,
            last_mentioned: new Date(),
            times_mentioned: 1,
            source: learning.source,
            evidence: [learning.evidence],
          });
        }
      }

      if (learning.update_type === 'add_value') {
        const existingValue = profile.values.find(
          (v) => v.name.toLowerCase() === learning.data.name.toLowerCase()
        );

        if (existingValue) {
          existingValue.importance = Math.min(1.0, existingValue.importance * 1.1);
          existingValue.confidence = Math.min(1.0, existingValue.confidence * 1.05);
          existingValue.times_observed += 1;
          existingValue.last_reinforced = new Date();
        } else {
          profile.values.push({
            name: learning.data.name,
            importance: learning.data.importance,
            confidence: learning.confidence,
            last_reinforced: new Date(),
            times_observed: 1,
            source: learning.source,
          });
        }
      }

      if (learning.update_type === 'add_life_event') {
        if (learning.data.age) {
          profile.age = learning.data.age;
        }
        if (learning.data.gender) {
          profile.gender = learning.data.gender;
        }
      }
    });

    // Update metadata
    profile.total_interactions += 1;
    profile.last_updated = new Date();
    profile.knowledge_depth = this.calculateKnowledgeDepth(profile.interests, profile.values);

    return profile;
  }

  /**
   * Save updated profile to database
   */
  private async saveRecipientProfile(userId: string, profile: RecipientProfile): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Log when age/gender are missing for tracking
      if (!profile.age || !profile.gender) {
        const missing = [];
        if (!profile.age) missing.push('age');
        if (!profile.gender) missing.push('gender');
        this.log(`⚠️  Missing recipient info (${missing.join(', ')}) for ${profile.name} - continuing without it`);
      }

      // Create or update recipient node
      // Use CASE to conditionally set age/gender only when they exist
      await session.run(
        `
        MERGE (u:User {id: $userId})
        MERGE (r:Recipient {id: $recipientId})
        SET r.name = $name,
            r.knowledge_depth = $knowledge_depth,
            r.total_interactions = $total_interactions,
            r.last_updated = datetime(),
            r.created_at = COALESCE(r.created_at, datetime())
        ${profile.age ? 'SET r.age = $age' : ''}
        ${profile.gender ? 'SET r.gender = $gender' : ''}
        MERGE (u)-[:HAS_RELATIONSHIP]->(r)
        `,
        {
          userId,
          recipientId: profile.id,
          name: profile.name,
          ...(profile.age && { age: profile.age }),
          ...(profile.gender && { gender: profile.gender }),
          knowledge_depth: profile.knowledge_depth,
          total_interactions: profile.total_interactions,
        }
      );

      // Update interests
      for (const interest of profile.interests) {
        await session.run(
          `
          MATCH (r:Recipient {id: $recipientId})
          MERGE (i:Interest {name: $interestName})
          MERGE (r)-[rel:INTERESTED_IN]->(i)
          SET rel.strength = $strength,
              rel.confidence = $confidence,
              rel.last_mentioned = datetime(),
              rel.times_mentioned = $times_mentioned,
              rel.source = $source
          `,
          {
            recipientId: profile.id,
            interestName: interest.name,
            strength: interest.strength,
            confidence: interest.confidence,
            times_mentioned: interest.times_mentioned,
            source: interest.source,
          }
        );
      }

      // Update values
      for (const value of profile.values) {
        await session.run(
          `
          MATCH (r:Recipient {id: $recipientId})
          MERGE (v:Value {name: $valueName})
          MERGE (r)-[rel:VALUES]->(v)
          SET rel.importance = $importance,
              rel.confidence = $confidence,
              rel.last_reinforced = datetime(),
              rel.times_observed = $times_observed,
              rel.source = $source
          `,
          {
            recipientId: profile.id,
            valueName: value.name,
            importance: value.importance,
            confidence: value.confidence,
            times_observed: value.times_observed,
            source: value.source,
          }
        );
      }

      this.log(`Saved profile for ${profile.name} with ${profile.interests.length} interests`);
    } catch (error) {
      logger.error('Failed to save recipient profile', { error, recipientId: profile.id });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate how well we know this recipient (0-1)
   */
  private calculateKnowledgeDepth(interests: any[], values: any[]): number {
    let depth = 0;

    // Base: have at least basic info
    if (interests.length > 0) depth += 0.3;
    if (values.length > 0) depth += 0.2;

    // More interests/values = better knowledge
    depth += Math.min(0.3, interests.length * 0.05);
    depth += Math.min(0.2, values.length * 0.05);

    return Math.min(1.0, depth);
  }

  /**
   * Identify what we don't know about the recipient
   */
  private identifyKnowledgeGaps(profile: RecipientProfile): string[] {
    const gaps: string[] = [];

    if (profile.interests.length === 0) gaps.push('No interests identified');
    if (profile.interests.length < 3) gaps.push('Limited interest diversity');
    if (profile.values.length === 0) gaps.push('No values identified');
    if (profile.gift_archetypes.length === 0) gaps.push('No gift archetype preferences');
    if (!profile.age) gaps.push('Age unknown');
    if (Object.keys(profile.occasion_preferences).length === 0) {
      gaps.push('No occasion-specific preferences');
    }
    if (profile.dislikes.interests.length === 0) gaps.push('No known dislikes');

    return gaps;
  }

  /**
   * Process feedback to improve recipient profile
   */
  async processFeedback(feedback: FeedbackSignal): Promise<void> {
    const session = this.neo4j.session();

    try {
      if (feedback.explicit) {
        const { product_id, action, recipient_reaction } = feedback.explicit;

        // If recipient loved/liked the gift, strengthen associated interests
        if (action === 'loved' || action === 'liked' || recipient_reaction === 'loved') {
          await session.run(
            `
            MATCH (p:Product {id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
            MATCH (r:Recipient {id: $recipientId})-[ri:INTERESTED_IN]->(i)
            SET ri.strength = ri.strength * 1.15,
                ri.confidence = ri.confidence * 1.1,
                ri.last_mentioned = datetime()
            `,
            {
              productId: product_id,
              recipientId: feedback.recipient_id,
            }
          );

          this.log(`Strengthened interests based on positive feedback for ${product_id}`);
        }

        // If disliked, weaken or add to dislikes
        if (action === 'disliked' || action === 'hated' || recipient_reaction === 'disappointed') {
          await session.run(
            `
            MATCH (p:Product {id: $productId})-[mi:MATCHES_INTEREST]->(i:Interest)
            MATCH (r:Recipient {id: $recipientId})-[ri:INTERESTED_IN]->(i)
            SET ri.strength = ri.strength * 0.8,
                ri.confidence = ri.confidence * 0.9
            `,
            {
              productId: product_id,
              recipientId: feedback.recipient_id,
            }
          );

          this.log(`Weakened interests based on negative feedback for ${product_id}`);
        }
      }
    } finally {
      await session.close();
    }
  }
}
