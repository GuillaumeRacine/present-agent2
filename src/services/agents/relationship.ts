/**
 * Relationship Agent
 *
 * Analyzes relationship dynamics to calibrate gift appropriateness
 */

import { BaseAgent } from './base';
import { RelationshipInput, RelationshipOutput } from '../../types/agents';
import OpenAI from 'openai';

export class RelationshipAgent extends BaseAgent<RelationshipInput, RelationshipOutput> {
  name = 'Relationship';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: RelationshipInput): Promise<RelationshipOutput> {
    this.log('Analyzing relationship dynamics');

    try {
      const analysis = await this.analyzeRelationship(input.memoryContext);

      return {
        memoryContext: input.memoryContext,
        relationshipAnalysis: analysis.relationshipAnalysis,
        calibration: analysis.calibration,
        analyzedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private async analyzeRelationship(memoryContext: any) {
    const recipient = memoryContext.listenerContext.recipient;
    const occasion = memoryContext.listenerContext.occasion;

    // Use LLM to analyze relationship appropriateness
    const systemPrompt = `Analyze the relationship dynamics for gift-giving. Consider:
- Relationship type and closeness
- Appropriate price range for this relationship
- Formality level
- How personal vs generic the gift should be
- Risk tolerance (safe choices vs bold/unique)

Return JSON with this structure:
{
  "relationshipAnalysis": {
    "type": "...",
    "closeness": "intimate|close|casual|professional",
    "duration": "new|established|longtime",
    "socialNorms": {
      "appropriatePriceRange": { "min": 0, "max": 0 },
      "formalityLevel": "formal|casual|playful",
      "personalVsGeneric": "highly_personal|moderately_personal|generic_ok"
    },
    "riskTolerance": "safe|moderate|bold"
  },
  "calibration": {
    "adjustedBudget": { "min": 0, "max": 0 },
    "recommendedArchetypes": ["..."],
    "avoidArchetypes": ["..."],
    "personalizationLevel": "high|medium|low"
  }
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
            budget: memoryContext.listenerContext.budget,
          }),
        },
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
}
