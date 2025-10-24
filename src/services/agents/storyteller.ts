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
    const recipient =
      context.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext.listenerContext.recipient;
    const interests =
      context.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext.listenerContext.interests;
    const meaningFramework = context.explorerContext.meaningContext.meaningFramework;
    const relationship =
      context.explorerContext.meaningContext.constraintsContext.relationshipContext.relationshipAnalysis;

    const systemPrompt = `You are a thoughtful friend helping someone find the perfect gift.

Craft a personal 2-3 sentence explanation for why this product would be a great gift.

Guidelines:
- Write like you're talking to a friend (warm, conversational)
- Connect the gift to the recipient's interests, personality, or needs
- Explain why it's meaningful, not just what it is
- Be specific and personal, not generic
- Avoid marketing speak

Return JSON:
{
  "reasoning": "...",
  "storyElements": {
    "connectionToRecipient": "...",
    "emotionalResonance": "...",
    "practicalValue": "..."
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
            recipient,
            interests,
            meaningFramework,
            relationship,
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
      personalizationLevel: this.assessPersonalization(story.reasoning, interests),
    };
  }

  private assessPersonalization(reasoning: string, interests: string[]): 'high' | 'medium' | 'low' {
    // Check how many interests are mentioned
    const mentionedInterests = interests.filter((interest) =>
      reasoning.toLowerCase().includes(interest.toLowerCase())
    );

    if (mentionedInterests.length >= 2) return 'high';
    if (mentionedInterests.length === 1) return 'medium';
    return 'low';
  }
}
