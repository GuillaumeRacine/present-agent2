/**
 * Presenter Agent
 *
 * Formats final recommendations with warm, friend-like tone
 */

import { BaseAgent } from './base';
import {
  PresenterInput,
  PresenterOutput,
  FinalRecommendation,
} from '../../types/agents';
import OpenAI from 'openai';

export class PresenterAgent extends BaseAgent<PresenterInput, PresenterOutput> {
  name = 'Presenter';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: PresenterInput): Promise<PresenterOutput> {
    this.log('Formatting presentation');

    try {
      // Take top 5 candidates
      const topCandidates = this.selectTopCandidates(input.storytellerContext);

      // Create final recommendations with ranking
      const recommendations: FinalRecommendation[] = topCandidates.map((candidate, index) => ({
        rank: index + 1,
        product: candidate.product,
        reasoning: candidate.story.reasoning,
        confidence: candidate.scores.confidenceScore,
        tags: this.generateTags(candidate, index),
      }));

      // Generate conversational framing
      const framing = await this.generateFraming(input.storytellerContext, recommendations);

      return {
        conversationalIntro: framing.intro,
        conversationalOutro: framing.outro,
        recommendations,
        orderingStrategy: 'confidence_desc',
        tone: 'friend',
        presentedAt: new Date(),
        totalRecommendations: recommendations.length,
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private selectTopCandidates(context: any): any[] {
    const candidates = context.validatorContext.validatedCandidates;
    const stories = context.stories;

    // Combine candidates with their stories
    const combined = candidates.map((candidate: any) => ({
      ...candidate,
      story: stories.find((s: any) => s.productId === candidate.product.id),
    }));

    // Sort by hybrid score and take top 5
    return combined
      .sort((a: any, b: any) => b.scores.hybridScore - a.scores.hybridScore)
      .slice(0, 5);
  }

  private generateTags(candidate: any, rank: number): string[] {
    const tags = [];

    if (rank === 0) tags.push('Best Match');
    if (candidate.product.price < 50) tags.push('Budget Friendly');
    if (candidate.scores.hybridScore > 0.85) tags.push('Highly Recommended');
    if (candidate.matchReasons.socialProofCount > 10) tags.push('Popular Choice');
    if (candidate.story?.personalizationLevel === 'high') tags.push('Personalized');

    return tags;
  }

  private async generateFraming(
    context: any,
    recommendations: FinalRecommendation[]
  ): Promise<{ intro: string; outro: string }> {
    const recipient =
      context.validatorContext.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext.listenerContext.recipient;
    const occasion =
      context.validatorContext.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext.listenerContext.occasion;

    const systemPrompt = `You are a helpful friend providing gift recommendations.

Write a warm, conversational introduction and closing for these recommendations.

Introduction should:
- Acknowledge what they're looking for
- Set context for the recommendations
- Be encouraging and supportive
- 2-3 sentences max

Outro should:
- Invite follow-up questions
- Offer to refine or explore more
- Be warm and helpful
- 1-2 sentences max

Return JSON:
{
  "intro": "...",
  "outro": "..."
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            recipient,
            occasion,
            recommendationCount: recommendations.length,
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

    return JSON.parse(content);
  }
}
