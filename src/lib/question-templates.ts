/**
 * Question Templates Library
 *
 * Template-based question generation for DialogueManager.
 * Uses predefined templates (NOT LLM-generated) for:
 * - Fast generation (0ms latency)
 * - Deterministic output
 * - Cost efficiency
 * - Consistent UX
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md Section 4.3
 */

import {
  ClarifyingQuestion,
  QuestionTemplate,
  RefinementOptions,
  SuggestedAnswer,
} from '../types/dialogue';
import { ListenerOutput } from '../types/agents';

// ============================================================================
// Essential Question Templates
// ============================================================================

/**
 * Budget question (highest priority)
 */
export function budgetQuestion(): ClarifyingQuestion {
  return {
    id: 'budget',
    type: 'essential',
    field: 'budget',
    question: "What's your budget range for this gift?",
    suggestedAnswers: [
      { label: 'Under $25', value: { min: 0, max: 25 } },
      { label: '$25-$50', value: { min: 25, max: 50 } },
      { label: '$50-$100', value: { min: 50, max: 100 } },
      { label: '$100-$200', value: { min: 100, max: 200 } },
      { label: 'Above $200', value: { min: 200, max: 10000 } },
    ],
    priority: 1,
    impactOnConfidence: 0.15,
    rationale: 'Budget is essential for filtering products effectively',
  };
}

/**
 * Interests question (high priority)
 */
export function interestsQuestion(): ClarifyingQuestion {
  return {
    id: 'interests',
    type: 'essential',
    field: 'interests',
    question: "What are they passionate about or interested in?",
    suggestedAnswers: [
      { label: 'Food & cooking', value: 'cooking', description: 'Loves culinary experiences' },
      { label: 'Outdoor & nature', value: 'outdoors', description: 'Enjoys hiking, camping, etc.' },
      { label: 'Arts & crafts', value: 'arts', description: 'Creative and artistic' },
      { label: 'Tech & gaming', value: 'tech', description: 'Gadgets and games' },
      { label: 'Sports & fitness', value: 'sports', description: 'Active and athletic' },
      { label: 'Music & entertainment', value: 'music', description: 'Music lover' },
    ],
    priority: 2,
    impactOnConfidence: 0.20,
    rationale: 'Interests are critical for product matching',
  };
}

/**
 * Relationship question (if completely missing)
 */
export function relationshipQuestion(): ClarifyingQuestion {
  return {
    id: 'relationship',
    type: 'essential',
    field: 'recipient.relationshipType',
    question: "What's your relationship to this person?",
    suggestedAnswers: [
      { label: 'Parent', value: 'parent' },
      { label: 'Partner/Spouse', value: 'partner' },
      { label: 'Sibling', value: 'sibling' },
      { label: 'Friend', value: 'friend' },
      { label: 'Coworker', value: 'coworker' },
      { label: 'Other family', value: 'family' },
    ],
    priority: 3,
    impactOnConfidence: 0.12,
    rationale: 'Relationship type affects gift appropriateness',
  };
}

/**
 * Occasion question (helpful but not critical)
 */
export function occasionQuestion(): ClarifyingQuestion {
  return {
    id: 'occasion',
    type: 'essential',
    field: 'occasion',
    question: "What's the occasion?",
    suggestedAnswers: [
      { label: 'Birthday', value: { name: 'birthday', urgency: 'planned' } },
      { label: 'Holiday', value: { name: 'holiday', urgency: 'planned' } },
      { label: 'Anniversary', value: { name: 'anniversary', urgency: 'planned' } },
      { label: 'Just because', value: { name: 'just_because', urgency: 'flexible' } },
      { label: 'Thank you', value: { name: 'thank_you', urgency: 'flexible' } },
    ],
    priority: 4,
    impactOnConfidence: 0.08,
    rationale: 'Occasion provides context for gift selection',
  };
}

/**
 * Recipient age question (for better personalization)
 */
export function recipientAgeQuestion(): ClarifyingQuestion {
  return {
    id: 'recipient_age',
    type: 'essential',
    field: 'recipient.age',
    question: "How old are they?",
    suggestedAnswers: [
      { label: 'Child (under 13)', value: 10 },
      { label: 'Teen (13-17)', value: 15 },
      { label: 'Young adult (18-25)', value: 22 },
      { label: 'Adult (26-40)', value: 33 },
      { label: 'Middle-aged (41-60)', value: 50 },
      { label: 'Senior (60+)', value: 65 },
    ],
    priority: 5,
    impactOnConfidence: 0.10,
    rationale: 'Age helps narrow down appropriate gift types',
  };
}

// ============================================================================
// Refinement Question Templates
// ============================================================================

/**
 * Refinement options for vague interests
 */
export const INTEREST_REFINEMENTS: Record<string, RefinementOptions> = {
  music: {
    interest: 'music',
    options: [
      { label: 'Plays an instrument', value: 'musician', description: 'Musical instruments, accessories' },
      { label: 'Listens/collects', value: 'music-collector', description: 'Vinyl, merch, concerts' },
      { label: 'Makes music (production)', value: 'music-producer', description: 'Production software, equipment' },
      { label: 'All of the above', value: 'music-enthusiast' },
    ],
  },
  sports: {
    interest: 'sports',
    options: [
      { label: 'Specific sport', value: 'sport-specific', description: 'Running, basketball, etc.' },
      { label: 'General fitness', value: 'fitness', description: 'Gym, wellness, health' },
      { label: 'Watching sports', value: 'sports-fan', description: 'Fan gear, memorabilia' },
      { label: 'Multiple sports', value: 'multi-sport' },
    ],
  },
  art: {
    interest: 'art',
    options: [
      { label: 'Creates art', value: 'artist', description: 'Painting, drawing, sculpting' },
      { label: 'Appreciates/collects', value: 'art-collector', description: 'Museum visits, prints' },
      { label: 'Specific medium', value: 'art-specific', description: 'Photography, ceramics, etc.' },
      { label: 'All of the above', value: 'art-enthusiast' },
    ],
  },
  cooking: {
    interest: 'cooking',
    options: [
      { label: 'Everyday cooking', value: 'home-cook', description: 'Practical kitchen tools' },
      { label: 'Gourmet/enthusiast', value: 'food-enthusiast', description: 'Specialty ingredients, techniques' },
      { label: 'Baking', value: 'baker', description: 'Baking-specific tools' },
      { label: 'Grilling/BBQ', value: 'griller', description: 'Outdoor cooking' },
    ],
  },
  tech: {
    interest: 'tech',
    options: [
      { label: 'Gaming', value: 'gamer', description: 'Video games, accessories' },
      { label: 'Gadgets', value: 'gadget-lover', description: 'Latest tech, smart home' },
      { label: 'Programming', value: 'developer', description: 'Coding tools, keyboards' },
      { label: 'All tech', value: 'tech-enthusiast' },
    ],
  },
  outdoors: {
    interest: 'outdoors',
    options: [
      { label: 'Hiking/camping', value: 'hiker', description: 'Outdoor gear' },
      { label: 'Gardening', value: 'gardener', description: 'Plants, tools' },
      { label: 'Nature photography', value: 'nature-photographer' },
      { label: 'Multiple outdoor activities', value: 'outdoor-enthusiast' },
    ],
  },
  reading: {
    interest: 'reading',
    options: [
      { label: 'Fiction', value: 'fiction-reader', description: 'Novels, stories' },
      { label: 'Non-fiction', value: 'non-fiction-reader', description: 'Biography, history, science' },
      { label: 'Specific genre', value: 'genre-reader', description: 'Mystery, sci-fi, fantasy, etc.' },
      { label: 'All types', value: 'avid-reader' },
    ],
  },
  coffee: {
    interest: 'coffee',
    options: [
      { label: 'Casual drinker', value: 'casual-coffee', description: 'Morning coffee routine' },
      { label: 'Coffee enthusiast', value: 'coffee-enthusiast', description: 'Specialty beans, brewing methods' },
      { label: 'Espresso lover', value: 'espresso-lover', description: 'Espresso-focused' },
    ],
  },
  wine: {
    interest: 'wine',
    options: [
      { label: 'Red wine', value: 'red-wine-lover' },
      { label: 'White wine', value: 'white-wine-lover' },
      { label: 'All wine', value: 'wine-enthusiast', description: 'Appreciates all varieties' },
      { label: 'Wine & food pairing', value: 'wine-foodie' },
    ],
  },
};

/**
 * Generate refinement question for a vague interest
 */
export function refineInterestQuestion(interest: string): ClarifyingQuestion | null {
  const normalizedInterest = interest.toLowerCase();
  const refinement = INTEREST_REFINEMENTS[normalizedInterest];

  if (!refinement) {
    return null;
  }

  return {
    id: `refine_${normalizedInterest}`,
    type: 'refinement',
    field: 'interests',
    question: `You mentioned ${interest} - can you be more specific?`,
    suggestedAnswers: refinement.options,
    priority: 6,
    impactOnConfidence: 0.12,
    rationale: `"${interest}" is broad - refinement will improve product matching`,
  };
}

// ============================================================================
// Intent Clarification Templates
// ============================================================================

/**
 * Intent priority question (when conflicting signals detected)
 */
export function intentPriorityQuestion(conflicts: string[]): ClarifyingQuestion {
  const [first, second] = conflicts;

  return {
    id: 'intent_priority',
    type: 'intent',
    field: 'intentSignals',
    question: `I see you want both ${first} and ${second}. Which is more important?`,
    suggestedAnswers: [
      { label: `${first} first`, value: first, description: `Prioritize ${first} qualities` },
      { label: `${second} first`, value: second, description: `Prioritize ${second} qualities` },
      { label: 'Both equally', value: 'both', description: 'Balance both qualities' },
    ],
    priority: 7,
    impactOnConfidence: 0.10,
    rationale: 'Conflicting intent signals need clarification',
  };
}

/**
 * Gift philosophy question (practical vs meaningful)
 */
export function giftPhilosophyQuestion(): ClarifyingQuestion {
  return {
    id: 'gift_philosophy',
    type: 'intent',
    field: 'giftPhilosophy',
    question: "What matters most for this gift?",
    suggestedAnswers: [
      {
        label: 'Something they will use daily',
        value: 'practical',
        description: 'Focus on utility and function',
      },
      {
        label: 'Something unique and special',
        value: 'unique',
        description: 'One-of-a-kind finds',
      },
      {
        label: 'Something meaningful and personal',
        value: 'meaningful',
        description: 'Emotional connection',
      },
      {
        label: 'High quality and well-made',
        value: 'quality',
        description: 'Premium materials and craftsmanship',
      },
    ],
    priority: 8,
    impactOnConfidence: 0.09,
    rationale: 'Gift philosophy guides recommendation direction',
  };
}

// ============================================================================
// Constraint Clarification Templates
// ============================================================================

/**
 * Space constraint question (when recipient has limited space)
 */
export function spaceConstraintQuestion(): ClarifyingQuestion {
  return {
    id: 'space_constraint',
    type: 'constraint',
    field: 'enhancedConstraints.space',
    question: "I noticed they might have limited space. Should I avoid bulky items?",
    suggestedAnswers: [
      { label: 'Yes, keep it compact', value: 'minimal' },
      { label: 'Small is ok, just not huge', value: 'moderate' },
      { label: "Size doesn't matter", value: 'no_constraint' },
    ],
    priority: 9,
    impactOnConfidence: 0.08,
    rationale: 'Space constraints affect product size filtering',
  };
}

/**
 * Urgency question (when timing is unclear)
 */
export function urgencyQuestion(): ClarifyingQuestion {
  return {
    id: 'urgency',
    type: 'constraint',
    field: 'occasion.urgency',
    question: "When do you need this gift?",
    suggestedAnswers: [
      { label: 'Immediately (1-2 days)', value: 'immediate', description: 'Fast shipping required' },
      { label: 'This week', value: 'urgent', description: 'Within 5-7 days' },
      { label: 'In the next 2 weeks', value: 'planned', description: 'Standard shipping ok' },
      { label: 'No rush', value: 'flexible', description: 'Take your time' },
    ],
    priority: 10,
    impactOnConfidence: 0.07,
    rationale: 'Urgency affects shipping and availability filtering',
  };
}

// ============================================================================
// Ambiguity Resolution Templates
// ============================================================================

/**
 * Generate question from detected ambiguity
 */
export function ambiguityQuestion(ambiguity: {
  field: string;
  issue: string;
  suggestedClarification?: string;
}): ClarifyingQuestion {
  // Use suggested clarification if available, otherwise generate generic question
  const question = ambiguity.suggestedClarification || `Can you clarify: ${ambiguity.issue}?`;

  return {
    id: `ambiguity_${ambiguity.field}`,
    type: 'ambiguity',
    field: ambiguity.field,
    question,
    suggestedAnswers: generateAnswersForAmbiguity(ambiguity),
    priority: 11,
    impactOnConfidence: 0.08,
    rationale: `Ambiguity detected in ${ambiguity.field}`,
  };
}

/**
 * Generate suggested answers for an ambiguity
 */
function generateAnswersForAmbiguity(ambiguity: {
  field: string;
  issue: string;
}): SuggestedAnswer[] {
  // Generate field-specific answers based on the ambiguous field
  const field = ambiguity.field.toLowerCase();

  // Budget ambiguity → price ranges
  if (field.includes('budget')) {
    return [
      { label: 'Under $25', value: { min: 0, max: 25 } },
      { label: '$25-$50', value: { min: 25, max: 50 } },
      { label: '$50-$100', value: { min: 50, max: 100 } },
      { label: '$100-$200', value: { min: 100, max: 200 } },
      { label: 'Above $200', value: { min: 200, max: 10000 } },
    ];
  }

  // Relationship ambiguity → relationship types
  if (field.includes('relationship') || field.includes('recipient')) {
    return [
      { label: 'Parent', value: 'parent' },
      { label: 'Partner/Spouse', value: 'partner' },
      { label: 'Sibling', value: 'sibling' },
      { label: 'Friend', value: 'friend' },
      { label: 'Coworker', value: 'coworker' },
      { label: 'Other family', value: 'family' },
    ];
  }

  // Interests ambiguity → common interests
  if (field.includes('interest')) {
    return [
      { label: 'Food & cooking', value: 'cooking' },
      { label: 'Outdoor & nature', value: 'outdoors' },
      { label: 'Arts & crafts', value: 'arts' },
      { label: 'Tech & gaming', value: 'tech' },
      { label: 'Sports & fitness', value: 'sports' },
      { label: 'Music & entertainment', value: 'music' },
    ];
  }

  // Occasion ambiguity → common occasions
  if (field.includes('occasion')) {
    return [
      { label: 'Birthday', value: { name: 'birthday', urgency: 'planned' } },
      { label: 'Holiday', value: { name: 'holiday', urgency: 'planned' } },
      { label: 'Anniversary', value: { name: 'anniversary', urgency: 'planned' } },
      { label: 'Just because', value: { name: 'just_because', urgency: 'flexible' } },
      { label: 'Thank you', value: { name: 'thank_you', urgency: 'flexible' } },
    ];
  }

  // Age ambiguity → age ranges
  if (field.includes('age')) {
    return [
      { label: 'Child (under 13)', value: 10 },
      { label: 'Teen (13-17)', value: 15 },
      { label: 'Young adult (18-25)', value: 22 },
      { label: 'Adult (26-40)', value: 33 },
      { label: 'Middle-aged (41-60)', value: 50 },
      { label: 'Senior (60+)', value: 65 },
    ];
  }

  // Default fallback → ask user to specify
  return [
    { label: 'Tell me more', value: 'more_info_needed', description: 'I need more details' },
    { label: 'Skip this', value: 'skip', description: 'Not important right now' },
  ];
}

// ============================================================================
// Question Template Registry
// ============================================================================

/**
 * All available question templates with their conditions
 */
export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: 'budget',
    type: 'essential',
    field: 'budget',
    generate: budgetQuestion,
    condition: (listener) => !listener.budget || listener.budget.max === 0,
    basePriority: 1,
  },
  {
    id: 'interests',
    type: 'essential',
    field: 'interests',
    generate: interestsQuestion,
    condition: (listener) => !listener.interests || listener.interests.length === 0,
    basePriority: 2,
  },
  {
    id: 'relationship',
    type: 'essential',
    field: 'recipient.relationshipType',
    generate: relationshipQuestion,
    condition: (listener) => !listener.recipient?.relationshipType,
    basePriority: 3,
  },
  {
    id: 'occasion',
    type: 'essential',
    field: 'occasion',
    generate: occasionQuestion,
    condition: (listener) => !listener.occasion,
    basePriority: 4,
  },
  {
    id: 'recipient_age',
    type: 'essential',
    field: 'recipient.age',
    generate: recipientAgeQuestion,
    condition: (listener) =>
      !listener.recipient?.age && !listener.lifeContext?.lifeStage,
    basePriority: 5,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Identify vague interests that need refinement
 */
export function identifyVagueInterests(interests: string[]): string[] {
  const vague: string[] = [];

  interests.forEach((interest) => {
    const normalized = interest.toLowerCase();
    if (INTEREST_REFINEMENTS[normalized]) {
      vague.push(interest);
    }
  });

  return vague;
}

/**
 * Detect conflicting intent signals
 */
export function detectIntentConflicts(intentSignals: {
  safe?: boolean;
  unique?: boolean;
  practical?: boolean;
  sentimental?: boolean;
  impress?: boolean;
}): string[] {
  const conflicts: string[] = [];

  // Safe + Unique = conflict
  if (intentSignals.safe && intentSignals.unique) {
    conflicts.push('safe', 'unique');
  }

  // Practical + Sentimental = conflict
  if (intentSignals.practical && intentSignals.sentimental) {
    conflicts.push('practical', 'sentimental');
  }

  // Safe + Impress = conflict
  if (intentSignals.safe && intentSignals.impress) {
    conflicts.push('safe', 'impress');
  }

  return conflicts;
}

/**
 * Get refinement options for an interest
 */
export function getRefinementOptionsFor(interest: string): SuggestedAnswer[] {
  const normalized = interest.toLowerCase();
  return INTEREST_REFINEMENTS[normalized]?.options || [];
}
