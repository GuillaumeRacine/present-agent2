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
import { extractAttributesFromProductProps } from '../../types/gift-attributes';

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
    const budget = context.validatorContext.explorerContext?.meaningContext?.constraintsContext?.hardConstraints?.budget;

    // Also extract budget from deep listener path (same fix as explorer)
    const listenerBudget = (context.validatorContext?.explorerContext?.meaningContext?.constraintsContext as any)
      ?.relationshipContext?.memoryContext?.listenerContext?.budget;
    const effectiveBudget = budget || listenerBudget;

    // Get stated interests from listener context
    const listenerInterests: string[] = (context.validatorContext?.explorerContext?.meaningContext?.constraintsContext as any)
      ?.relationshipContext?.memoryContext?.listenerContext?.interests || [];

    // Combine candidates with their stories
    const combined = candidates.map((candidate: any) => ({
      ...candidate,
      story: stories.find((s: any) => s.productId === candidate.product.id),
    }));

    const inBudget = (c: any) =>
      !effectiveBudget || (c.product.price >= effectiveBudget.min && c.product.price <= effectiveBudget.max);

    // Sort by hybridScore descending
    const sorted = combined
      .filter(inBudget)
      .sort((a: any, b: any) => b.scores.hybridScore - a.scores.hybridScore);

    if (sorted.length === 0) {
      return combined.sort((a: any, b: any) => b.scores.hybridScore - a.scores.hybridScore).slice(0, 5);
    }

    // Interest-aware diversity selection:
    // Phase 1: Ensure at least 1 product per stated interest
    const selected: any[] = [];
    const selectedIds = new Set<string>();
    const titleSeen = new Set<string>();

    const normalizeTitle = (t: string) => t.toLowerCase()
      .replace(/\b(original|go|sub|kit|set|plus|pro|mini|classic|deluxe)\b/gi, '')
      .replace(/\s+by\s+.*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    const addCandidate = (c: any): boolean => {
      if (selectedIds.has(c.product.id)) return false;
      const norm = normalizeTitle(c.product.title);
      if (titleSeen.has(norm)) return false;
      selected.push(c);
      selectedIds.add(c.product.id);
      titleSeen.add(norm);
      return true;
    };

    // Phase 1: One product per stated interest
    for (const interest of listenerInterests) {
      if (selected.length >= 5) break;
      const interestLower = interest.toLowerCase();
      const match = sorted.find((c: any) => {
        if (selectedIds.has(c.product.id)) return false;
        if (titleSeen.has(normalizeTitle(c.product.title))) return false;
        const candidateInterests = (c.matchReasons?.matchedInterests || []).map((i: string) => i.toLowerCase());
        // Direct match or text match in title
        return candidateInterests.includes(interestLower) ||
          c.product.title.toLowerCase().includes(interestLower);
      });
      if (match) {
        addCandidate(match);
        this.log(`Phase 1: Selected "${match.product.title}" for interest "${interest}"`);
      }
    }

    // Phase 2: Fill remaining slots by score with title dedup
    for (const c of sorted) {
      if (selected.length >= 5) break;
      addCandidate(c);
    }

    this.log(`Selected ${selected.length} recommendations (${listenerInterests.length} interests covered)`);
    return selected;
  }

  private selectFallbackCandidates(context: any): any[] {
    // When validation fails, use top Explorer candidates sorted by vector score
    const allCandidates = context.validatorContext.explorerContext.candidates;
    const budget = context.validatorContext.explorerContext?.meaningContext?.constraintsContext?.hardConstraints?.budget;

    if (!allCandidates || allCandidates.length === 0) {
      return [];
    }

    const inBudget = (c: any) =>
      !budget || (c.product.price >= budget.min && c.product.price <= budget.max);

    // Sort by vector score (most reliable when graph scores are 0)
    // and take top 3 as fallback
    const sorted = allCandidates.sort((a: any, b: any) => b.scores.vectorScore - a.scores.vectorScore);
    const prioritized = sorted.filter(inBudget);
    return (prioritized.length > 0 ? prioritized : sorted).slice(0, 3);
  }

  private generateFallbackReasoning(candidate: any): string {
    // Generate simple reasoning when storyteller hasn't created one
    const interests = candidate.matchReasons?.matchedInterests || [];
    const archetype = candidate.matchReasons?.matchedArchetype;
    const vectorScore = (candidate.scores.vectorScore * 100).toFixed(0);

    // Build reasoning with archetype context
    let reasoning = '';

    if (archetype && archetype !== 'thoughtful') {
      // Reference the archetype in a natural way
      const archetypeDescriptor = this.getArchetypeDescriptor(archetype);
      reasoning = `This ${archetypeDescriptor} `;
    } else {
      reasoning = 'This ';
    }

    if (interests.length > 0) {
      reasoning += `gift matches your interests (${interests.join(', ')}) with ${vectorScore}% semantic similarity.`;
    } else {
      reasoning += `gift has a ${vectorScore}% match based on your requirements.`;
    }

    return reasoning;
  }

  private getArchetypeDescriptor(archetype: string): string {
    const descriptors: Record<string, string> = {
      practical: 'practical',
      practical_luxury: 'practical yet refined',
      experience: 'experiential',
      sentimental: 'sentimental',
      aspirational: 'aspirational',
      social: 'social',
      collectible: 'collectible',
      indulgent: 'indulgent',
      thoughtful: 'thoughtful',
    };

    return descriptors[archetype] || 'thoughtful';
  }

  private generateTags(candidate: any, rank: number): string[] {
    const tags = [];

    if (rank === 0) tags.push('Best Match');
    if (candidate.product.price < 50) tags.push('Budget Friendly');
    if (candidate.scores.hybridScore > 0.85) tags.push('Highly Recommended');
    if (candidate.matchReasons.socialProofCount > 10) tags.push('Popular Choice');
    if (candidate.story?.personalizationLevel === 'high') tags.push('Personalized');

    // Add attribute badges (top 3-5)
    const attributeBadges = this.getAttributeBadges(candidate.product);
    tags.push(...attributeBadges);

    return tags;
  }

  /**
   * Extract top 3-5 gift attributes as human-readable badges
   */
  private getAttributeBadges(product: any): string[] {
    const attributeLabels: Record<string, string> = {
      'isExperiential': 'Experiential',
      'isPersonalized': 'Personalized',
      'isSentimental': 'Sentimental',
      'isPractical': 'Practical',
      'isMemoryMaking': 'Memory-Making',
      'isShared': 'Shared Experience',
      'isLuxury': 'Luxury',
      'isHandcrafted': 'Handcrafted',
      'isEcoFriendly': 'Eco-Friendly',
      'isLocal': 'Local',
      'isEducational': 'Educational',
      'isCreative': 'Creative',
      'isWellness': 'Wellness',
      'isArtistic': 'Artistic',
      'isUnique': 'Unique',
      'isTimeless': 'Timeless',
      'isAspirational': 'Aspirational',
      'isCollectible': 'Collectible',
      'isComforting': 'Comforting',
      'isNostalgic': 'Nostalgic',
      'isRomantic': 'Romantic',
      'isTechEnabled': 'Tech-Enabled',
      'isConsumable': 'Consumable',
      'isPortable': 'Portable',
      'isMinimalist': 'Minimalist',
      'isBold': 'Bold',
      'isElegant': 'Elegant',
      'isQuirky': 'Quirky',
      'isSpaceSaving': 'Space-Saving',
      'isSubscriptionBased': 'Subscription',
    };

    // Extract attributes from product
    const normalizedAttributes =
      (product.attributes && Object.keys(product.attributes).length > 0
        ? product.attributes
        : null) ||
      (product.giftAttributes && Object.keys(product.giftAttributes).length > 0
        ? product.giftAttributes
        : null) ||
      extractAttributesFromProductProps(product);
    const attributes = normalizedAttributes || {};

    // Filter to true attributes and map to labels
    const badges = Object.entries(attributes)
      .filter(([key, value]) => value === true && attributeLabels[key])
      .map(([key]) => attributeLabels[key])
      .slice(0, 5); // Top 5 max

    this.log(`Generated ${badges.length} attribute badges for product ${product.id}`, { badges });

    return badges;
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
