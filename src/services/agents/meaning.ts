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
    // Extract relevant context
    const recipient = context.relationshipContext.memoryContext.listenerContext.recipient;
    const interests = context.relationshipContext.memoryContext.listenerContext.interests;
    const values = context.relationshipContext.memoryContext.listenerContext.values;
    const occasion = context.relationshipContext.memoryContext.listenerContext.occasion;
    const relationship = context.relationshipContext.relationshipAnalysis;

    const systemPrompt = `You are an expert at understanding what makes gifts meaningful.
Analyze the context and determine:
1. What gift archetype would be most meaningful (practical_luxury, experience, sentimental, aspirational, etc.)
2. What emotional message this gift should communicate
3. What core values it should align with
4. What would personally resonate with the recipient

Return JSON:
{
  "meaningFramework": {
    "giftArchetype": "...",
    "emotionalMessage": "...",
    "coreValues": ["..."],
    "personalRelevance": {
      "connectsToInterests": ["..."],
      "addressesNeeds": ["..."],
      "celebratesPersonality": "..."
    }
  },
  "resonanceCriteria": {
    "functionalNeeds": ["..."],
    "aspirationalNeeds": ["..."],
    "emotionalNeeds": ["..."],
    "socialNeeds": ["..."]
  },
  "discoveryHints": {
    "semanticQueries": ["..."],
    "interestPathways": ["..."],
    "archetypeFilters": ["..."]
  }
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({ recipient, interests, values, occasion, relationship }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }
}
