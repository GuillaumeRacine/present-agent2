/**
 * Listener Agent
 *
 * Extracts deep context from user queries:
 * - Explicit facts (recipient, occasion, budget, interests)
 * - Inferred emotional context (tone, urgency, significance)
 */

import { BaseAgent } from './base';
import { ListenerInput, ListenerOutput } from '../../types/agents';
import OpenAI from 'openai';

export class ListenerAgent extends BaseAgent<ListenerInput, ListenerOutput> {
  name = 'Listener';

  constructor(private openai: OpenAI) {
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
        extractedAt: new Date(),
        confidence: this.calculateConfidence(extraction),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  /**
   * Extract context using Claude/GPT
   */
  private async extractContext(
    query: string
  ): Promise<Omit<ListenerOutput, 'extractedAt' | 'confidence'>> {
    const systemPrompt = `You are an expert at understanding gift-giving queries. Extract structured information from the user's query.

Extract:
1. Recipient details (name, relationship, age, gender if mentioned)
2. Occasion (name, date, urgency)
3. Budget (min, max, flexibility)
4. Interests explicitly mentioned
5. Values (eco-friendly, local, handmade, etc.)
6. Hard constraints (must be digital, no alcohol, etc.)
7. Emotional tone and confidence level
8. Gift significance (major, moderate, small gesture)

Return as JSON matching this schema:
{
  "recipient": { "name": "...", "relationshipType": "...", "age": 0, "gender": "..." },
  "occasion": { "name": "...", "date": "...", "urgency": "immediate|planned|future" },
  "budget": { "min": 0, "max": 0, "flexibility": "strict|flexible|unspecified" },
  "interests": ["..."],
  "values": ["..."],
  "constraints": ["..."],
  "emotionalTone": "excited|stressed|casual|formal|urgent",
  "confidenceLevel": "certain|exploring|confused",
  "giftSignificance": "major|moderate|small_gesture"
}

Only include fields that are explicitly mentioned or can be confidently inferred.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  /**
   * Calculate confidence score based on extraction completeness
   */
  private calculateConfidence(
    extraction: Omit<ListenerOutput, 'extractedAt' | 'confidence'>
  ): number {
    let score = 0;
    let maxScore = 0;

    // Recipient info (30% weight)
    maxScore += 30;
    if (extraction.recipient) {
      score += 10;
      if (extraction.recipient.relationshipType) score += 10;
      if (extraction.recipient.age || extraction.recipient.gender) score += 10;
    }

    // Budget (20% weight)
    maxScore += 20;
    if (extraction.budget) {
      score += 10;
      if (extraction.budget.min > 0 && extraction.budget.max > 0) score += 10;
    }

    // Interests (25% weight)
    maxScore += 25;
    if (extraction.interests && extraction.interests.length > 0) {
      score += Math.min(25, extraction.interests.length * 8);
    }

    // Occasion (15% weight)
    maxScore += 15;
    if (extraction.occasion) {
      score += 15;
    }

    // Values and constraints (10% weight)
    maxScore += 10;
    if (extraction.values && extraction.values.length > 0) score += 5;
    if (extraction.constraints && extraction.constraints.length > 0) score += 5;

    return Math.min(1.0, score / maxScore);
  }
}
