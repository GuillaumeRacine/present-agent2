/**
 * Persona Simulator Sub-Agent
 *
 * Simulates realistic gift-giver personas to test system quality,
 * relevance, personalization, and UX.
 */

import OpenAI from 'openai';
import {
  TestPersona,
  GiftScenario,
  SimulatedQuery,
  PersonaTestResult,
  TestRecommendation,
} from '../../types/persona';
import { FinalRecommendation } from '../../types/agents';
import { logger } from '../../lib/logger';

export class PersonaSimulator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate a realistic query from a persona and scenario
   */
  async generateQuery(
    persona: TestPersona,
    scenario: GiftScenario
  ): Promise<SimulatedQuery> {
    const startTime = Date.now();

    logger.info('PersonaSimulator: Generating query', {
      personaId: persona.id,
      scenarioId: scenario.id,
    });

    const prompt = this.buildQueryGenerationPrompt(persona, scenario);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a persona simulator that generates realistic gift search queries. You must deeply embody the persona and scenario provided.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8, // Higher temperature for variety
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const simulatedQuery: SimulatedQuery = {
        query: result.query,
        persona,
        scenario,
        expectedBehavior: {
          likelyToRefine: result.expected_behavior.likely_to_refine,
          likelyToAskQuestions: result.expected_behavior.likely_to_ask_questions,
          likelyToSelectMultiple: result.expected_behavior.likely_to_select_multiple,
          decisionTimeEstimate: result.expected_behavior.decision_time_estimate,
        },
        groundTruth: {
          idealGiftCharacteristics: result.ground_truth.ideal_gift_characteristics,
          redFlags: result.ground_truth.red_flags,
        },
      };

      logger.info('PersonaSimulator: Query generated', {
        personaId: persona.id,
        queryLength: simulatedQuery.query.length,
        duration: Date.now() - startTime,
      });

      return simulatedQuery;
    } catch (error) {
      logger.error('PersonaSimulator: Failed to generate query', {
        error: error instanceof Error ? error.message : String(error),
        personaId: persona.id,
      });
      throw error;
    }
  }

  /**
   * Evaluate recommendations from the persona's perspective
   */
  async evaluateRecommendations(
    simulatedQuery: SimulatedQuery,
    recommendations: FinalRecommendation[]
  ): Promise<PersonaTestResult> {
    const startTime = Date.now();

    logger.info('PersonaSimulator: Evaluating recommendations', {
      personaId: simulatedQuery.persona.id,
      recommendationCount: recommendations.length,
    });

    const prompt = this.buildEvaluationPrompt(simulatedQuery, recommendations);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a persona simulator that evaluates gift recommendations from the perspective of a specific person. Be honest, critical, and realistic.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistent evaluation
      });

      const evaluation = JSON.parse(response.choices[0].message.content || '{}');

      // Build test result
      const testResult: PersonaTestResult = {
        personaId: simulatedQuery.persona.id,
        scenarioId: simulatedQuery.scenario.id,
        timestamp: new Date(),

        // Input
        generatedQuery: simulatedQuery.query,
        queryCharacteristics: {
          wordCount: simulatedQuery.query.split(' ').length,
          hasExplicitBudget: evaluation.query_analysis.has_explicit_budget,
          hasRecipientAge: evaluation.query_analysis.has_recipient_age,
          hasInterests: evaluation.query_analysis.has_interests,
          hasRelationship: evaluation.query_analysis.has_relationship,
          hasOccasion: evaluation.query_analysis.has_occasion,
          hasConstraints: evaluation.query_analysis.has_constraints,
          clarityScore: evaluation.query_analysis.clarity_score,
        },

        // System Response (will be filled by test harness)
        responseTime: 0,
        recommendations: recommendations.map((rec, index) => ({
          rank: rec.rank,
          product: {
            id: rec.product.id,
            name: rec.product.title,
            price: rec.product.price,
            category: '', // Not available in FinalRecommendation
          },
          scores: {
            hybrid: rec.confidence, // Using confidence as hybrid score
            graph: 0, // Not available in FinalRecommendation
            vector: 0, // Not available in FinalRecommendation
          },
          reasoning: rec.reasoning || '',
          perceivedRelevance: evaluation.recommendations[index]?.perceived_relevance || 0,
          wouldConsider: evaluation.recommendations[index]?.would_consider || false,
          notes: evaluation.recommendations[index]?.notes || '',
        })),

        systemMetrics: {
          totalTime: 0, // Will be filled by test harness
          agentTimings: {},
          candidatesFound: 0,
          candidatesValidated: recommendations.length,
          graphTraversalSuccess: recommendations.length > 0,
          vectorSearchSuccess: recommendations.length > 0,
        },

        // Evaluation
        relevanceScore: evaluation.overall_scores.relevance_score,
        personalizationScore: evaluation.overall_scores.personalization_score,
        uxScore: evaluation.overall_scores.ux_score,
        meetsExpectations: evaluation.overall_scores.meets_expectations,

        // Detailed Feedback
        whatWorked: evaluation.feedback.what_worked,
        whatDidntWork: evaluation.feedback.what_didnt_work,
        suggestions: evaluation.feedback.suggestions,

        // Metrics
        metrics: {
          interestMatchAccuracy: evaluation.metrics.interest_match_accuracy,
          budgetAdherence: evaluation.metrics.budget_adherence,
          occasionAppropriateness: evaluation.metrics.occasion_appropriateness,
          diversityScore: evaluation.metrics.diversity_score,
          explanationQuality: evaluation.metrics.explanation_quality,
        },
      };

      logger.info('PersonaSimulator: Evaluation complete', {
        personaId: simulatedQuery.persona.id,
        relevanceScore: testResult.relevanceScore,
        meetsExpectations: testResult.meetsExpectations,
        duration: Date.now() - startTime,
      });

      return testResult;
    } catch (error) {
      logger.error('PersonaSimulator: Failed to evaluate recommendations', {
        error: error instanceof Error ? error.message : String(error),
        personaId: simulatedQuery.persona.id,
      });
      throw error;
    }
  }

  /**
   * Build prompt for query generation
   */
  private buildQueryGenerationPrompt(
    persona: TestPersona,
    scenario: GiftScenario
  ): string {
    const { demographics, giftGivingStyle, psychographics } = persona;
    const { occasion, recipient, context, expectedQueryStyle } = scenario;

    return `You are simulating ${persona.name}, a real person searching for a gift.

PERSONA PROFILE:
- Age: ${demographics.age}, ${demographics.gender}
- Occupation: ${demographics.occupation}
- Income: ${demographics.incomeLevel}
- Life stage: ${demographics.lifestage}
- Tech savviness: ${demographics.techSavviness}

GIFT-GIVING STYLE:
- Planning: ${giftGivingStyle.planningStyle}
- Budget approach: ${giftGivingStyle.budgetApproach}
- Typical budget: $${giftGivingStyle.typicalBudgetRange.min}-$${giftGivingStyle.typicalBudgetRange.max}
- Decision style: ${giftGivingStyle.decisionStyle}
- Preferred types: ${giftGivingStyle.preferredGiftTypes.join(', ')}
- Personalization importance: ${giftGivingStyle.personalizationImportance}

PSYCHOGRAPHICS:
- Values: ${psychographics.values.join(', ')}
- Personality: ${psychographics.personality.join(', ')}
- Current stressors: ${psychographics.stressors.join(', ')}
- Motivations: ${psychographics.motivations.join(', ')}

SCENARIO:
- Occasion: ${occasion.type} (${occasion.significance})
- Days until: ${occasion.daysUntil}
${occasion.pastGiftHistory ? `- Past gift: ${occasion.pastGiftHistory[0].gift} (${occasion.pastGiftHistory[0].reaction})` : ''}

RECIPIENT:
- Relationship: ${recipient.relationship} (${recipient.intimacyLevel})
${recipient.age ? `- Age: ${recipient.age}` : ''}
- Interests: ${recipient.interests.join(', ')}
${recipient.values ? `- Values: ${recipient.values.join(', ')}` : ''}
${recipient.lifestyle ? `- Lifestyle: ${recipient.lifestyle.join(', ')}` : ''}
${recipient.recentLifeEvents ? `- Recent events: ${recipient.recentLifeEvents.join(', ')}` : ''}
${recipient.knownDislikes ? `- Dislikes: ${recipient.knownDislikes.join(', ')}` : ''}
- How well you know them: ${recipient.knowledgeLevel}

CONTEXT:
- Time pressure: ${context.timePressure}
- Budget flexibility: ${context.budgetFlexibility}
- Uncertainty level: ${context.uncertaintyLevel}
- Emotional state: ${context.emotionalState}
${context.additionalConstraints ? `- Constraints: ${context.additionalConstraints.join(', ')}` : ''}
${context.priorAttempts ? `- Prior search attempts: ${context.priorAttempts}` : ''}

QUERY STYLE TO MATCH:
- Verbosity: ${expectedQueryStyle.verbosity}
- Specificity: ${expectedQueryStyle.specificityLevel}
- Should include budget: ${expectedQueryStyle.includesBudget}
- Should include interests: ${expectedQueryStyle.includesInterests}
- Should include context: ${expectedQueryStyle.includesContext}
- Should include constraints: ${expectedQueryStyle.includesConstraints}
- Tone: ${expectedQueryStyle.naturalness}
- Clarity: ${expectedQueryStyle.clarityLevel}

TASK:
Generate a realistic gift search query that ${persona.name} would actually type.
The query should authentically reflect their:
- Communication style and tone
- Level of detail (based on verbosity and specificity)
- Current emotional state
- Time pressure and urgency
- Uncertainty or confidence
- What information they think is important to share

Also provide:
1. Expected behavior (would they refine, ask questions, etc.)
2. Ground truth about what would be ideal for this situation

Return JSON:
{
  "query": "the actual search query they would type",
  "expected_behavior": {
    "likely_to_refine": true/false,
    "likely_to_ask_questions": true/false,
    "likely_to_select_multiple": true/false,
    "decision_time_estimate": <seconds>
  },
  "ground_truth": {
    "ideal_gift_characteristics": ["characteristic1", "characteristic2", ...],
    "red_flags": ["thing to avoid 1", "thing to avoid 2", ...]
  }
}`;
  }

  /**
   * Build prompt for recommendation evaluation
   */
  private buildEvaluationPrompt(
    simulatedQuery: SimulatedQuery,
    recommendations: FinalRecommendation[]
  ): string {
    const { persona, scenario, groundTruth } = simulatedQuery;
    const { expectations } = persona;

    return `You are ${persona.name}, evaluating gift recommendations you received.

YOUR QUERY: "${simulatedQuery.query}"

YOUR EXPECTATIONS:
- Must-haves: ${expectations.mustHaves.join(', ')}
- Deal-breakers: ${expectations.dealBreakers.join(', ')}
- Min relevance score: ${expectations.minRelevanceScore}/10
- Min personalization score: ${expectations.minPersonalizationScore}/10
- Needs explanations: ${expectations.needsExplanations}
- Prefers variety: ${expectations.prefersVariety}

GROUND TRUTH (what would actually be ideal):
- Ideal characteristics: ${groundTruth.idealGiftCharacteristics.join(', ')}
- Red flags: ${groundTruth.redFlags.join(', ')}

RECOMMENDATIONS YOU RECEIVED:
${recommendations.map((rec, i) => `
${i + 1}. ${rec.product.title} - $${rec.product.price.toFixed(2)}
   Confidence: ${rec.confidence.toFixed(2)}
   Reasoning: ${rec.reasoning || 'No reasoning provided'}
`).join('\n')}

TASK:
Evaluate these recommendations from ${persona.name}'s perspective. Be honest and realistic.
Consider:
- Do they match the recipient's interests?
- Are they within budget?
- Are they appropriate for the occasion?
- Are they diverse enough?
- Are the explanations helpful?
- Would ${persona.name} actually consider these?

Also analyze the query quality:
- Did the query clearly communicate needs?
- Was the budget explicit?
- Were interests clear?

Return JSON:
{
  "query_analysis": {
    "has_explicit_budget": true/false,
    "has_recipient_age": true/false,
    "has_interests": true/false,
    "has_relationship": true/false,
    "has_occasion": true/false,
    "has_constraints": true/false,
    "clarity_score": 0.0-1.0
  },
  "recommendations": [
    {
      "perceived_relevance": 0-10,
      "would_consider": true/false,
      "notes": "brief explanation"
    }
  ],
  "overall_scores": {
    "relevance_score": 0-10,
    "personalization_score": 0-10,
    "ux_score": 0-10,
    "meets_expectations": true/false
  },
  "feedback": {
    "what_worked": ["point 1", "point 2", ...],
    "what_didnt_work": ["issue 1", "issue 2", ...],
    "suggestions": ["suggestion 1", "suggestion 2", ...]
  },
  "metrics": {
    "interest_match_accuracy": 0.0-1.0,
    "budget_adherence": 0.0-1.0,
    "occasion_appropriateness": 0.0-1.0,
    "diversity_score": 0.0-1.0,
    "explanation_quality": 0.0-1.0
  }
}`;
  }

  /**
   * Generate query variations for the same persona/scenario
   * Useful for testing consistency
   */
  async generateQueryVariations(
    persona: TestPersona,
    scenario: GiftScenario,
    count: number = 3
  ): Promise<SimulatedQuery[]> {
    logger.info('PersonaSimulator: Generating query variations', {
      personaId: persona.id,
      scenarioId: scenario.id,
      count,
    });

    const variations: SimulatedQuery[] = [];

    for (let i = 0; i < count; i++) {
      const variation = await this.generateQuery(persona, scenario);
      variations.push(variation);
    }

    return variations;
  }
}

export function createPersonaSimulator(): PersonaSimulator {
  return new PersonaSimulator();
}
