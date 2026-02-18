/**
 * Giver Profile Types
 *
 * Comprehensive giver knowledge system that learns shopping style,
 * giving philosophy, and personalization preferences over time.
 */

export interface GiverProfile {
  // Core Identity
  userId: string;
  name?: string;

  // Shopping Style
  shoppingStyle: GiverShoppingStyle;

  // Giving Philosophy
  givingPhilosophy: GivingPhilosophy;

  // Preferences
  preferences: GiverPreferences;

  // Success Patterns
  successPatterns: GiverSuccessPatterns;

  // Confidence & Meta
  confidence: GiverConfidence;
}

export interface GiverShoppingStyle {
  // Timing patterns
  typical_timing: 'last-minute' | 'planned' | 'week-before' | 'month-ahead' | 'unknown';
  timing_confidence: number; // 0-1

  // Budget patterns
  budget_patterns: {
    by_occasion: Map<string, BudgetRange>;
    by_relationship: Map<string, BudgetRange>;
    overall_range: BudgetRange;
  };

  // Price sensitivity
  price_sensitivity: 'budget-conscious' | 'value-focused' | 'flexible' | 'luxury-oriented' | 'unknown';
  price_sensitivity_confidence: number; // 0-1
}

export interface BudgetRange {
  min: number;
  max: number;
  avg: number;
  sample_size: number; // How many data points
}

export interface GivingPhilosophy {
  // Core values in gift-giving
  primary_values: string[]; // e.g., ['thoughtful', 'practical', 'experiential']

  // Personalization importance
  personalization_importance: number; // 0-1 (0 = generic ok, 1 = must be personal)

  // Sentimentality
  sentimentality_score: number; // 0-1 (0 = practical, 1 = sentimental)

  // Risk tolerance
  risk_tolerance: 'conservative' | 'moderate' | 'adventurous' | 'unknown';

  // Gift type preferences
  gift_type_preferences: {
    physical: number; // 0-1
    experiential: number; // 0-1
    consumable: number; // 0-1
    digital: number; // 0-1
  };

  // Attributes that matter
  important_attributes: string[]; // e.g., ['eco-friendly', 'handmade', 'local']
}

export interface GiverPreferences {
  // Vendor preferences
  preferred_vendors: VendorPreference[];
  avoided_vendors: string[];

  // Category preferences
  preferred_categories: string[];
  avoided_categories: string[];

  // Brand consciousness
  brand_conscious: boolean;
  brand_importance: number; // 0-1

  // Quality preferences
  quality_over_quantity: boolean;
}

export interface VendorPreference {
  vendor_name: string;
  times_purchased: number;
  success_rate: number; // 0-1
  avg_rating: number; // 0-5
}

export interface GiverSuccessPatterns {
  // Most successful gift types
  most_successful_types: SuccessPattern[];

  // Most successful attributes
  most_successful_attributes: SuccessPattern[];

  // Highest rated gifts
  highest_rated_gifts: Array<{
    product_id: string;
    product_title: string;
    recipient_name: string;
    occasion: string;
    rating: number;
    timestamp: Date;
  }>;

  // Failed patterns to avoid
  avoided_patterns: Array<{
    pattern: string;
    reason: string;
    times_encountered: number;
  }>;
}

export interface SuccessPattern {
  pattern: string; // e.g., "handmade items", "coffee-related"
  success_rate: number; // 0-1
  times_tried: number;
  confidence: number; // 0-1
}

export interface GiverConfidence {
  // Overall confidence in profile accuracy
  data_quality: number; // 0-1 (based on history depth)
  prediction_confidence: number; // 0-1 (how confident in predictions)

  // Data depth
  total_conversations: number;
  total_purchases: number;
  total_feedback_signals: number;

  // Temporal
  last_updated: Date;
  profile_age_days: number;
}

/**
 * Learning updates from a single interaction
 */
export interface GiverLearningUpdate {
  update_type: 'budget_pattern' | 'vendor_preference' | 'success_pattern' | 'philosophy' | 'timing';
  description: string;
  confidence_delta: number; // How much this changed confidence
  evidence: string[];
}

/**
 * Insights about the giver for debugging/logging
 */
export interface GiverInsight {
  category: 'shopping_style' | 'philosophy' | 'preferences' | 'patterns';
  insight: string;
  confidence: number;
  actionable: boolean; // Can we act on this insight?
}
