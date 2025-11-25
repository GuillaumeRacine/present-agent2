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
    // Extract relevant context
    const memoryContext = context.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext;
    const recipient = memoryContext.listenerContext.recipient;
    const interests = memoryContext.listenerContext.interests;
    const meaningFramework = context.explorerContext.meaningContext.meaningFramework;
    const relationship =
      context.explorerContext.meaningContext.constraintsContext.relationshipContext.relationshipAnalysis;
    // Values is now an object with boolean flags, convert to array of truthy keys
    const valuesObj = memoryContext.listenerContext.values || {};
    const values = typeof valuesObj === 'object' && !Array.isArray(valuesObj)
      ? Object.keys(valuesObj).filter(k => valuesObj[k] === true)
      : [];
    const occasion = memoryContext.listenerContext.occasion;

    // NEW: Extract giver profile
    const giverProfile = memoryContext.giverProfile;
    const enrichedRecipient = memoryContext.enrichedRecipient;

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

DUAL-CONTEXT PERSONALIZATION IS CRITICAL:
Your explanation must weave together BOTH the giver's giving style AND the recipient's needs/interests.
This creates uniquely personal reasoning that shows you understand both people in the relationship.

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
GIVER CONTEXT: Limited history available - focus more on recipient fit, but mention this is a learning opportunity.
For new givers, use phrases like:
- "This could be a great first gift that shows..."
- "As you're building your gift-giving relationship..."
- "This thoughtful choice demonstrates..."
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
- Emotional message: ${meaningFramework.emotionalMessage}
- Core values: ${meaningFramework.coreValues.join(', ')}

RELATIONSHIP CONTEXT:
- Type: ${relationship?.type || 'friend'}
- Closeness: ${relationship?.closeness || 'casual'}
- Tone to use: ${relationship?.socialNorms?.formalityLevel || 'casual'}

WRITING GUIDELINES:
✓ DO: Weave giver AND recipient details together in one flowing narrative
✓ DO: Be specific with names, interests, and life events
✓ DO: Reference the giver's past patterns if available
✓ DO: Connect to recipient's current life stage or recent events
✓ DO: Use conversational, warm language
✗ DON'T: Use generic phrases like "perfect gift" or "they'll love this"
✗ DON'T: Sound like marketing copy
✗ DON'T: List features without emotional connection
✗ DON'T: Forget to mention both giver AND recipient

DUAL-CONTEXT EXAMPLES (STUDY THESE):

Example 1 - High personalization with full giver history:
"Since you typically give experiential gifts and Sarah just started her coffee roasting hobby, this hands-on coffee cupping class lets her deepen her skills while creating memories. Your preference for meaningful experiences over objects makes this perfect, and at $85 it fits your usual budget for close friends."

Example 2 - Moderate personalization:
"As a planned shopper who values quality, this hand-thrown ceramic mug aligns with your appreciation for handmade items. Given Marcus's new apartment and love of morning rituals, it's both practical and personal - exactly the thoughtful-but-useful balance you tend to favor."

Example 3 - Low giver history, focus on recipient:
"While we're still learning your giving style, this vintage science poster speaks directly to Emma's biology major and her aesthetic taste for retro decor. It's the kind of personalized touch that shows you pay attention to her interests and style."

Example 4 - Sentimental giver + practical recipient:
"I know you lean toward sentimental gifts, but Jake's engineering mindset means he'll genuinely appreciate this multi-tool's functionality. It bridges both worlds - practical enough for his daily needs, special enough to show you chose it specifically for his hiking trips."

Example 5 - Budget-conscious + experiential:
"This workshop fits your budget-conscious approach at just $45, while still delivering the experiential gift you prefer. Maya's been wanting to try pottery, and this 2-hour intro class is low-commitment enough for her busy schedule as a new mom."

Example 6 - Last-minute shopper:
"As a last-minute shopper, you'll appreciate that this digital gift card delivers instantly while still feeling personal - paired with a note about the indie bookstore being Olivia's favorite weekend spot, it shows thought despite the time crunch."

Return JSON format:
{
  "reasoning": "2-3 sentence explanation weaving giver style + recipient fit together",
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

    return {
      productId: candidate.product.id,
      reasoning: story.reasoning,
      storyElements: story.storyElements,
      tone: story.tone,
      personalizationLevel: this.assessPersonalization(story.reasoning, interests, giverContext),
    };
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
}
