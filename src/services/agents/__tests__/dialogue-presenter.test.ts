/**
 * DialoguePresenter Agent Tests
 *
 * Tests the conversational presentation layer that transforms
 * raw DialogueManager outputs into warm, human-like interactions.
 */

import { DialoguePresenterAgent } from '../dialogue-presenter';
import {
  DialoguePresenterInput,
  DialoguePresenterOutput,
  UserContext,
} from '../../../types/presentation';
import { DialogueManagerOutput } from '../../../types/dialogue';

describe('DialoguePresenterAgent', () => {
  let agent: DialoguePresenterAgent;

  beforeEach(() => {
    agent = new DialoguePresenterAgent();
  });

  // ==========================================================================
  // Question Presentation Tests
  // ==========================================================================

  describe('Question Presentation (ASK mode)', () => {
    it('should generate natural language wrapper for questions', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [
            {
              id: 'budget',
              type: 'essential',
              field: 'budget',
              question: "What's your budget range?",
              suggestedAnswers: [
                { label: 'Under $50', value: { min: 0, max: 50 } },
                { label: '$50-100', value: { min: 50, max: 100 } },
              ],
              priority: 1,
              impactOnConfidence: 0.15,
            },
          ],
          proceedWithRecommendations: false,
          reasoning: 'Low confidence',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: ['relationship'],
            criticalFieldsMissing: ['budget', 'interests'],
            highImpactAmbiguities: [],
            criticalFieldCount: 1,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.naturalLanguage).toBeTruthy();
      expect(result.naturalLanguage).toContain('gift');
      expect(result.questions).toHaveLength(1);
      expect(result.showEscapeHatch).toBe(true);
    });

    it('should show urgent greeting for time-pressured users', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [],
          proceedWithRecommendations: false,
          reasoning: 'Test',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 0,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'stressed',
          timePressure: 'urgent',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.naturalLanguage).toContain('fast');
    });

    it('should show encouragement for budget-sensitive users', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [
            {
              id: 'budget',
              type: 'essential',
              field: 'budget',
              question: "What's your budget?",
              suggestedAnswers: [],
              priority: 1,
              impactOnConfidence: 0.15,
            },
          ],
          proceedWithRecommendations: false,
          reasoning: 'Test',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 0,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'high',
          confidenceLevel: 'uncertain',
          budget: { min: 10, max: 30 },
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.encouragement).toBeTruthy();
      expect(result.encouragement).toContain('budget');
    });

    it('should acknowledge user context in natural language', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [],
          proceedWithRecommendations: false,
          reasoning: 'Test',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 0,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
          recipient: {
            relationshipType: 'mom',
          },
          interests: ['cooking'],
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.naturalLanguage).toContain('mom');
      expect(result.naturalLanguage).toContain('cooking');
    });

    it('should format questions with emojis', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [
            {
              id: 'budget',
              type: 'essential',
              field: 'budget',
              question: "What's your budget?",
              suggestedAnswers: [
                { label: 'Under $50', value: { min: 0, max: 50 } },
              ],
              priority: 1,
              impactOnConfidence: 0.15,
            },
          ],
          proceedWithRecommendations: false,
          reasoning: 'Test',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 0,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.naturalLanguage).toContain('💰');
    });
  });

  // ==========================================================================
  // Recommendation Presentation Tests
  // ==========================================================================

  describe('Recommendation Presentation (RECOMMEND mode)', () => {
    it('should generate transition message', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'recommend',
          proceedWithRecommendations: true,
          reasoning: 'High confidence',
          confidenceAssessment: {
            overallConfidence: 0.8,
            criticalFieldsCovered: ['budget', 'interests'],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 4,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'confident',
          budget: { min: 50, max: 100 },
          interests: ['cooking'],
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('recommendations');
      expect(result.naturalLanguage).toBeTruthy();
      expect(result.naturalLanguage).toContain('options');
    });

    it('should generate context summary', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'recommend',
          proceedWithRecommendations: true,
          reasoning: 'High confidence',
          confidenceAssessment: {
            overallConfidence: 0.8,
            criticalFieldsCovered: ['budget', 'interests', 'relationship'],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 4,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'confident',
          budget: { min: 50, max: 100 },
          interests: ['cooking', 'gardening'],
          recipient: {
            relationshipType: 'mom',
          },
          occasion: {
            name: 'birthday',
          },
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('recommendations');
      expect(result.contextSummary).toBeTruthy();
      expect(result.contextSummary?.items.length).toBeGreaterThan(0);

      // Check that summary contains expected fields
      const summaryText = JSON.stringify(result.contextSummary);
      expect(summaryText).toContain('50-100');
      expect(summaryText).toContain('cooking');
      expect(summaryText).toContain('mom');
    });

    it('should show "Perfect!" transition after questions', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'recommend',
          proceedWithRecommendations: true,
          reasoning: 'High confidence',
          confidenceAssessment: {
            overallConfidence: 0.8,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 4,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'confident',
        },
        conversationHistory: [
          {
            mode: 'ask',
            askedQuestions: ['budget', 'interests'],
            userCorrected: false,
          },
        ],
      };

      const result = await agent.process(input);

      expect(result.type).toBe('recommendations');
      expect(result.naturalLanguage).toContain('Perfect');
    });
  });

  // ==========================================================================
  // Hybrid Mode Tests
  // ==========================================================================

  describe('Hybrid Mode Presentation', () => {
    it('should present hybrid mode with transition and summary', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'hybrid',
          questionsForRefinement: [
            {
              id: 'interests',
              type: 'refinement',
              field: 'interests',
              question: 'What are they interested in?',
              suggestedAnswers: [],
              priority: 2,
              impactOnConfidence: 0.2,
            },
          ],
          proceedWithRecommendations: true,
          reasoning: 'Medium confidence',
          confidenceAssessment: {
            overallConfidence: 0.6,
            criticalFieldsCovered: ['budget'],
            criticalFieldsMissing: ['interests'],
            highImpactAmbiguities: [],
            criticalFieldCount: 2,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
          budget: { min: 50, max: 100 },
        },
      };

      const result = await agent.process(input);

      expect(result.type).toBe('hybrid');
      expect(result.naturalLanguage).toBeTruthy();
      expect(result.refinementQuestions).toHaveLength(1);
      expect(result.contextSummary).toBeTruthy();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should provide fallback presentation on error', async () => {
      const input: DialoguePresenterInput = {
        dialogueOutput: {
          mode: 'ask',
          questions: [],
          proceedWithRecommendations: false,
          reasoning: 'Test',
          confidenceAssessment: {
            overallConfidence: 0.3,
            criticalFieldsCovered: [],
            criticalFieldsMissing: [],
            highImpactAmbiguities: [],
            criticalFieldCount: 0,
          },
          decisionTimeMs: 50,
          processedAt: new Date(),
        },
        userContext: {
          emotionalState: 'neutral',
          timePressure: 'low',
          budgetSensitivity: 'medium',
          confidenceLevel: 'uncertain',
        },
      };

      // Should not throw even with empty questions
      const result = await agent.process(input);

      expect(result.type).toBe('questions');
      expect(result.naturalLanguage).toBeTruthy();
    });
  });
});
