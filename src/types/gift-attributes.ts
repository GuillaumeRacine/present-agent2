/**
 * Gift Attribute Types
 *
 * Defines the gift attribute taxonomy for value-based matching.
 * These attributes capture what TYPE of gift a product represents,
 * independent of its specific content/interests.
 */

/**
 * Comprehensive Gift Attributes (100 dimensions)
 *
 * Products can have multiple attributes (e.g., a cooking class is
 * experiential, educational, shared, AND memory-making)
 *
 * Organized into 11 logical dimension groups for gift-giving analysis.
 */
export interface GiftAttributes {
  // ============================================================
  // GROUP 1: EXPERIENCE & TIME (8 attributes)
  // ============================================================
  /** Activity-based gifts (classes, events, tickets, subscriptions) */
  isExperiential?: boolean;
  /** Creates lasting memories (photo albums, travel, keepsakes) */
  isMemoryMaking?: boolean;
  /** Used up over time (food, wine, beauty, candles) */
  isConsumable?: boolean;
  /** Durable, investment-quality, long-lasting */
  isLastingValue?: boolean;
  /** Single-use or disposable item */
  isOneTimeUse?: boolean;
  /** Recurring delivery or access (subscription box, streaming) */
  isSubscriptionBased?: boolean;
  /** Immediate enjoyment (no setup/learning required) */
  isImmediateGratification?: boolean;
  /** Appreciates or provides value over years */
  isLongTermInvestment?: boolean;

  // ============================================================
  // GROUP 2: SENTIMENT & EMOTIONAL CONNECTION (10 attributes)
  // ============================================================
  /** Emotionally meaningful, heartfelt, symbolic */
  isSentimental?: boolean;
  /** Custom-made, monogrammed, bespoke, tailored */
  isPersonalized?: boolean;
  /** Specifically for romantic partners, love-focused */
  isRomantic?: boolean;
  /** Evokes past memories, vintage feel, retro */
  isNostalgic?: boolean;
  /** Antique, retro styling (not just old sentiment) */
  isVintage?: boolean;
  /** For celebrations, milestones, festivities */
  isCelebratory?: boolean;
  /** Provides emotional comfort, reassurance, warmth */
  isComforting?: boolean;
  /** Unexpected, element of surprise, delightful */
  isSurprising?: boolean;
  /** Sincere, genuine, from-the-heart */
  isHeartfelt?: boolean;
  /** Represents deeper meaning, metaphorical */
  isSymbolic?: boolean;

  // ============================================================
  // GROUP 3: FUNCTION & UTILITY (12 attributes)
  // ============================================================
  /** Solves problems, everyday utility, functional */
  isPractical?: boolean;
  /** High-end, premium, indulgent, expensive */
  isLuxury?: boolean;
  /** Health-focused, self-care, fitness, mindfulness */
  isWellness?: boolean;
  /** Smart, connected, digital, electronic */
  isTechEnabled?: boolean;
  /** Easy to carry, travel-friendly, mobile */
  isPortable?: boolean;
  /** No assembly, setup, or learning curve required */
  isReadyToUse?: boolean;
  /** Serves multiple purposes, versatile */
  isMultiFunctional?: boolean;
  /** Compact design, doesn't take up much room */
  isSpaceSaving?: boolean;
  /** Low maintenance, easy to clean/care for */
  isEasyToMaintain?: boolean;
  /** Can be used outdoors, weather-resistant */
  isWeatherResistant?: boolean;
  /** Can be enhanced or expanded over time */
  isUpgradable?: boolean;
  /** Can be fixed if broken, serviceable */
  isRepairable?: boolean;

  // ============================================================
  // GROUP 4: SOCIAL & RELATIONSHIP (10 attributes)
  // ============================================================
  /** Enjoyed with others, group experiences, social */
  isShared?: boolean;
  /** Unique, interesting, story-worthy, distinctive */
  isConversationStarter?: boolean;
  /** Suitable for all ages, kid-safe */
  isFamilyFriendly?: boolean;
  /** For celebrations, parties, gatherings */
  isPartyFocused?: boolean;
  /** For 2-6 people, small groups, couples */
  isIntimateGathering?: boolean;
  /** For entertaining guests, hospitality */
  isHostingRelated?: boolean;
  /** Appeals to wide audience, universally liked */
  isCrowdPleaser?: boolean;
  /** Appropriate for any gender */
  isGenderNeutral?: boolean;
  /** Appeals across age groups */
  isGenerationallyNeutral?: boolean;
  /** Works across different cultures */
  isCulturallyNeutral?: boolean;

  // ============================================================
  // GROUP 5: AESTHETIC & DESIGN (12 attributes)
  // ============================================================
  /** Art, design objects, creative, aesthetically focused */
  isArtistic?: boolean;
  /** Simple, clean, uncluttered, understated */
  isMinimalist?: boolean;
  /** Bright, vibrant, eye-catching colors */
  isColorful?: boolean;
  /** Refined, sophisticated, classy, graceful */
  isElegant?: boolean;
  /** Strong visual statement, dramatic, striking */
  isBold?: boolean;
  /** Understated, muted, gentle, low-key */
  isSubtle?: boolean;
  /** Classic vintage aesthetic (may not be old) */
  isVintageStyle?: boolean;
  /** Contemporary, current design trends */
  isModern?: boolean;
  /** Classic, timeless, conventional styling */
  isTraditional?: boolean;
  /** Fun, unconventional, playful design */
  isQuirky?: boolean;
  /** Visually impressive, attention-grabbing */
  isVisuallyStriking?: boolean;
  /** Recognizable, legendary design, famous */
  isIconic?: boolean;

  // ============================================================
  // GROUP 6: LEARNING & GROWTH (8 attributes)
  // ============================================================
  /** Helps achieve goals, self-improvement, growth */
  isAspirational?: boolean;
  /** Teaches skills, expands knowledge */
  isEducational?: boolean;
  /** Develops specific abilities, practice-based */
  isSkillBuilding?: boolean;
  /** Motivational, encouraging, uplifting */
  isInspirational?: boolean;
  /** Life-changing potential, profound impact */
  isTransformative?: boolean;
  /** Encourages artistic expression, imagination */
  isCreative?: boolean;
  /** Helps with work, organization, efficiency */
  isProductivityEnhancing?: boolean;
  /** Broadens perspective, intellectual stimulation */
  isMindExpanding?: boolean;

  // ============================================================
  // GROUP 7: SUSTAINABILITY & ETHICS (7 attributes)
  // ============================================================
  /** Environmentally conscious, sustainable, green */
  isEcoFriendly?: boolean;
  /** Artisan-made, hand-crafted, one-of-a-kind */
  isHandcrafted?: boolean;
  /** Local artisan, small business, community */
  isLocal?: boolean;
  /** Fair trade, ethically sourced, responsible */
  isEthicallySourced?: boolean;
  /** Fair trade certified, supports fair wages */
  isFairTrade?: boolean;
  /** Minimal waste, recyclable, sustainable packaging */
  isZeroWaste?: boolean;
  /** Made from recycled or upcycled materials */
  isRecycled?: boolean;

  // ============================================================
  // GROUP 8: PHYSICAL & SENSORY (13 attributes)
  // ============================================================
  /** Has pleasant scent, aromatic, perfumed */
  isFragrant?: boolean;
  /** Interesting texture, touchable, tactile appeal */
  isTactile?: boolean;
  /** Food or beverage item */
  isEdible?: boolean;
  /** Makes sound, musical, auditory component */
  isAuditory?: boolean;
  /** Strong visual component, display-worthy */
  isVisual?: boolean;
  /** Small, portable, doesn't take much space */
  isCompact?: boolean;
  /** Large, requires space, substantial size */
  isBulky?: boolean;
  /** Easy to move, not heavy */
  isLightweight?: boolean;
  /** Fragile, requires careful handling */
  isDelicate?: boolean;
  /** Sturdy, robust, hard to break */
  isDurable?: boolean;
  /** Has interesting surface texture */
  isTextured?: boolean;
  /** Smooth surface, sleek finish */
  isSmooth?: boolean;
  /** Cozy, warm feeling or temperature */
  isWarm?: boolean;

  // ============================================================
  // GROUP 9: USAGE CONTEXT (10 attributes)
  // ============================================================
  /** For indoor use, home-based */
  isIndoor?: boolean;
  /** For outdoor use, nature-oriented */
  isOutdoor?: boolean;
  /** Travel-friendly, vacation-related */
  isTravel?: boolean;
  /** For home use, domestic setting */
  isHome?: boolean;
  /** For workplace, professional setting */
  isOffice?: boolean;
  /** Requires physical activity, movement */
  isActive?: boolean;
  /** Relaxing, low-energy, restful */
  isPassive?: boolean;
  /** Suitable for novices, no experience needed */
  isBeginner?: boolean;
  /** For experienced users, advanced */
  isExpert?: boolean;
  /** Appropriate for any age group */
  isAllAges?: boolean;

  // ============================================================
  // GROUP 10: VALUE & UNIQUENESS (9 attributes)
  // ============================================================
  /** Affordable, good value, under $50 */
  isBudgetFriendly?: boolean;
  /** Premium price point, luxury purchase */
  isSplurgeWorthy?: boolean;
  /** Limited production, rare, exclusive */
  isLimitedEdition?: boolean;
  /** One-of-a-kind, hard to find, special */
  isUnique?: boolean;
  /** Investment piece, appreciates, collectible */
  isCollectible?: boolean;
  /** Classic appeal, won't go out of style */
  isTimeless?: boolean;
  /** Currently popular, on-trend, fashionable */
  isTrendy?: boolean;
  /** Widely available, common, popular */
  isMainstream?: boolean;
  /** Hard to find, exclusive, niche */
  isNiche?: boolean;

  // ============================================================
  // GROUP 11: EMOTIONAL TONE (6 attributes)
  // ============================================================
  /** Playful, funny, lighthearted, amusing */
  isWhimsical?: boolean;
  /** Formal, sophisticated, professional */
  isSerious?: boolean;
  /** Fun, entertaining, joyful */
  isPlayful?: boolean;
  /** Dignified, appropriate for formal occasions */
  isRespectful?: boolean;
  /** Exciting, invigorating, high-energy */
  isEnergetic?: boolean;
  /** Relaxing, peaceful, soothing, tranquil */
  isCalming?: boolean;
}

/**
 * Gift Archetypes (from Meaning Agent)
 *
 * Maps to the archetypes identified by the Meaning agent.
 * Each archetype has associated attributes.
 */
export type GiftArchetype =
  | 'practical'              // Solves problems, everyday utility
  | 'practical_luxury'       // Premium versions of practical items
  | 'experience'             // Activities, classes, events
  | 'sentimental'            // Emotional, personalized, meaningful
  | 'aspirational'           // Self-improvement, goals
  | 'social'                 // Shared experiences, entertaining
  | 'collectible'            // Art, rare items, investment
  | 'indulgent'              // Luxury treats, pampering
  | 'thoughtful';            // Shows deep understanding

/**
 * Archetype to Attribute Mapping (Expanded)
 *
 * Defines which attributes are associated with each archetype.
 * Used by Explorer agent to match products to meaning framework.
 * Now includes 3-7 attributes per archetype for more nuanced matching.
 */
export const ARCHETYPE_ATTRIBUTES: Record<GiftArchetype, (keyof GiftAttributes)[]> = {
  practical: [
    'isPractical',
    'isLastingValue',
    'isMultiFunctional',
    'isReadyToUse',
    'isEasyToMaintain',
    'isDurable'
  ],
  practical_luxury: [
    'isPractical',
    'isLuxury',
    'isLastingValue',
    'isElegant',
    'isHandcrafted',
    'isDurable',
    'isRepairable'
  ],
  experience: [
    'isExperiential',
    'isMemoryMaking',
    'isImmediateGratification',
    'isShared',
    'isActive'
  ],
  sentimental: [
    'isSentimental',
    'isPersonalized',
    'isMemoryMaking',
    'isHeartfelt',
    'isSymbolic',
    'isComforting'
  ],
  aspirational: [
    'isAspirational',
    'isEducational',
    'isInspirational',
    'isSkillBuilding',
    'isTransformative',
    'isCreative'
  ],
  social: [
    'isShared',
    'isConversationStarter',
    'isHostingRelated',
    'isFamilyFriendly',
    'isPartyFocused',
    'isPlayful'
  ],
  collectible: [
    'isArtistic',
    'isLastingValue',
    'isConversationStarter',
    'isUnique',
    'isLimitedEdition',
    'isVisuallyStriking',
    'isIconic'
  ],
  indulgent: [
    'isLuxury',
    'isConsumable',
    'isComforting',
    'isElegant',
    'isFragrant',
    'isPassive'
  ],
  thoughtful: [
    'isPersonalized',
    'isSentimental',
    'isHeartfelt',
    'isSymbolic',
    'isHandcrafted',
    'isUnique'
  ],
};

/**
 * Interest to Attribute Hints
 *
 * Provides hints for auto-tagging products based on interests.
 * Used by attribute extraction scripts.
 */
export const INTEREST_ATTRIBUTE_HINTS: Record<string, (keyof GiftAttributes)[]> = {
  // Experiential
  'cooking-class': ['isExperiential', 'isEducational'],
  'wine-tasting': ['isExperiential', 'isEducational'],
  'concert': ['isExperiential', 'isMemoryMaking'],
  'travel': ['isExperiential', 'isMemoryMaking'],

  // Practical
  'tools': ['isPractical', 'isLastingValue'],
  'kitchen': ['isPractical'],
  'organization': ['isPractical'],

  // Sentimental
  'photo': ['isSentimental', 'isMemoryMaking'],
  'personalized': ['isPersonalized', 'isSentimental'],
  'custom': ['isPersonalized'],

  // Artistic
  'art': ['isArtistic', 'isConversationStarter'],
  'sculpture': ['isArtistic', 'isLastingValue'],

  // Consumable
  'wine': ['isConsumable', 'isShared'],
  'coffee': ['isConsumable'],
  'chocolate': ['isConsumable', 'isLuxury'],
  'beauty': ['isConsumable'],
};

/**
 * Calculate attribute match score
 *
 * @param productAttributes - The product's gift attributes
 * @param archetype - The desired gift archetype from Meaning agent
 * @returns Score from 0-1 indicating how well the product matches the archetype
 */
export function calculateAttributeMatchScore(
  productAttributes: GiftAttributes,
  archetype: GiftArchetype
): number {
  const desiredAttributes = ARCHETYPE_ATTRIBUTES[archetype];

  if (!desiredAttributes || desiredAttributes.length === 0) {
    return 0;
  }

  let matchCount = 0;
  for (const attr of desiredAttributes) {
    if (productAttributes[attr] === true) {
      matchCount++;
    }
  }

  return matchCount / desiredAttributes.length;
}

/**
 * Get primary archetype for a product
 *
 * @param productAttributes - The product's gift attributes
 * @returns The archetype that best matches the product's attributes
 */
export function getPrimaryArchetype(productAttributes: GiftAttributes): GiftArchetype | null {
  let bestArchetype: GiftArchetype | null = null;
  let bestScore = 0;

  for (const archetype of Object.keys(ARCHETYPE_ATTRIBUTES) as GiftArchetype[]) {
    const score = calculateAttributeMatchScore(productAttributes, archetype);
    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  }

  return bestScore > 0 ? bestArchetype : null;
}

/**
 * Extract gift attributes from product data (keyword-based)
 *
 * @param product - Product with title, description, and interests
 * @returns Inferred gift attributes
 */
export function inferAttributesFromProduct(product: {
  title: string;
  description: string;
  interests?: string[];
}): Partial<GiftAttributes> {
  const attributes: Partial<GiftAttributes> = {};
  const text = `${product.title || ''} ${product.description || ''}`.toLowerCase();

  // Experiential indicators
  if (/(class|workshop|lesson|course|experience|ticket|subscription)/i.test(text)) {
    attributes.isExperiential = true;
  }

  // Personalized indicators
  if (/(personalized|custom|monogram|engraved|bespoke)/i.test(text)) {
    attributes.isPersonalized = true;
    attributes.isSentimental = true;
  }

  // Practical indicators
  if (/(tool|organizer|storage|practical|everyday|utility)/i.test(text)) {
    attributes.isPractical = true;
  }

  // Luxury indicators
  if (/(luxury|premium|high-end|deluxe|exclusive|artisan)/i.test(text)) {
    attributes.isLuxury = true;
  }

  // Consumable indicators
  if (/(food|wine|chocolate|coffee|tea|candle|beauty|cosmetic)/i.test(text)) {
    attributes.isConsumable = true;
  }

  // Luxury indicators (for indulgent archetype)
  if (/(luxury|premium|indulgent|deluxe|gourmet)/i.test(text)) {
    attributes.isLuxury = true;
  }

  // Educational indicators
  if (/(learn|educational|course|book|tutorial)/i.test(text)) {
    attributes.isEducational = true;
  }

  // Check interests for additional hints
  if (product.interests) {
    for (const interest of product.interests) {
      if (!interest) continue; // Skip null/undefined interests
      const hints = INTEREST_ATTRIBUTE_HINTS[interest.toLowerCase()];
      if (hints) {
        for (const hint of hints) {
          attributes[hint] = true;
        }
      }
    }
  }

  return attributes;
}

// Import comprehensive prompt generator
import { generateComprehensiveAttributePrompt } from './gift-attributes-prompt.js';

/**
 * Semantic Validation Rules
 * Ensures LLM output is logically consistent
 */
const MUTUALLY_EXCLUSIVE_PAIRS: [keyof GiftAttributes, keyof GiftAttributes][] = [
  ['isBudgetFriendly', 'isLuxury'],
  ['isBudgetFriendly', 'isSplurgeWorthy'],
  ['isCompact', 'isBulky'],
  ['isOneTimeUse', 'isLastingValue'],
  ['isMinimalist', 'isBold'],
  ['isSubtle', 'isVisuallyStriking'],
];

/**
 * Apply semantic validation to ensure logical consistency
 * @param attributes - Raw attributes from LLM
 * @param price - Product price for validation
 * @returns Validated and corrected attributes
 */
function applySemanticValidation(
  attributes: Partial<GiftAttributes>,
  price?: number
): Partial<GiftAttributes> {
  const validated = { ...attributes };

  // Rule 1: Resolve mutually exclusive pairs (keep stronger signal)
  for (const [attr1, attr2] of MUTUALLY_EXCLUSIVE_PAIRS) {
    if (validated[attr1] && validated[attr2]) {
      // For price-based conflicts, trust the price
      if ((attr1 === 'isBudgetFriendly' || attr2 === 'isBudgetFriendly') && price) {
        if (price <= 50) {
          validated['isBudgetFriendly'] = true;
          validated['isLuxury'] = false;
          validated['isSplurgeWorthy'] = false;
        } else if (price >= 150) {
          validated['isBudgetFriendly'] = false;
          validated['isSplurgeWorthy'] = true;
        } else if (price >= 100) {
          validated['isBudgetFriendly'] = false;
          validated['isLuxury'] = true;
        }
      } else {
        // For other conflicts, remove second attribute (arbitrary but consistent)
        validated[attr2] = false;
      }
    }
  }

  // Rule 2: Price-based validation
  if (price) {
    // Budget-friendly: under $50
    if (price > 50 && validated['isBudgetFriendly']) {
      validated['isBudgetFriendly'] = false;
    }
    if (price <= 50 && !validated['isBudgetFriendly']) {
      validated['isBudgetFriendly'] = true;
    }

    // Luxury: over $100
    if (price < 100 && validated['isLuxury']) {
      validated['isLuxury'] = false;
    }

    // Splurge-worthy: over $150
    if (price < 150 && validated['isSplurgeWorthy']) {
      validated['isSplurgeWorthy'] = false;
    }
    if (price >= 150) {
      validated['isSplurgeWorthy'] = true;
    }
  }

  // Rule 3: Conditional requirements
  // If collectible, should have lastingValue or isUnique
  if (validated['isCollectible'] && !validated['isLastingValue'] && !validated['isUnique']) {
    validated['isLastingValue'] = true;
  }

  // Rule 4: Indoor/Outdoor can both be true for versatile products
  // Active/Passive can both be true for multi-dimensional products
  // No change needed - these are not strictly exclusive

  return validated;
}

/**
 * Infer gift attributes using LLM with comprehensive 100-attribute analysis (GPT-4o-mini)
 *
 * @param product - Product with title, description, price, vendor, interests
 * @returns Inferred gift attributes from LLM analysis across 11 dimension groups
 */
export async function inferAttributesFromProductLLM(product: {
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  interests?: string[];
}): Promise<Partial<GiftAttributes>> {
  // Import here to avoid circular dependency
  const { chatCompletion } = await import('../lib/llm.js');
  const { logger } = await import('../lib/logger.js');

  try {
    // Use comprehensive 100-attribute prompt
    const prompt = generateComprehensiveAttributePrompt(product);

    const response = await chatCompletion({
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      jsonMode: true
    });

    // Parse JSON response
    const attributes = JSON.parse(response) as GiftAttributes;

    // Validate that all fields are booleans
    const validAttributes: Partial<GiftAttributes> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'boolean') {
        validAttributes[key as keyof GiftAttributes] = value;
      }
    }

    // Apply semantic validation to ensure logical consistency
    const semanticallyValidated = applySemanticValidation(validAttributes, product.price);

    return semanticallyValidated;

  } catch (error: any) {
    // Log error but don't throw - return empty attributes as fallback
    const { logger } = await import('../lib/logger.js');
    logger.error('Comprehensive LLM attribute inference failed', {
      error: error.message,
      productTitle: product.title
    });

    return {};
  }
}
