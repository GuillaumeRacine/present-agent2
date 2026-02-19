/**
 * Storyteller Agent
 *
 * Crafts personal 2-3 sentence reasoning for each recommendation
 */

import { BaseAgent } from './base';
import { StorytellerInput, StorytellerOutput, ProductStory } from '../../types/agents';
import OpenAI from 'openai';

export class StorytellerAgent extends BaseAgent<StorytellerInput, StorytellerOutput> {
  name = 'Storyteller';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: StorytellerInput): Promise<StorytellerOutput> {
    this.log('Crafting personal reasoning');

    try {
      const candidates = input.validatorContext.validatedCandidates;

      // Generate stories for each candidate
      const stories = await Promise.all(
        candidates.map((candidate) => this.craftStory(candidate, input.validatorContext))
      );

      return {
        validatorContext: input.validatorContext,
        stories,
        craftedAt: new Date(),
        avgStoryLength:
          stories.reduce((sum, s) => sum + s.reasoning.length, 0) / stories.length,
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private async craftStory(candidate: any, context: any): Promise<ProductStory> {
    // Extract relevant context with optional chaining for safety
    const memoryContext = context.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.memoryContext;
    const recipient = memoryContext?.listenerContext?.recipient;
    const interests = memoryContext?.listenerContext?.interests || [];
    const meaningFramework = context.explorerContext?.meaningContext?.meaningFramework;
    const relationship =
      context.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.relationshipAnalysis;
    // Values is now an object with boolean flags, convert to array of truthy keys
    const valuesObj = memoryContext?.listenerContext?.values || {};
    const values = typeof valuesObj === 'object' && !Array.isArray(valuesObj)
      ? Object.keys(valuesObj).filter(k => valuesObj[k] === true)
      : [];
    const occasion = memoryContext?.listenerContext?.occasion;

    // NEW: Extract giver profile — but only if it has meaningful data
    // The giver-profiler always returns a profile object, even for first-time users
    // with default/placeholder values. We treat low-confidence profiles as absent
    // to avoid "As an unknown shopper" leakage in the reasoning.
    const rawGiverProfile = memoryContext?.giverProfile;
    const giverProfile = rawGiverProfile &&
      rawGiverProfile.confidence?.data_quality > 0 &&
      rawGiverProfile.shoppingStyle?.typical_timing !== 'unknown'
        ? rawGiverProfile
        : null;
    const enrichedRecipient = memoryContext?.enrichedRecipient;

    // Build rich recipient context for personalization
    const recipientContext = {
      name: recipient?.name || 'them',
      age: recipient?.age,
      lifeStage: enrichedRecipient?.life_context?.life_stage || recipient?.lifeStage || 'unknown',
      recentEvents: enrichedRecipient?.life_context?.recent_life_events || recipient?.recentLifeEvents || [],
      interests: enrichedRecipient?.interests?.map((i: any) => i.name) || interests,
      values: enrichedRecipient?.values?.map((v: any) => v.name) || values,
      personality: recipient?.personality || {},
      dislikes: enrichedRecipient?.dislikes?.explicit || recipient?.dislikes || [],
    };

    // NEW: Build giver context for personalization
    const giverContext = giverProfile ? {
      shopping_style: giverProfile.shoppingStyle.typical_timing,
      typical_budget: `$${giverProfile.shoppingStyle.budget_patterns.overall_range.min}-$${giverProfile.shoppingStyle.budget_patterns.overall_range.max}`,
      giving_values: giverProfile.givingPhilosophy.primary_values,
      personalization_importance: giverProfile.givingPhilosophy.personalization_importance,
      sentimentality: giverProfile.givingPhilosophy.sentimentality_score,
      preferred_attributes: giverProfile.givingPhilosophy.important_attributes,
    } : null;

    const systemPrompt = `You are a thoughtful friend helping someone find the perfect gift.

Craft a personal 2-3 sentence explanation for why this product would be a great gift.

${giverContext ? `
DUAL-CONTEXT PERSONALIZATION IS CRITICAL:
Your explanation must weave together BOTH the giver's giving style AND the recipient's needs/interests.
This creates uniquely personal reasoning that shows you understand both people in the relationship.
` : `
RECIPIENT-FOCUSED PERSONALIZATION:
Focus entirely on why this product is perfect for the recipient. Do NOT mention the giver at all — no "As a shopper", no "As an unknown shopper", no "you'll appreciate". Just explain why the RECIPIENT will love this gift based on their interests, personality, and needs.
`}
${giverContext ? `
GIVER CONTEXT (THE PERSON GIVING THE GIFT):
- Shopping style: ${giverContext.shopping_style} shopper
- Budget range: ${giverContext.typical_budget}
- Core giving values: ${giverContext.giving_values.join(', ')}
- Personalization importance: ${(giverContext.personalization_importance * 100).toFixed(0)}%
- Sentimentality: ${(giverContext.sentimentality * 100).toFixed(0)}% (0=practical, 100=sentimental)
- Important attributes: ${giverContext.preferred_attributes.join(', ') || 'none specified'}

HOW TO USE GIVER CONTEXT:
- Reference their shopping timing: "As a ${giverContext.shopping_style} shopper, you'll appreciate..."
- Acknowledge their values: "This matches your focus on ${giverContext.giving_values[0] || 'thoughtful'} gifts..."
- Connect to their sentimentality: "${giverContext.sentimentality > 0.7 ? 'This meaningful' : 'This practical'} choice..."
- Honor their preferences: "${giverContext.preferred_attributes[0] ? 'The ' + giverContext.preferred_attributes[0] + ' aspect aligns with your values' : ''}"
` : `
Since this is a first-time recommendation, focus entirely on the recipient's interests, needs, and what makes this product a great fit for them. Do NOT reference the giver's profile, shopping history, or newness — just explain why this specific product is perfect for the recipient.
`}

RECIPIENT CONTEXT (THE PERSON RECEIVING THE GIFT):
- Name: ${recipientContext.name}
- Life stage: ${recipientContext.lifeStage}
- Recent events: ${recipientContext.recentEvents?.length > 0 ? recipientContext.recentEvents.join(', ') : 'none noted'}
- Core interests: ${(recipientContext.interests || []).slice(0, 3).join(', ') || 'not specified'}
- Values: ${(recipientContext.values || []).slice(0, 3).join(', ') || 'not specified'}
- Personality traits: ${Object.keys(recipientContext.personality || {}).join(', ') || 'not specified'}
- Known dislikes: ${recipientContext.dislikes?.length > 0 ? recipientContext.dislikes.join(', ') : 'none noted'}

GIFT MEANING FRAMEWORK:
- Archetype: ${meaningFramework.giftArchetype}
- Matched Archetype: ${candidate.matchReasons?.matchedArchetype || meaningFramework.giftArchetype}
- Emotional message: ${meaningFramework.emotionalMessage}
- Core values: ${meaningFramework.coreValues.join(', ')}

RELATIONSHIP CONTEXT:
- Type: ${relationship?.type || 'friend'}
- Closeness: ${relationship?.closeness || 'casual'}
- Tone to use: ${relationship?.socialNorms?.formalityLevel || 'casual'}

WRITING GUIDELINES:
${giverContext ? `✓ DO: Weave giver AND recipient details together in one flowing narrative
✓ DO: Reference the giver's past patterns if available` : `✓ DO: Write from a neutral perspective — do NOT address the giver directly
✓ DO: Focus 100% on the recipient and why this product fits them`}
✓ DO: Be specific with names, interests, and life events
✓ DO: Connect to recipient's current life stage or recent events
✓ DO: Use conversational, warm language
✓ DO: Reference the matched archetype naturally (e.g., "this practical gift", "this experiential choice", "this thoughtful gesture")
✗ DON'T: Use generic phrases like "perfect gift" or "they'll love this"
✗ DON'T: Sound like marketing copy
✗ DON'T: List features without emotional connection
${giverContext ? `✗ DON'T: Forget to mention both giver AND recipient` : `✗ DON'T: Say "As a shopper", "As an unknown shopper", "you'll appreciate", or any phrase addressing the gift giver
✗ DON'T: Reference the giver's profile, history, or shopping style — there is none`}
✗ DON'T: Force archetype mentions if they don't flow naturally

${giverContext ? `DUAL-CONTEXT EXAMPLES (STUDY THESE):

Example 1 - High personalization with full giver history (experiential archetype):
"Since you typically give experiential gifts and Sarah just started her coffee roasting hobby, this hands-on coffee cupping class lets her deepen her skills while creating memories. Your preference for meaningful experiences over objects makes this perfect, and at $85 it fits your usual budget for close friends."

Example 2 - Moderate personalization (practical archetype):
"As a planned shopper who values quality, this hand-thrown ceramic mug aligns with your appreciation for handmade items. Given Marcus's new apartment and love of morning rituals, it's both practical and personal - exactly the thoughtful-but-useful balance you tend to favor."

Example 3 - Sentimental giver + practical recipient:
"I know you lean toward sentimental gifts, but Jake's engineering mindset means he'll genuinely appreciate this multi-tool's functionality. It bridges both worlds - practical enough for his daily needs, special enough to show you chose it specifically for his hiking trips."

Example 4 - Budget-conscious + experiential:
"This workshop fits your budget-conscious approach at just $45, while still delivering the experiential gift you prefer. Maya's been wanting to try pottery, and this 2-hour intro class is low-commitment enough for her busy schedule as a new mom."
` : `RECIPIENT-FOCUSED EXAMPLES (STUDY THESE — notice NONE reference the giver):

Example 1 - Interest-based (experiential archetype):
"Sarah just started her coffee roasting hobby, and this hands-on coffee cupping class lets her deepen her skills while creating memories. It's a perfect blend of learning and enjoyment for someone at the start of their coffee journey."

Example 2 - Life stage match (practical archetype):
"Given Marcus's new apartment and love of morning rituals, this hand-thrown ceramic mug is both practical and personal. It'll elevate his daily coffee routine while adding a handcrafted touch to his space."

Example 3 - Personality fit (sentimental archetype):
"Emma's biology major and her aesthetic taste for retro decor make this vintage science poster a natural fit. It speaks directly to who she is — a thoughtful piece she can display with pride."

Example 4 - Activity match (practical archetype):
"Jake's engineering mindset means he'll genuinely appreciate this multi-tool's functionality. It's practical enough for his daily needs and rugged enough for his weekend hiking trips."
`}
Return JSON format:
{
  "reasoning": "2-3 sentence explanation ${giverContext ? 'weaving giver style + recipient fit together' : 'focused on why this product fits the recipient'}",
  "storyElements": {
    "connectionToRecipient": "How this connects to recipient's interests/life/needs",
    "emotionalResonance": "Why this would be meaningful to them emotionally",
    "practicalValue": "Practical benefits or use cases"
  },
  "tone": "warm|enthusiastic|thoughtful|practical"
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            product: candidate.product,
            giver: giverContext,
            recipient: recipientContext,
            meaningFramework,
            relationship,
            occasion,
            matchReasons: candidate.matchReasons,
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const story = JSON.parse(content);

    // Generate concise "why this gift" copy
    const whyCopy = this.generateWhyCopy(
      candidate.product,
      candidate.matchReasons?.matchedArchetype || meaningFramework.giftArchetype,
      {
        interests: recipientContext.interests || [],
        values: recipientContext.values || []
      }
    );

    // Post-process: strip giver-referencing phrases when no giver profile exists
    const reasoning = giverContext ? story.reasoning : this.stripGiverReferences(story.reasoning);

    return {
      productId: candidate.product.id,
      reasoning,
      whyCopy, // NEW: Concise 1-line reasoning
      storyElements: story.storyElements,
      tone: story.tone,
      personalizationLevel: this.assessPersonalization(reasoning, interests, giverContext),
    };
  }

  /**
   * Generate concise "why this gift" one-liner
   * Format: "This [archetype] gift matches [recipient]'s love of [interest] and aligns with your [value] preferences."
   */
  private generateWhyCopy(
    product: any,
    archetype: string,
    matches: { interests: string[], values: string[] }
  ): string {
    const archetypeLabels: Record<string, string> = {
      'practical': 'practical',
      'practical_luxury': 'practical yet refined',
      'experience': 'experiential',
      'sentimental': 'sentimental',
      'aspirational': 'aspirational',
      'social': 'social',
      'collectible': 'collectible',
      'indulgent': 'indulgent',
      'thoughtful': 'thoughtful',
    };

    const archetypeLabel = archetypeLabels[archetype] || 'thoughtful';

    // Start with archetype
    let why = `This ${archetypeLabel} gift`;

    // Add interest match if available (top 1-2)
    if (matches.interests && matches.interests.length > 0) {
      const topInterests = matches.interests.slice(0, 2);
      if (topInterests.length === 1) {
        why += ` matches their love of ${topInterests[0]}`;
      } else {
        why += ` matches their interests in ${topInterests.join(' and ')}`;
      }
    }

    // Add value alignment if available (top 1)
    if (matches.values && matches.values.length > 0) {
      const topValue = matches.values[0];
      if (matches.interests && matches.interests.length > 0) {
        why += ` and aligns with your ${topValue} preferences`;
      } else {
        why += ` aligns with your ${topValue} preferences`;
      }
    }

    why += '.';

    this.log(`Generated why copy for product ${product.id}: "${why}"`);

    return why;
  }

  private assessPersonalization(reasoning: string, interests: string[], giverContext: any): 'high' | 'medium' | 'low' {
    let score = 0;
    const lowerReasoning = reasoning.toLowerCase();

    // Check recipient interest mentions (max 3 points)
    const mentionedInterests = (interests || []).filter((interest) =>
      lowerReasoning.includes(interest.toLowerCase())
    );
    score += Math.min(3, mentionedInterests.length * 1.5);

    // Check giver profile usage (max 4 points)
    if (giverContext) {
      // Check for shopping style reference (1 point)
      const shoppingKeywords = ['last-minute', 'planned', 'week-before', 'month-ahead', 'shopper'];
      if (shoppingKeywords.some(kw => lowerReasoning.includes(kw))) {
        score += 1;
      }

      // Check for giving values reference (1 point)
      if (giverContext.giving_values && giverContext.giving_values.length > 0) {
        const valuesMentioned = giverContext.giving_values.some((value: string) =>
          lowerReasoning.includes(value.toLowerCase())
        );
        if (valuesMentioned) score += 1;
      }

      // Check for budget/price sensitivity reference (1 point)
      const budgetKeywords = ['budget', 'price', 'fits your', 'affordable', 'value'];
      if (budgetKeywords.some(kw => lowerReasoning.includes(kw))) {
        score += 1;
      }

      // Check for personalization or sentimentality reference (1 point)
      const styleKeywords = ['sentimental', 'meaningful', 'practical', 'experiential', 'typical', 'usually', 'tend to', 'your preference', 'your approach'];
      if (styleKeywords.some(kw => lowerReasoning.includes(kw))) {
        score += 1;
      }
    }

    // Scoring: 0-2=low, 3-5=medium, 6-7=high
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Strip giver-referencing phrases from reasoning when no giver profile exists.
   * GPT sometimes generates "As an unknown shopper..." despite prompt instructions.
   * This deterministic post-processing guarantees clean output.
   */
  private stripGiverReferences(reasoning: string): string {
    // Patterns that reference the giver when there's no giver context
    // Each pattern captures the unwanted prefix so we can remove it cleanly
    // Applied in order — first match wins for prefix patterns, all mid-sentence patterns run
    const prefixPatterns: [RegExp, string][] = [
      // "As an unknown shopper who values sentimentality, this..." → "This..."
      [/^As an? (?:unknown |new |first-time )?shopper[^,]*,\s*/i, ''],
      // "As a thoughtful friend who..., " → ""
      [/^As a (?:thoughtful |caring |considerate )?(?:friend|gift[- ]?giver|person)[^,]*,\s*/i, ''],
      // "As someone who appreciates thoughtful gifts, " → ""
      [/^As someone who [^,]+,\s*/i, ''],
      // "As you're still exploring your shopping style, " → ""
      [/^As you'?re (?:still )?(?:exploring|building|developing)[^,]*,\s*/i, ''],
      // "You'll appreciate that/how/the..." at sentence start
      [/^You'?ll appreciate (that |how |the )?/i, ''],
      // "For you as a new shopper, ..." → ""
      [/^For you as a[^,]*,\s*/i, ''],
    ];

    // Mid-sentence patterns (applied globally via replace, not just first match)
    const midPatterns: [RegExp, string][] = [
      // "...especially since you're an unknown shopper..."
      [/,?\s*especially since you'?re an? (?:unknown |new )?shopper[^.]*\./ig, '.'],
      // "...which aligns with your sentimental giving style"
      [/,?\s*(?:which |that |and it )(?:aligns|reflects|matches|connects) with your (?:sentimental |thoughtful |practical )?(?:giving |shopping )?(?:style|approach|values?|preference)[^.]*\./ig, '.'],
      // "...making it a meaningful addition to your/their..."  referencing "your" (the giver)
      // Only strip if it's clearly addressing the giver, not the recipient
      [/,?\s*(?:reflecting|showing|demonstrating) your (?:shared |mutual )?(?:appreciation|sentimentality|thoughtfulness)[^.]*\./ig, '.'],
    ];

    let cleaned = reasoning;

    // Apply first matching prefix pattern
    for (const [pattern, replacement] of prefixPatterns) {
      const result = cleaned.replace(pattern, replacement);
      if (result !== cleaned) {
        cleaned = result;
        break; // Only apply first matching prefix
      }
    }

    // Apply all mid-sentence patterns
    for (const [pattern, replacement] of midPatterns) {
      cleaned = cleaned.replace(pattern, replacement);
    }

    // Capitalize first letter if we stripped a prefix
    if (cleaned !== reasoning && cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    if (cleaned !== reasoning) {
      this.log(`Stripped giver reference from reasoning: "${reasoning.slice(0, 60)}..." → "${cleaned.slice(0, 60)}..."`);
    }

    return cleaned;
  }
}
