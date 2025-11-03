/**
 * Enhanced Recipient Profile Types
 *
 * Comprehensive recipient knowledge system that learns over time
 */

export interface RecipientProfile {
  // Core Identity
  id: string;
  name: string;
  age?: number;
  gender?: string;

  // Interests (with confidence & temporal tracking)
  interests: RecipientInterest[];

  // Values (what matters to them)
  values: RecipientValue[];

  // Preferences (specific likes)
  preferences: RecipientPreferences;

  // Dislikes (negative signals)
  dislikes: RecipientDislikes;

  // Gift Archetypes (what resonates)
  gift_archetypes: GiftArchetypeAffinity[];

  // Occasion Preferences
  occasion_preferences: Record<string, OccasionPreference>;

  // Life Context (changes over time)
  life_context: LifeContext;

  // Meta Information
  knowledge_depth: number;        // 0-1 score: how well we know them
  total_interactions: number;     // How many times mentioned
  last_updated: Date;
  created_at: Date;
}

export interface RecipientInterest {
  name: string;
  strength: number;              // 0-1: how strong this interest is
  confidence: number;            // 0-1: how confident we are
  last_mentioned: Date;
  times_mentioned: number;
  source: 'user_input' | 'inferred' | 'feedback';
  evidence: string[];            // What led us to this conclusion
}

export interface RecipientValue {
  name: string;
  importance: number;            // 0-1: how important this value is
  confidence: number;            // 0-1: how confident we are
  last_reinforced: Date;
  times_observed: number;
  source: 'user_input' | 'inferred' | 'feedback';
}

export interface RecipientPreferences {
  brands: Array<{ name: string; affinity: number }>;
  colors: Array<{ color: string; affinity: number }>;
  styles: Array<{ style: string; affinity: number }>;
  materials: Array<{ material: string; affinity: number }>;
  categories: Array<{ category: string; affinity: number }>;
  price_sensitivity: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface RecipientDislikes {
  interests: string[];           // Definitely NOT interested in
  styles: string[];              // Doesn't like these styles
  materials: string[];           // Avoids these materials
  categories: string[];          // Never wants these categories
  brands: string[];              // Dislikes these brands
  archetypes: string[];          // Doesn't resonate with these gift types
}

export interface GiftArchetypeAffinity {
  archetype: 'experience' | 'practical' | 'sentimental' | 'luxury' | 'humorous' | 'educational' | 'wellness';
  affinity: number;              // 0-1: how well this archetype works
  confidence: number;
  examples: string[];            // Past successful products
  last_success: Date;
}

export interface OccasionPreference {
  occasion: string;
  typical_budget: number;
  preferred_archetypes: string[];
  past_successes: Array<{
    product_id: string;
    product_title: string;
    date: Date;
    reaction: 'loved' | 'liked' | 'neutral';
  }>;
  past_failures: Array<{
    product_id: string;
    reason: string;
    date: Date;
  }>;
}

export interface LifeContext {
  life_stage?: 'student' | 'young_professional' | 'established_professional' | 'parent' | 'retiree';
  living_situation?: 'apartment' | 'house' | 'shared' | 'unknown';
  has_pets?: boolean;
  pet_types?: string[];
  has_children?: boolean;
  children_ages?: string[];
  hobbies: string[];
  major_life_events: Array<{
    event: string;
    date: Date;
    relevance: number;           // How relevant to gift-giving (0-1)
  }>;
  dietary_restrictions?: string[];
  allergies?: string[];
}

export interface FeedbackSignal {
  recommendation_id: string;
  user_id: string;
  recipient_id: string;
  timestamp: Date;

  // Explicit feedback (user tells us)
  explicit?: {
    product_id: string;
    action: 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';
    reason?: string;
    purchased: boolean;
    actually_gifted?: boolean;
    recipient_reaction?: 'loved' | 'liked' | 'neutral' | 'disappointed';
    would_gift_again: boolean;
  };

  // Implicit feedback (we observe)
  implicit?: {
    viewed_products: string[];
    time_spent: Array<{ product_id: string; seconds: number }>;
    scroll_depth: number;
    clicked_through: string[];
    refined_search: boolean;
    asked_clarifying_questions: string[];
  };

  // Contextual signals
  contextual?: {
    query_evolution: string[];
    constraints_mentioned: string[];
    urgency_level: 'low' | 'medium' | 'high';
  };
}

export interface LearningUpdate {
  recipient_id: string;
  update_type: 'add_interest' | 'strengthen_interest' | 'weaken_interest' |
                'add_value' | 'add_preference' | 'add_dislike' |
                'update_archetype' | 'add_life_event';
  confidence: number;
  source: 'user_input' | 'inferred' | 'feedback';
  evidence: string;
  timestamp: Date;

  // The actual update data
  data: any;
}
