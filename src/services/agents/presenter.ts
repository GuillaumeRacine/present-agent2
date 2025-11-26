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
      // Check if we have any validated candidates
      const validatedCandidates = input.storytellerContext.validatorContext.validatedCandidates;
      const hasValidatedCandidates = validatedCandidates && validatedCandidates.length > 0;

      let topCandidates: any[];
      let isFallback = false;

      if (hasValidatedCandidates) {
        // Normal flow: use validated candidates
        topCandidates = this.selectTopCandidates(input.storytellerContext);
      } else {
        // Fallback: validation rejected everything, use top Explorer candidates
        this.log('⚠️  No validated candidates - using fallback recommendations');
        topCandidates = this.selectFallbackCandidates(input.storytellerContext);
        isFallback = true;
      }

      // Create final recommendations with ranking
      const recommendations: FinalRecommendation[] = topCandidates.map((candidate, index) => ({
        rank: index + 1,
        product: candidate.product,
        reasoning: candidate.story?.reasoning || this.generateFallbackReasoning(candidate),
        confidence: candidate.scores.confidenceScore,
        tags: this.generateTags(candidate, index),
      }));

      // Generate conversational framing
      const framing = await this.generateFraming(
        input.storytellerContext,
        recommendations,
        isFallback
      );

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

  private selectFallbackCandidates(context: any): any[] {
    // When validation fails, use top Explorer candidates sorted by vector score
    const allCandidates = context.validatorContext.explorerContext.candidates;

    if (!allCandidates || allCandidates.length === 0) {
      return [];
    }

    // Sort by vector score (most reliable when graph scores are 0)
    // and take top 3 as fallback
    return allCandidates
      .sort((a: any, b: any) => b.scores.vectorScore - a.scores.vectorScore)
      .slice(0, 3);
  }

  private generateFallbackReasoning(candidate: any): string {
    // Generate simple reasoning when storyteller hasn't created one
    const interests = candidate.matchReasons?.matchedInterests || [];
    const vectorScore = (candidate.scores.vectorScore * 100).toFixed(0);

    if (interests.length > 0) {
      return `This product matches your interests (${interests.join(', ')}) with ${vectorScore}% semantic similarity.`;
    }

    return `This product has a ${vectorScore}% match based on your requirements.`;
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
    recommendations: FinalRecommendation[],
    isFallback: boolean = false
  ): Promise<{ intro: string; outro: string }> {
    const recipient =
      context.validatorContext?.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.memoryContext?.listenerContext?.recipient;
    const occasion =
      context.validatorContext?.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.memoryContext?.listenerContext?.occasion;

    const fallbackNote = isFallback
      ? `\n\nIMPORTANT: These are fallback recommendations because no products passed all validation criteria.
         The intro should gently mention this and set expectations that these are close matches worth considering.`
      : '';

    const systemPrompt = `You are a helpful friend providing gift recommendations.

Write a warm, conversational introduction and closing for these recommendations.

Introduction should:
- Acknowledge what they're looking for
- Set context for the recommendations
- Be encouraging and supportive
- 2-3 sentences max${fallbackNote}

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
