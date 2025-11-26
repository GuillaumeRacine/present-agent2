/**
 * Meaning Agent
 *
 * Identifies what would be emotionally meaningful for this gift
 */

import { BaseAgent } from './base';
import { MeaningInput, MeaningOutput } from '../../types/agents';
import OpenAI from 'openai';

export class MeaningAgent extends BaseAgent<MeaningInput, MeaningOutput> {
  name = 'Meaning';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: MeaningInput): Promise<MeaningOutput> {
    this.log('Identifying meaningful gift criteria');

    try {
      const framework = await this.identifyMeaningFramework(input.constraintsContext);

      return {
        constraintsContext: input.constraintsContext,
        meaningFramework: framework.meaningFramework,
        resonanceCriteria: framework.resonanceCriteria,
        discoveryHints: framework.discoveryHints,
        identifiedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
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
