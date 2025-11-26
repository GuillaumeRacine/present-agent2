/**
 * Meaning Agent (Enhanced)
 *
 * Identifies what would be emotionally meaningful for this gift with:
 * - Value-based matching (practical, sentimental, experiential, etc.)
 * - Multi-archetype support with weighted scoring
 * - Interest strength scoring with confidence levels
 * - Gift attribute utilization for better matching
 */

import { BaseAgent } from './base';
import {
  MeaningInput,
  MeaningOutput,
  GiftValueDimension,
  ScoredInterest,
  ArchetypeWeights,
  AttributeAlignment
} from '../../types/agents';
import { ARCHETYPE_ATTRIBUTES, GiftArchetype } from '../../types/gift-attributes';
import { expandInterests, getRelatedInterests } from '../../lib/interest-synonyms';
import OpenAI from 'openai';

export class MeaningAgent extends BaseAgent<MeaningInput, MeaningOutput> {
  name = 'Meaning';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: MeaningInput): Promise<MeaningOutput> {
    this.log('Identifying meaningful gift criteria (enhanced)');

    try {
      const framework = await this.identifyMeaningFramework(input.constraintsContext);

      // Post-process to add enhanced features
      const enhanced = this.enhanceMeaningFramework(framework, input.constraintsContext);

      return {
        constraintsContext: input.constraintsContext,
        meaningFramework: enhanced.meaningFramework,
        resonanceCriteria: enhanced.resonanceCriteria,
        discoveryHints: enhanced.discoveryHints,
        identifiedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Enhance meaning framework with value-based matching, multi-archetype support,
   * interest strength scoring, and gift attribute utilization
   */
  private enhanceMeaningFramework(framework: any, context: any): any {
    this.log('Enhancing meaning framework with advanced features');

    // Extract context
    const relationship = context.relationshipContext?.relationshipAnalysis;
    const occasion = context.relationshipContext?.memoryContext?.listenerContext?.occasion;
    const userQuery = context.relationshipContext?.memoryContext?.listenerContext?.userQuery || '';
    const interests = context.relationshipContext?.memoryContext?.listenerContext?.interests || [];

    // 1. Infer value preferences
    const valuePreferences = this.inferValuePreferences(
      framework.meaningFramework.giftArchetype,
      framework.meaningFramework.secondaryArchetype,
      relationship,
      occasion,
      userQuery
    );

    // 2. Calculate multi-archetype weights
    const archetypeWeights = this.calculateArchetypeWeights(
      framework.meaningFramework.giftArchetype,
      framework.meaningFramework.archetypeConfidence,
      framework.meaningFramework.secondaryArchetype,
      framework.meaningFramework.secondaryConfidence,
      valuePreferences
    );

    // 3. Score interests with strength and confidence
    // Use interest expansion to normalize and expand interests
    const expandedExplicitInterests = expandInterests(interests);
    const expandedDiscoveryInterests = expandInterests(framework.discoveryHints.interestPathways || []);

    const scoredInterests = this.scoreInterests(
      expandedExplicitInterests,
      expandedDiscoveryInterests,
      relationship,
      occasion,
      userQuery
    );

    // 3b. Add related interests based on scored interests
    const relatedInterests = scoredInterests
      .filter(si => si.confidence >= 0.7) // Only get related for high-confidence interests
      .flatMap(si => getRelatedInterests(si.interest))
      .filter((interest, index, self) => self.indexOf(interest) === index); // Deduplicate

    this.log(`Interest expansion: ${interests.length} → ${expandedExplicitInterests.length} canonical, +${relatedInterests.length} related`);

    // 4. Identify desired gift attributes
    const desiredAttributes = this.identifyDesiredAttributes(
      framework.meaningFramework.giftArchetype,
      archetypeWeights,
      valuePreferences,
      framework.constraints
    );

    // Log enhancements
    this.log(`Value preferences: ${valuePreferences.length} dimensions identified`);
    this.log(`Archetype weights: ${Object.keys(archetypeWeights).length} archetypes weighted`);
    this.log(`Scored interests: ${scoredInterests.length} interests with confidence`);
    this.log(`Desired attributes: ${desiredAttributes.length} gift attributes identified`);

    // Return enhanced framework
    return {
      meaningFramework: {
        ...framework.meaningFramework,
        archetypeWeights,
        valuePreferences,
      },
      resonanceCriteria: framework.resonanceCriteria,
      discoveryHints: {
        ...framework.discoveryHints,
        // Replace interestPathways with expanded interests
        interestPathways: [
          ...expandedExplicitInterests,
          ...expandedDiscoveryInterests,
          ...relatedInterests,
        ].filter((interest, index, self) => self.indexOf(interest) === index), // Deduplicate
        scoredInterests,
        desiredAttributes,
      },
    };
  }

  /**
   * Infer value preferences from relationship, occasion, and explicit mentions
   */
  private inferValuePreferences(
    primaryArchetype: string,
    secondaryArchetype: string | undefined,
    relationship: any,
    occasion: any,
    userQuery: string
  ): Array<{ dimension: GiftValueDimension; strength: number; inferredFrom: string }> {
    const preferences: Array<{ dimension: GiftValueDimension; strength: number; inferredFrom: string }> = [];

    // Explicit mentions in query (highest priority)
    const queryLower = userQuery.toLowerCase();

    if (/\b(useful|practical|functional|needs?)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'practical',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "practical/useful" in query',
      });
    }

    if (/\b(meaningful|sentimental|special|memory|heart)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'sentimental',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "meaningful/sentimental" in query',
      });
    }

    if (/\b(experience|class|lesson|activity|adventure|do together)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'experiential',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "experience/activity" in query',
      });
    }

    if (/\b(luxury|luxurious|premium|indulgent|pamper|treat|splurge)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'luxurious',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "luxury/indulgent" in query',
      });
    }

    if (/\b(creative|artistic|unique|one-of-a-kind|handmade)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'creative',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "creative/artistic" in query',
      });
    }

    if (/\b(learn|educational|skill|course|book|study)\b/i.test(queryLower)) {
      preferences.push({
        dimension: 'educational',
        strength: 1.0,
        inferredFrom: 'Explicitly mentioned "learning/educational" in query',
      });
    }

    // Infer from relationship type (medium priority)
    if (relationship?.type) {
      const relType = relationship.type.toLowerCase();

      if (['parent', 'mother', 'father', 'mom', 'dad'].some(t => relType.includes(t))) {
        preferences.push({
          dimension: 'sentimental',
          strength: 0.7,
          inferredFrom: 'Parent relationship typically values sentimental gifts',
        });
      }

      if (['colleague', 'coworker', 'boss', 'client'].some(t => relType.includes(t))) {
        preferences.push({
          dimension: 'practical',
          strength: 0.7,
          inferredFrom: 'Professional relationship typically values practical gifts',
        });
      }

      if (['partner', 'spouse', 'boyfriend', 'girlfriend', 'romantic'].some(t => relType.includes(t))) {
        preferences.push({
          dimension: 'luxurious',
          strength: 0.6,
          inferredFrom: 'Romantic relationship often appreciates luxurious gifts',
        });
        preferences.push({
          dimension: 'experiential',
          strength: 0.6,
          inferredFrom: 'Romantic relationship values shared experiences',
        });
      }
    }

    // Infer from occasion (lower priority)
    if (occasion?.name) {
      const occName = occasion.name.toLowerCase();

      if (['retirement', 'milestone', 'graduation'].some(o => occName.includes(o))) {
        preferences.push({
          dimension: 'sentimental',
          strength: 0.5,
          inferredFrom: `Milestone occasion (${occasion.name}) suits sentimental gifts`,
        });
      }

      if (['birthday'].some(o => occName.includes(o))) {
        preferences.push({
          dimension: 'experiential',
          strength: 0.5,
          inferredFrom: 'Birthdays often suit experiential gifts',
        });
      }

      if (['christmas', 'holiday'].some(o => occName.includes(o))) {
        preferences.push({
          dimension: 'practical',
          strength: 0.4,
          inferredFrom: 'Holiday gifts often have practical focus',
        });
      }
    }

    // Deduplicate and merge strengths
    const merged = new Map<GiftValueDimension, { strength: number; reasons: string[] }>();

    for (const pref of preferences) {
      if (merged.has(pref.dimension)) {
        const existing = merged.get(pref.dimension)!;
        // Take max strength and combine reasons
        existing.strength = Math.max(existing.strength, pref.strength);
        existing.reasons.push(pref.inferredFrom);
      } else {
        merged.set(pref.dimension, {
          strength: pref.strength,
          reasons: [pref.inferredFrom],
        });
      }
    }

    // Convert back to array
    return Array.from(merged.entries())
      .map(([dimension, data]) => ({
        dimension,
        strength: data.strength,
        inferredFrom: data.reasons.join('; '),
      }))
      .sort((a, b) => b.strength - a.strength); // Sort by strength descending
  }

  /**
   * Calculate multi-archetype weights combining primary, secondary, and value preferences
   */
  private calculateArchetypeWeights(
    primaryArchetype: string,
    primaryConfidence: number,
    secondaryArchetype: string | undefined,
    secondaryConfidence: number | undefined,
    valuePreferences: Array<{ dimension: GiftValueDimension; strength: number; inferredFrom: string }>
  ): ArchetypeWeights {
    const weights: ArchetypeWeights = {};

    // Primary archetype gets highest weight
    weights[primaryArchetype] = primaryConfidence;

    // Secondary archetype if present
    if (secondaryArchetype && secondaryConfidence) {
      weights[secondaryArchetype] = secondaryConfidence * 0.8; // Slightly lower than primary
    }

    // Add weights from value preferences
    // Map value dimensions to archetypes
    const valueToArchetype: Record<GiftValueDimension, GiftArchetype[]> = {
      practical: ['practical', 'practical_luxury'],
      sentimental: ['sentimental', 'thoughtful'],
      experiential: ['experience'],
      luxurious: ['indulgent', 'practical_luxury'],
      creative: ['collectible', 'thoughtful'],
      educational: ['aspirational'],
    };

    for (const pref of valuePreferences) {
      const archetypes = valueToArchetype[pref.dimension] || [];
      for (const archetype of archetypes) {
        // Boost weight if archetype aligns with value preference
        if (weights[archetype]) {
          weights[archetype] = Math.min(1.0, weights[archetype] + pref.strength * 0.2);
        } else {
          weights[archetype] = pref.strength * 0.5; // Add new archetype with moderate weight
        }
      }
    }

    // Normalize weights to sum to 1.0
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const key in weights) {
        weights[key] = weights[key] / total;
      }
    }

    return weights;
  }

  /**
   * Score interests with strength and confidence based on source
   */
  private scoreInterests(
    explicitInterests: string[],
    discoveryInterests: string[],
    relationship: any,
    occasion: any,
    userQuery: string
  ): ScoredInterest[] {
    const scored: ScoredInterest[] = [];
    const seen = new Set<string>();

    // Explicitly mentioned interests (highest confidence)
    for (const interest of explicitInterests) {
      if (!interest || seen.has(interest.toLowerCase())) continue;
      seen.add(interest.toLowerCase());

      scored.push({
        interest,
        strength: 1.0,
        source: 'explicit',
        confidence: 1.0,
      });
    }

    // Discovery pathway interests (from LLM extraction)
    for (const interest of discoveryInterests) {
      if (!interest || seen.has(interest.toLowerCase())) continue;
      seen.add(interest.toLowerCase());

      // Determine if this was explicit or inferred
      const isInQuery = new RegExp(`\\b${interest}\\b`, 'i').test(userQuery);

      if (isInQuery) {
        scored.push({
          interest,
          strength: 1.0,
          source: 'explicit',
          confidence: 0.95,
        });
      } else {
        scored.push({
          interest,
          strength: 0.8,
          source: 'inferred',
          confidence: 0.7,
        });
      }
    }

    // Infer interests from relationship
    if (relationship?.type) {
      const relType = relationship.type.toLowerCase();

      // Life stage interests
      if (['parent', 'mother', 'father'].some(t => relType.includes(t))) {
        const lifeStageInterests = ['family', 'home', 'memories', 'quality-time'];
        for (const interest of lifeStageInterests) {
          if (seen.has(interest)) continue;
          seen.add(interest);

          scored.push({
            interest,
            strength: 0.6,
            source: 'relationship',
            confidence: 0.7,
          });
        }
      }

      if (['colleague', 'coworker', 'boss'].some(t => relType.includes(t))) {
        const professionalInterests = ['professional-development', 'office', 'productivity'];
        for (const interest of professionalInterests) {
          if (seen.has(interest)) continue;
          seen.add(interest);

          scored.push({
            interest,
            strength: 0.5,
            source: 'relationship',
            confidence: 0.6,
          });
        }
      }
    }

    // Infer interests from occasion
    if (occasion?.name) {
      const occName = occasion.name.toLowerCase();

      if (['retirement'].some(o => occName.includes(o))) {
        const retirementInterests = ['leisure', 'relaxation', 'hobbies', 'travel'];
        for (const interest of retirementInterests) {
          if (seen.has(interest)) continue;
          seen.add(interest);

          scored.push({
            interest,
            strength: 0.5,
            source: 'occasion',
            confidence: 0.5,
          });
        }
      }

      if (['anniversary'].some(o => occName.includes(o))) {
        const anniversaryInterests = ['romance', 'celebration', 'memories'];
        for (const interest of anniversaryInterests) {
          if (seen.has(interest)) continue;
          seen.add(interest);

          scored.push({
            interest,
            strength: 0.5,
            source: 'occasion',
            confidence: 0.5,
          });
        }
      }
    }

    return scored.sort((a, b) => b.strength - a.strength); // Sort by strength descending
  }

  /**
   * Identify desired gift attributes based on archetypes and value preferences
   */
  private identifyDesiredAttributes(
    primaryArchetype: string,
    archetypeWeights: ArchetypeWeights,
    valuePreferences: Array<{ dimension: GiftValueDimension; strength: number; inferredFrom: string }>,
    constraints: any
  ): AttributeAlignment[] {
    const attributes: AttributeAlignment[] = [];
    const seen = new Set<string>();

    // Get attributes for each weighted archetype
    for (const [archetype, weight] of Object.entries(archetypeWeights)) {
      const archetypeAttrs = ARCHETYPE_ATTRIBUTES[archetype as GiftArchetype];

      if (archetypeAttrs) {
        for (const attr of archetypeAttrs) {
          if (seen.has(attr)) continue;
          seen.add(attr);

          attributes.push({
            attribute: attr,
            desirability: weight,
            reason: `Aligns with ${archetype} archetype (weight: ${weight.toFixed(2)})`,
          });
        }
      }
    }

    // Add attributes from value preferences
    const valueDimensionToAttributes: Record<GiftValueDimension, string[]> = {
      practical: ['isPractical', 'isLastingValue', 'isMultiFunctional', 'isDurable'],
      sentimental: ['isSentimental', 'isPersonalized', 'isMemoryMaking', 'isHeartfelt'],
      experiential: ['isExperiential', 'isMemoryMaking', 'isShared', 'isActive'],
      luxurious: ['isLuxury', 'isElegant', 'isSplurgeWorthy', 'isComforting'],
      creative: ['isArtistic', 'isCreative', 'isUnique', 'isHandcrafted'],
      educational: ['isEducational', 'isSkillBuilding', 'isAspirational', 'isInspirational'],
    };

    for (const pref of valuePreferences) {
      const attrs = valueDimensionToAttributes[pref.dimension] || [];
      for (const attr of attrs) {
        if (seen.has(attr)) {
          // Boost existing attribute
          const existing = attributes.find(a => a.attribute === attr);
          if (existing) {
            existing.desirability = Math.min(1.0, existing.desirability + pref.strength * 0.2);
            existing.reason += `; Boosted by ${pref.dimension} value preference`;
          }
        } else {
          seen.add(attr);
          attributes.push({
            attribute: attr,
            desirability: pref.strength * 0.7,
            reason: `Aligns with ${pref.dimension} value preference`,
          });
        }
      }
    }

    // Handle constraints (boost/penalize certain attributes)
    if (constraints?.spaceConsiderations === 'minimalist' || constraints?.spaceConsiderations === 'compact') {
      // Boost compact, penalize bulky
      const compact = attributes.find(a => a.attribute === 'isCompact');
      if (compact) {
        compact.desirability = Math.min(1.0, compact.desirability + 0.3);
        compact.reason += '; User prefers space-saving gifts';
      } else {
        attributes.push({
          attribute: 'isCompact',
          desirability: 0.8,
          reason: 'User has space constraints (minimalist/compact preference)',
        });
      }

      // Mark bulky as undesirable
      attributes.push({
        attribute: 'isBulky',
        desirability: 0.0,
        reason: 'User explicitly wants compact/minimalist gifts',
      });
    }

    if (constraints?.sustainabilityLevel === 'required' || constraints?.sustainabilityLevel === 'preferred') {
      const strength = constraints.sustainabilityLevel === 'required' ? 1.0 : 0.7;

      const sustainableAttrs = ['isEcoFriendly', 'isHandcrafted', 'isLocal', 'isEthicallySourced'];
      for (const attr of sustainableAttrs) {
        if (seen.has(attr)) {
          const existing = attributes.find(a => a.attribute === attr);
          if (existing) {
            existing.desirability = Math.min(1.0, existing.desirability + strength * 0.3);
            existing.reason += '; Sustainability is important to user';
          }
        } else {
          attributes.push({
            attribute: attr,
            desirability: strength * 0.8,
            reason: `User ${constraints.sustainabilityLevel === 'required' ? 'requires' : 'prefers'} sustainable gifts`,
          });
        }
      }
    }

    // Sort by desirability descending
    return attributes.sort((a, b) => b.desirability - a.desirability);
  }

  private async identifyMeaningFramework(context: any) {
    // Extract relevant context with optional chaining for parallel execution safety
    const recipient = context.relationshipContext?.memoryContext?.listenerContext?.recipient;
    const interests = context.relationshipContext?.memoryContext?.listenerContext?.interests || [];
    const values = context.relationshipContext?.memoryContext?.listenerContext?.values || {};
    const occasion = context.relationshipContext?.memoryContext?.listenerContext?.occasion;
    const relationship = context.relationshipContext?.relationshipAnalysis;
    const userQuery = context.relationshipContext?.memoryContext?.listenerContext?.userQuery || '';
    const constraints = context.relationshipContext?.memoryContext?.listenerContext?.constraints || [];

    const systemPrompt = `You are an expert at understanding what makes gifts meaningful and identifying gift archetypes from user intent.

## CRITICAL: ARCHETYPE IDENTIFICATION

Analyze the user's query and context to identify the PRIMARY gift archetype with HIGH CONFIDENCE.
Pay special attention to explicit markers and implicit signals:

### EXPERIENTIAL MARKERS (archetype: "experience")
- Explicit: "experience", "class", "lesson", "workshop", "course", "subscription", "membership", "tickets"
- Implicit: "do together", "try something new", "learn", "activity", "adventure"
- Context: User mentions wanting something NOT physical, creating memories, or spending time
- Example: "something experiential" → experience (0.95 confidence)
- Example: "cooking class" → experience (0.90 confidence)
- Example: "something we can do together" → experience (0.85 confidence)

### SENTIMENTAL MARKERS (archetype: "sentimental")
- Explicit: "meaningful", "personal", "sentimental", "special", "memory", "keepsake"
- Implicit: mentions specific memories, inside jokes, relationship history
- Context: important occasions (anniversary, milestone birthday), emotional tone
- Example: "something meaningful" → sentimental (0.90 confidence)
- Example: "to remember this by" → sentimental (0.85 confidence)

### PRACTICAL MARKERS (archetype: "practical" or "practical_luxury")
- Explicit: "useful", "practical", "needs", "will use", "everyday", "functional"
- Implicit: mentions specific problems to solve, daily routines, current needs
- Context: mentions "quality" or "nice" with practical → practical_luxury
- Example: "something practical" → practical (0.90 confidence)
- Example: "something practical but nice" → practical_luxury (0.85 confidence)
- Example: "needs a good [item]" → practical (0.80 confidence)

### LUXURY/INDULGENT MARKERS (archetype: "indulgent")
- Explicit: "luxury", "indulgent", "pamper", "treat", "splurge", "premium", "high-end"
- Implicit: "deserves", "special treat", "spoil"
- Context: combined with consumables (spa, wine, chocolates) or self-care
- Example: "something luxurious" → indulgent (0.90 confidence)

### ASPIRATIONAL MARKERS (archetype: "aspirational")
- Explicit: "goals", "learning", "growth", "improvement", "skill", "hobby"
- Implicit: mentions new interests they want to explore, career development
- Context: "getting into", "wants to learn", "inspired by"
- Example: "help them get better at photography" → aspirational (0.85 confidence)

### MINIMALIST/SPACE-CONSCIOUS (modifies archetype)
- Markers: "small", "doesn't take space", "minimalist", "downsizing", "compact"
- Impact: Boosts "experience" archetype, penalizes "collectible"
- Example: "something small and meaningful" → sentimental + experience secondary (0.80 confidence)

### SUSTAINABILITY MARKERS (influences archetype + values)
- Markers: "eco-friendly", "sustainable", "ethical", "local", "handmade", "artisan"
- Impact: Adds to coreValues, influences toward thoughtful/aspirational
- Example: "eco-friendly gift" → aspirational or thoughtful (0.75 confidence)

## ARCHETYPE CONFIDENCE SCORING

Rate confidence 0.0-1.0:
- 0.9-1.0: Explicit archetype mentioned ("experience", "practical")
- 0.8-0.89: Strong implicit signals (multiple markers present)
- 0.7-0.79: Moderate signals (some markers, clear context)
- 0.6-0.69: Weak signals (inferred from limited context)
- Below 0.6: Default to "thoughtful" when uncertain

## SECONDARY ARCHETYPE

If confidence in primary > 0.7 AND there are clear signals for another archetype, include secondary:
- Example: "meaningful experience" → primary: experience (0.9), secondary: sentimental (0.85)
- Example: "practical but nice" → primary: practical_luxury (0.85), secondary: practical (0.80)

## EXCLUSIONS AND CONSTRAINTS

Extract explicit exclusions and constraints:
- "no food" → exclusions: ["food", "consumables", "perishables"]
- "nothing that takes space" → exclusions: ["furniture", "large items"], prefer: ["experience", "digital", "consumables"]
- "no tech" → exclusions: ["electronics", "gadgets", "technology"]
- "must be eco-friendly" → requirements: ["sustainable", "eco-friendly", "ethical"]

## INTEREST PATHWAY EXTRACTION

Extract interests more intelligently:

### Simple Keywords (as before)
- "loves wine" → ["wine"]
- "into coffee" → ["coffee"]

### Compound Interests (NEW)
- "vintage vinyl records" → ["vinyl", "records", "vintage", "music", "collecting"]
- "true crime podcasts" → ["podcasts", "true-crime", "mysteries", "audio"]
- "Italian cooking" → ["cooking", "italian", "cuisine", "culinary"]

### Implicit Interests from Life Context (NEW)
- "just retired" → ["leisure", "relaxation", "hobbies", "travel", "time", "freedom"]
- "new parent" → ["parenting", "family", "memories", "keepsakes", "practical"]
- "downsizing" → ["minimalism", "experiences", "space-saving", "decluttering"]
- "health kick" → ["fitness", "wellness", "nutrition", "self-improvement"]

### Interest Inference from Occasion
- "anniversary" + "wine lover" → ["romance", "wine", "celebration", "memories"]
- "graduation" + "tech" → ["career", "professional", "technology", "achievement"]

## JSON RESPONSE FORMAT

{
  "meaningFramework": {
    "giftArchetype": "experience|sentimental|practical|practical_luxury|aspirational|social|collectible|indulgent|thoughtful",
    "archetypeConfidence": 0.85,
    "secondaryArchetype": "sentimental|null",
    "secondaryConfidence": 0.70,
    "archetypeReasons": [
      "User explicitly mentioned 'experiential'",
      "Query contains experience markers: 'class', 'learn'",
      "Context suggests memory-making over physical objects"
    ],
    "emotionalMessage": "What this gift should communicate emotionally",
    "coreValues": ["sustainability", "quality", "thoughtfulness"],
    "personalRelevance": {
      "connectsToInterests": ["cooking", "italian-cuisine", "culinary-arts"],
      "addressesNeeds": ["learning new skills", "quality time together"],
      "celebratesPersonality": "Their adventurous spirit and love of learning"
    }
  },
  "resonanceCriteria": {
    "functionalNeeds": ["practical utility if relevant"],
    "aspirationalNeeds": ["goals they aspire to"],
    "emotionalNeeds": ["joy", "connection", "pride"],
    "socialNeeds": ["belonging", "status", "identity"]
  },
  "constraints": {
    "explicitExclusions": ["food", "perishables"],
    "implicitExclusions": ["large items"],
    "requirements": ["eco-friendly", "sustainable"],
    "spaceConsiderations": "minimalist|compact|normal|statement-piece",
    "sustainabilityLevel": "required|preferred|neutral"
  },
  "discoveryHints": {
    "semanticQueries": [
      "cooking experiences near me",
      "Italian cooking classes",
      "culinary workshops for couples"
    ],
    "interestPathways": ["cooking", "italian", "cuisine", "culinary", "food", "learning"],
    "archetypeFilters": ["experience", "aspirational"]
  }
}

## IMPORTANT RULES

1. ALWAYS provide archetypeConfidence (never omit)
2. ONLY include secondaryArchetype if confidence > 0.7 AND signals are clear
3. archetypeReasons should be SPECIFIC to the user's query (quote their words)
4. Extract ALL exclusions explicitly mentioned ("no X" → exclusions)
5. Infer implicit exclusions from constraints ("doesn't take space" → exclude large items)
6. For compound interests, break down into components AND keep compound form
7. Always infer interests from life context clues (retired, new parent, etc.)
8. Default to "thoughtful" ONLY when confidence < 0.6 in all other archetypes`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            userQuery,
            recipient,
            interests,
            values,
            occasion,
            relationship,
            constraints
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Reduced for more consistent archetype identification
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }
}
