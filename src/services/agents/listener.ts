/**
 * Listener Agent
 *
 * Extracts deep context from user queries:
 * - Explicit facts (recipient, occasion, budget, interests)
 * - Inferred emotional context (tone, urgency, significance)
 */

import { BaseAgent } from './base';
import { ListenerInput, ListenerOutput } from '../../types/agents';
import { chatCompletion } from '../../lib/llm.js';

export class ListenerAgent extends BaseAgent<ListenerInput, ListenerOutput> {
  name = 'Listener';

  constructor() {
    super();
  }

  async process(input: ListenerInput): Promise<ListenerOutput> {
    this.log('Processing user query', { query: input.userQuery });

    try {
      const { result: extraction, timeMs } = await this.measure(() =>
        this.extractContext(input.userQuery)
      );

      this.log(`Context extraction completed in ${timeMs}ms`);

      return {
        ...extraction,
        userQuery: input.userQuery, // Preserve original query for downstream agents
        extractedAt: new Date(),
        confidence: this.calculateConfidence(extraction),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Extract context using Claude/GPT with enhanced extraction
   */
  private async extractContext(
    query: string
  ): Promise<Omit<ListenerOutput, 'extractedAt' | 'confidence'>> {
    const systemPrompt = `You are an expert at understanding gift-giving queries. Extract comprehensive structured information from the user's query, capturing explicit details AND subtle implicit context.

# EXTRACTION GOALS
Extract 95%+ of relevant information by identifying:
- Explicit facts (what user directly states)
- Implicit constraints (what user implies)
- Life context (situational clues about recipient's life)
- Relationship nuance (social appropriateness)
- Intent signals (user's underlying goals)
- Gift philosophy (what matters to the giver)

# CORE EXTRACTION

1. **recipient** (Recipient Details)
   - name, relationshipType, age, gender
   - count: If plural (e.g., "my parents"), set count to number of recipients

2. **occasion** (Occasion)
   - name, date, urgency (immediate|planned|future)
   - significance: major_life_event (birth, marriage, retirement) | annual_celebration (birthday, holiday) | small_gesture
   - IMPORTANT: Do NOT set occasion.name to generic terms like "gift", "present", or "for someone".
     If no explicit occasion is stated, leave occasion null/omitted or use { name: null, urgency: "unspecified" }.

3. **budget** (Budget)
   - min, max, flexibility (strict|flexible|unspecified)
   - Infer ranges if not explicit: "not too expensive" = {max: 40}, "nice gift" = {min: 50, max: 150}

4. **interests** (Basic Interests)
   - Array of explicitly mentioned interests

5. **values** and **constraints** (Basic Values & Constraints)
   - values: eco-friendly, local, handmade
   - constraints: hard requirements like "must be digital", "no alcohol"

# ENHANCED EXTRACTION (NEW)

6. **Enhanced Constraints** (enhancedConstraints)
   {
     "excluded": ["food", "tech", "clutter", "flashy"], // Extract from "no X", "nothing X", "avoid X"
     "required": ["eco-friendly", "practical", "small"], // Extract from "must be X", "needs to be X"
     "size": "small|medium|large", // Infer from "compact", "doesn't take space", "substantial"
     "timing": "urgent|planned|flexible", // "last minute", "tomorrow", "planning ahead"
     "space": "minimal|moderate|no_constraint" // "doesn't take space", "apartment living", "downsizing"
   }

7. **Life Context** (lifeContext)
   {
     "recentEvents": ["just retired", "new job", "moved", "new baby", "graduated"],
     "lifeStage": "young_professional|parent|retiree|student|midlife|empty_nester",
     "livingSituation": "apartment|house|dorm|downsizing|shared_space",
     "timeAvailability": "very_busy|busy|moderate|lots_of_time"
   }
   - Infer from context: "just had a baby" → very_busy, parent
   - "retired" → lots_of_time, retiree
   - "college student" → busy, dorm

8. **Relationship Depth** (relationshipDepth)
   {
     "type": "parent|partner|sibling|friend|coworker|acquaintance|boss|client",
     "closeness": "very_close|close|casual|professional|distant",
     "duration": "new|recent|years|lifetime",
     "appropriateness": {
       "personalGifts": true/false,  // coworker = false, close friend = true
       "expensiveGifts": true/false, // acquaintance = false, partner = true
       "intimateGifts": true/false,  // coworker = false, partner = true
       "humorousGifts": true/false   // boss = false, close friend = true
     }
   }
   - "coworker" → professional closeness, no intimate gifts
   - "best friend" → very_close, personal gifts ok
   - "distant relative" → distant closeness, safe gifts only

9. **Intent Signals** (intentSignals)
   {
     "showThought": true/false,  // "something special", "show I care"
     "impress": true/false,      // "wow them", "stand out", "make an impression"
     "safe": true/false,         // "can't go wrong", "appropriate", "safe choice"
     "unique": true/false,       // "different", "nobody else will give", "unique"
     "lastMinute": true/false,   // "urgent", "tomorrow", "forgot"
     "sentimental": true/false,  // "meaningful", "from the heart", "personal"
     "practical": true/false     // "useful", "will use", "needs", "practical"
   }

10. **Enhanced Interests** (enhancedInterests)
    {
      "explicit": [
        {
          "interest": "vintage vinyl records",  // Keep compound interests together
          "level": "enthusiast",  // casual|enthusiast|expert|professional
          "context": "recently started collecting"
        }
      ],
      "inferred": [
        {
          "interest": "wellness",
          "inferredFrom": "just started yoga",
          "confidence": 0.8
        }
      ],
      "antiInterests": ["crowds", "sweet foods", "loud music"]  // From "hates X", "doesn't like X"
    }
    - Extract level: "loves coffee" = enthusiast, "coffee snob" = expert
    - Infer related: "yoga" → wellness, mindfulness, fitness
    - Capture dislikes: "hates crowds" → antiInterests

11. **Gift Philosophy** (giftPhilosophy)
    {
      "valuesMeaning": true/false,         // "meaningful", "personal", "from the heart"
      "valuesPracticality": true/false,    // "useful", "will actually use", "needs"
      "valuesExperience": true/false,      // "memories", "experiences", "try new things"
      "valuesQuality": true/false,         // "nice", "quality", "well-made"
      "valuesUniqueness": true/false,      // "unique", "different", "one-of-a-kind"
      "valuesSustainability": true/false   // "eco-friendly", "sustainable", "ethical"
    }

12. **Ambiguities** (ambiguities)
    [
      {
        "field": "budget",
        "issue": "no budget specified",
        "suggestedClarification": "What's your budget range for this gift?"
      }
    ]
    - Flag missing critical info
    - Identify vague descriptions: "something nice" = ambiguous

# EMOTIONAL CONTEXT
- emotionalTone: excited|stressed|casual|formal|urgent
- confidenceLevel: certain|exploring|confused
- giftSignificance: major|moderate|small_gesture

# INFERENCE GUIDELINES
- Stay close to what user actually said
- Don't over-infer or make wild assumptions
- Mark inferred items with confidence scores
- For ambiguities, suggest clarifying questions

# OUTPUT FORMAT
Return valid JSON matching the enhanced ListenerOutput schema. Only include fields with actual data.`;

    const content = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.3,
      jsonMode: true,
    });

    return JSON.parse(content);
  }

  /**
   * Calculate confidence score based on extraction completeness
   * Enhanced to account for new enriched fields
   */
  private calculateConfidence(
    extraction: Omit<ListenerOutput, 'extractedAt' | 'confidence'>
  ): number {
    let score = 0;
    let maxScore = 0;

    // Recipient info (20% weight) - reduced from 30% as we have more fields now
    maxScore += 20;
    if (extraction.recipient) {
      score += 7;
      if (extraction.recipient.relationshipType) score += 7;
      if (extraction.recipient.age || extraction.recipient.gender) score += 6;
    }

    // Budget (15% weight) - reduced from 20%
    maxScore += 15;
    if (extraction.budget) {
      score += 7;
      if (extraction.budget.min > 0 && extraction.budget.max > 0) score += 8;
    }

    // Interests (15% weight) - reduced from 25%
    maxScore += 15;
    if (extraction.interests && extraction.interests.length > 0) {
      score += Math.min(15, extraction.interests.length * 5);
    }

    // Occasion (10% weight) - reduced from 15%
    maxScore += 10;
    if (extraction.occasion) {
      score += 10;
    }

    // Values and constraints (5% weight) - reduced from 10%
    maxScore += 5;
    if (extraction.values && extraction.values.length > 0) score += 2.5;
    if (extraction.constraints && extraction.constraints.length > 0) score += 2.5;

    // NEW: Enhanced constraints (10% weight)
    maxScore += 10;
    if (extraction.enhancedConstraints) {
      if (extraction.enhancedConstraints.excluded?.length) score += 3;
      if (extraction.enhancedConstraints.required?.length) score += 3;
      if (extraction.enhancedConstraints.size) score += 2;
      if (extraction.enhancedConstraints.timing) score += 2;
    }

    // NEW: Life context (10% weight)
    maxScore += 10;
    if (extraction.lifeContext) {
      if (extraction.lifeContext.recentEvents?.length) score += 3;
      if (extraction.lifeContext.lifeStage) score += 3;
      if (extraction.lifeContext.livingSituation) score += 2;
      if (extraction.lifeContext.timeAvailability) score += 2;
    }

    // NEW: Relationship depth (5% weight)
    maxScore += 5;
    if (extraction.relationshipDepth) {
      score += 2;
      if (extraction.relationshipDepth.appropriateness) score += 3;
    }

    // NEW: Intent signals (5% weight)
    maxScore += 5;
    if (extraction.intentSignals) {
      const trueCount = Object.values(extraction.intentSignals).filter(Boolean).length;
      score += Math.min(5, trueCount * 1);
    }

    // NEW: Enhanced interests (5% weight)
    maxScore += 5;
    if (extraction.enhancedInterests) {
      if (extraction.enhancedInterests.explicit?.length) score += 3;
      if (extraction.enhancedInterests.inferred?.length) score += 1;
      if (extraction.enhancedInterests.antiInterests?.length) score += 1;
    }

    // NEW: Gift philosophy (5% weight)
    maxScore += 5;
    if (extraction.giftPhilosophy) {
      const trueCount = Object.values(extraction.giftPhilosophy).filter(Boolean).length;
      score += Math.min(5, trueCount * 1);
    }

    return Math.min(1.0, score / maxScore);
  }
}
