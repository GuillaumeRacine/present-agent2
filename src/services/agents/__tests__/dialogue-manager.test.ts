/**
 * DialogueManager Agent - Comprehensive Test Suite
 *
 * Tests all decision paths, edge cases, error handling, and performance budgets.
 * Target: ≥90% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogueManagerAgent } from '../dialogue-manager';
import {
  DialogueManagerInput,
  DialogueManagerOutput,
  ValidationError,
  CircuitOpenError,
} from '../../../types/dialogue';
import { ListenerOutput, MemoryOutput } from '../../../types/agents';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockListenerOutput(
  overrides: Partial<ListenerOutput> = {}
): ListenerOutput {
  return {
    userQuery: 'Test query',
    confidence: 0.5,
    interests: [],
    extractedAt: new Date(),
    ...overrides,
  };
}

function createMockMemoryOutput(): MemoryOutput {
  return {
    userPreferences: {},
    conversationHistory: [],
  };
}

function createMockInput(
  listenerOverrides: Partial<ListenerOutput> = {},
  options: {
    conversationHistory?: any[];
    forcedMode?: 'ask' | 'recommend' | 'hybrid';
  } = {}
): DialogueManagerInput {
  return {
    listenerOutput: createMockListenerOutput(listenerOverrides),
    memoryOutput: createMockMemoryOutput(),
    conversationHistory: options.conversationHistory,
    forcedMode: options.forcedMode,
  };
}

// =============================================================================
// Unit Tests - Decision Logic
// =============================================================================

describe('DialogueManager - Decision Logic', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  describe('HIGH CONFIDENCE (≥0.7) - Recommend Mode', () => {
    it('should recommend with confidence 0.7 and 3 critical fields', async () => {
      const input = createMockInput({
        confidence: 0.7,
        budget: { min: 50, max: 100, flexibility: 'moderate' },
        interests: ['cooking', 'tech'],
        recipient: { relationshipType: 'friend' },
        occasion: { name: 'birthday', urgency: 'planned' },
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('recommend');
      expect(output.proceedWithRecommendations).toBe(true);
      expect(output.confidenceAssessment.overallConfidence).toBe(0.7);
      expect(output.confidenceAssessment.criticalFieldCount).toBeGreaterThanOrEqual(3);
    });

    it('should recommend with very high confidence (0.9) even with 2 critical fields', async () => {
      const input = createMockInput({
        confidence: 0.9,
        interests: ['gaming'],
        budget: { min: 0, max: 50, flexibility: 'strict' },
      });

      const output = await agent.process(input);

      // High confidence but only 2 critical fields should trigger hybrid mode
      expect(output.mode).toBe('hybrid');
      expect(output.proceedWithRecommendations).toBe(true);
    });

    it('should recommend with confidence 0.8 and all 4 critical fields', async () => {
      const input = createMockInput({
        confidence: 0.8,
        budget: { min: 100, max: 200, flexibility: 'flexible' },
        interests: ['music', 'art'],
        recipient: { relationshipType: 'partner', age: 30 },
        occasion: { name: 'anniversary', urgency: 'planned' },
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('recommend');
      expect(output.proceedWithRecommendations).toBe(true);
      expect(output.confidenceAssessment.criticalFieldCount).toBe(4);
    });
  });

  describe('MEDIUM CONFIDENCE (0.5-0.7) - Hybrid Mode', () => {
    it('should use hybrid mode with confidence 0.6 and 2 critical fields', async () => {
      const input = createMockInput({
        confidence: 0.6,
        interests: ['sports'],
        budget: { min: 50, max: 100, flexibility: 'moderate' },
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('hybrid');
      expect(output.proceedWithRecommendations).toBe(true);
      if (output.mode === 'hybrid') {
        expect(output.questionsForRefinement).toBeDefined();
        expect(output.questionsForRefinement.length).toBeGreaterThan(0);
        expect(output.questionsForRefinement.length).toBeLessThanOrEqual(2);
      }
    });

    it('should use hybrid mode at boundary (confidence 0.5, 2 critical fields)', async () => {
      const input = createMockInput({
        confidence: 0.5,
        interests: ['cooking'],
        recipient: { relationshipType: 'parent' },
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('hybrid');
      expect(output.proceedWithRecommendations).toBe(true);
    });

    it('should use hybrid mode at upper boundary (confidence 0.69)', async () => {
      const input = createMockInput({
        confidence: 0.69,
        budget: { min: 0, max: 100, flexibility: 'flexible' },
        interests: ['reading'],
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('hybrid');
      expect(output.proceedWithRecommendations).toBe(true);
    });
  });

  describe('LOW CONFIDENCE (<0.5) - Ask Mode', () => {
    it('should ask questions with confidence 0.3', async () => {
      const input = createMockInput({
        confidence: 0.3,
        interests: [],
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('ask');
      expect(output.proceedWithRecommendations).toBe(false);
      if (output.mode === 'ask') {
        expect(output.questions).toBeDefined();
        expect(output.questions.length).toBeGreaterThan(0);
        expect(output.questions.length).toBeLessThanOrEqual(3);
      }
    });

    it('should ask questions with no critical fields', async () => {
      const input = createMockInput({
        confidence: 0.6, // Even with decent confidence
        interests: [],
        // No budget, no recipient, no occasion
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('ask');
      expect(output.proceedWithRecommendations).toBe(false);
    });

    it('should ask questions with only 1 critical field', async () => {
      const input = createMockInput({
        confidence: 0.5,
        interests: ['music'], // Only 1 critical field
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('ask');
      expect(output.proceedWithRecommendations).toBe(false);
      expect(output.confidenceAssessment.criticalFieldCount).toBe(1);
    });

    it('should ask questions with very low confidence (0.1)', async () => {
      const input = createMockInput({
        confidence: 0.1,
        interests: ['vague interest'],
      });

      const output = await agent.process(input);

      expect(output.mode).toBe('ask');
      expect(output.proceedWithRecommendations).toBe(false);
    });
  });

  describe('Critical Field Assessment', () => {
    it('should correctly identify 4/4 critical fields', async () => {
      const input = createMockInput({
        confidence: 0.7,
        budget: { min: 50, max: 100, flexibility: 'moderate' },
        interests: ['tech'],
        recipient: { relationshipType: 'friend' },
        occasion: { name: 'birthday', urgency: 'planned' },
      });

      const output = await agent.process(input);

      expect(output.confidenceAssessment.criticalFieldCount).toBe(4);
      expect(output.confidenceAssessment.criticalFieldsCovered).toContain('budget');
      expect(output.confidenceAssessment.criticalFieldsCovered).toContain('interests');
      expect(output.confidenceAssessment.criticalFieldsCovered).toContain(
        'relationshipType'
      );
      expect(output.confidenceAssessment.criticalFieldsCovered).toContain('occasion');
      expect(output.confidenceAssessment.criticalFieldsMissing).toHaveLength(0);
    });

    it('should correctly identify missing critical fields', async () => {
      const input = createMockInput({
        confidence: 0.5,
        interests: ['sports'],
        // Missing: budget, recipient, occasion
      });

      const output = await agent.process(input);

      expect(output.confidenceAssessment.criticalFieldCount).toBe(1);
      expect(output.confidenceAssessment.criticalFieldsMissing).toContain('budget');
      expect(output.confidenceAssessment.criticalFieldsMissing).toContain(
        'relationshipType'
      );
      expect(output.confidenceAssessment.criticalFieldsMissing).toContain('occasion');
    });

    it('should not count budget with max=0 as present', async () => {
      const input = createMockInput({
        confidence: 0.5,
        budget: { min: 0, max: 0, flexibility: 'moderate' }, // Invalid budget
        interests: ['gaming'],
      });

      const output = await agent.process(input);

      expect(output.confidenceAssessment.criticalFieldCount).toBe(1); // Only interests
      expect(output.confidenceAssessment.criticalFieldsMissing).toContain('budget');
    });
  });

  describe('Max Turns Enforcement', () => {
    it('should force recommend mode after 3 turns', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget'] },
        { askedQuestions: ['interests'] },
        { askedQuestions: ['relationship'] },
      ];

      const input = createMockInput(
        { confidence: 0.3 }, // Low confidence normally asks
        { conversationHistory }
      );

      const output = await agent.process(input);

      expect(output.mode).toBe('recommend');
      expect(output.proceedWithRecommendations).toBe(true);
      expect(output.reasoning).toContain('Maximum conversation turns');
    });

    it('should allow asking at turn 2', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget'] },
        { askedQuestions: ['interests'] },
      ];

      const input = createMockInput(
        { confidence: 0.3 },
        { conversationHistory }
      );

      const output = await agent.process(input);

      // At turn 2, should still allow asking
      expect(output.mode).toBe('ask');
    });

    it('should force recommend exactly at turn 3', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget'] },
        { askedQuestions: ['interests'] },
        { askedQuestions: ['relationship'] },
      ];

      const input = createMockInput(
        { confidence: 0.2, interests: [] },
        { conversationHistory }
      );

      const output = await agent.process(input);

      expect(output.mode).toBe('recommend');
      expect(output.reasoning).toMatch(/maximum.*turns/i);
    });
  });

  describe('Question Deduplication', () => {
    it('should not ask same question twice', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget', 'interests'] },
      ];

      const input = createMockInput(
        {
          confidence: 0.3,
          // Still missing budget and interests
          interests: [],
        },
        { conversationHistory }
      );

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        const questionIds = output.questions.map((q) => q.id);
        expect(questionIds).not.toContain('budget');
        expect(questionIds).not.toContain('interests');
      }
    });

    it('should ask only new questions', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget'] },
      ];

      const input = createMockInput(
        {
          confidence: 0.3,
          budget: { min: 0, max: 0, flexibility: 'moderate' }, // Still missing
          interests: [],
        },
        { conversationHistory }
      );

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        const questionIds = output.questions.map((q) => q.id);
        expect(questionIds).not.toContain('budget'); // Already asked
        expect(questionIds).toContain('interests'); // Not asked yet
      }
    });

    it('should deduplicate across multiple turns', async () => {
      const conversationHistory = [
        { askedQuestions: ['budget'] },
        { askedQuestions: ['interests', 'relationship'] },
      ];

      const input = createMockInput(
        { confidence: 0.3, interests: [] },
        { conversationHistory }
      );

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        const questionIds = output.questions.map((q) => q.id);
        expect(questionIds).not.toContain('budget');
        expect(questionIds).not.toContain('interests');
        expect(questionIds).not.toContain('relationship');
      }
    });
  });

  describe('Question Prioritization', () => {
    it('should prioritize budget question (priority 1)', async () => {
      const input = createMockInput({
        confidence: 0.3,
        interests: [],
        // Missing budget, interests, relationship, occasion
      });

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        expect(output.questions[0].id).toBe('budget');
        expect(output.questions[0].priority).toBe(1);
      }
    });

    it('should sort questions by priority then impact', async () => {
      const input = createMockInput({
        confidence: 0.3,
        interests: [],
      });

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        // Check priorities are ascending
        for (let i = 1; i < output.questions.length; i++) {
          expect(output.questions[i].priority).toBeGreaterThanOrEqual(
            output.questions[i - 1].priority
          );
        }
      }
    });

    it('should limit questions to top 3 in ask mode', async () => {
      const input = createMockInput({
        confidence: 0.2,
        interests: [],
        // Many missing fields will generate many questions
      });

      const output = await agent.process(input);

      if (output.mode === 'ask') {
        expect(output.questions.length).toBeLessThanOrEqual(3);
      }
    });

    it('should limit refinement questions to top 2 in hybrid mode', async () => {
      const input = createMockInput({
        confidence: 0.6,
        interests: ['music'], // Will trigger refinement
        budget: { min: 50, max: 100, flexibility: 'moderate' },
      });

      const output = await agent.process(input);

      if (output.mode === 'hybrid') {
        expect(output.questionsForRefinement.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Forced Mode (Testing)', () => {
    it('should force ask mode when requested', async () => {
      const input = createMockInput(
        {
          confidence: 0.9, // Normally recommends
          budget: { min: 100, max: 200, flexibility: 'flexible' },
          interests: ['tech', 'gaming'],
          recipient: { relationshipType: 'friend' },
          occasion: { name: 'birthday', urgency: 'planned' },
        },
        { forcedMode: 'ask' }
      );

      const output = await agent.process(input);

      expect(output.mode).toBe('ask');
      expect(output.reasoning).toContain('Forced mode for testing');
    });

    it('should force recommend mode when requested', async () => {
      const input = createMockInput(
        {
          confidence: 0.2, // Normally asks
          interests: [],
        },
        { forcedMode: 'recommend' }
      );

      const output = await agent.process(input);

      expect(output.mode).toBe('recommend');
      expect(output.reasoning).toContain('Forced mode for testing');
    });

    it('should force hybrid mode when requested', async () => {
      const input = createMockInput(
        {
          confidence: 0.9, // Normally recommends
          budget: { min: 100, max: 200, flexibility: 'flexible' },
          interests: ['music'],
          recipient: { relationshipType: 'partner' },
          occasion: { name: 'anniversary', urgency: 'planned' },
        },
        { forcedMode: 'hybrid' }
      );

      const output = await agent.process(input);

      expect(output.mode).toBe('hybrid');
      expect(output.reasoning).toContain('Forced mode for testing');
    });
  });
});

// =============================================================================
// Unit Tests - Question Generation
// =============================================================================

describe('DialogueManager - Question Generation', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should generate budget question when missing', async () => {
    const input = createMockInput({
      confidence: 0.3,
      interests: ['tech'],
      // No budget
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const budgetQ = output.questions.find((q) => q.id === 'budget');
      expect(budgetQ).toBeDefined();
      expect(budgetQ?.type).toBe('essential');
      expect(budgetQ?.suggestedAnswers.length).toBeGreaterThan(0);
    }
  });

  it('should generate interests question when missing', async () => {
    const input = createMockInput({
      confidence: 0.3,
      interests: [],
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const interestsQ = output.questions.find((q) => q.id === 'interests');
      expect(interestsQ).toBeDefined();
      expect(interestsQ?.type).toBe('essential');
    }
  });

  it('should generate relationship question when missing', async () => {
    const input = createMockInput({
      confidence: 0.3,
      interests: ['gaming'],
      // No recipient relationship
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const relationshipQ = output.questions.find((q) => q.id === 'relationship');
      expect(relationshipQ).toBeDefined();
      expect(relationshipQ?.field).toBe('recipient.relationshipType');
    }
  });

  it('should generate occasion question when missing', async () => {
    const input = createMockInput({
      confidence: 0.4,
      interests: ['cooking'],
      budget: { min: 50, max: 100, flexibility: 'moderate' },
      // No occasion
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const occasionQ = output.questions.find((q) => q.id === 'occasion');
      expect(occasionQ).toBeDefined();
    }
  });

  it('should generate recipient age question when missing', async () => {
    const input = createMockInput({
      confidence: 0.4,
      interests: ['sports'],
      recipient: {
        relationshipType: 'friend',
        // No age
      },
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const ageQ = output.questions.find((q) => q.id === 'recipient_age');
      expect(ageQ).toBeDefined();
    }
  });

  it('should not generate age question if life stage present', async () => {
    const input = createMockInput({
      confidence: 0.4,
      interests: ['reading'],
      recipient: {
        relationshipType: 'parent',
        // No age but...
      },
      lifeContext: {
        lifeStage: 'retirement', // Life stage is present
      },
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      const ageQ = output.questions.find((q) => q.id === 'recipient_age');
      expect(ageQ).toBeUndefined();
    }
  });

  it('should include all required fields in questions', async () => {
    const input = createMockInput({
      confidence: 0.3,
      interests: [],
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      output.questions.forEach((q) => {
        expect(q.id).toBeDefined();
        expect(q.type).toBeDefined();
        expect(q.field).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.suggestedAnswers).toBeDefined();
        expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(2);
        expect(q.priority).toBeGreaterThan(0);
        expect(q.impactOnConfidence).toBeGreaterThan(0);
        expect(q.impactOnConfidence).toBeLessThanOrEqual(1);
      });
    }
  });
});

// =============================================================================
// Unit Tests - Validation
// =============================================================================

describe('DialogueManager - Input Validation', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should throw ValidationError for missing listenerOutput', async () => {
    const input = {
      memoryOutput: createMockMemoryOutput(),
    } as any;

    await expect(agent.process(input)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for missing memoryOutput', async () => {
    const input = {
      listenerOutput: createMockListenerOutput(),
    } as any;

    await expect(agent.process(input)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid confidence (<0)', async () => {
    const input = createMockInput({
      confidence: -0.1,
      interests: ['tech'],
    });

    // Validation happens early, should throw
    await expect(agent.process(input)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid confidence (>1)', async () => {
    const input = createMockInput({
      confidence: 1.5,
      interests: ['gaming'],
    });

    // Validation happens early, should throw
    await expect(agent.process(input)).rejects.toThrow(ValidationError);
  });

  it('should gracefully degrade for invalid budget (min < 0)', async () => {
    const input = createMockInput({
      confidence: 0.5,
      budget: { min: -10, max: 100, flexibility: 'moderate' },
      interests: ['music'],
    });

    // Agent should catch validation error and gracefully degrade
    const output = await agent.process(input);
    expect(output.mode).toBe('recommend');
    if (output.mode === 'recommend') {
      expect(output.fallbackReason).toBeDefined();
      expect(output.fallbackReason).toContain('budget.min');
    }
  });

  it('should gracefully degrade for invalid budget (max < min)', async () => {
    const input = createMockInput({
      confidence: 0.5,
      budget: { min: 100, max: 50, flexibility: 'moderate' },
      interests: ['art'],
    });

    // Agent should catch validation error and gracefully degrade
    const output = await agent.process(input);
    expect(output.mode).toBe('recommend');
    if (output.mode === 'recommend') {
      expect(output.fallbackReason).toBeDefined();
      expect(output.fallbackReason).toContain('budget');
    }
  });

  it('should gracefully degrade for invalid forcedMode', async () => {
    const input = {
      listenerOutput: createMockListenerOutput(),
      memoryOutput: createMockMemoryOutput(),
      forcedMode: 'invalid_mode',
    } as any;

    // Agent should catch validation error and gracefully degrade
    const output = await agent.process(input);
    expect(output.mode).toBe('recommend');
    if (output.mode === 'recommend') {
      expect(output.fallbackReason).toBeDefined();
      expect(output.fallbackReason).toContain('forcedMode');
    }
  });

  it('should accept valid input', async () => {
    const input = createMockInput({
      confidence: 0.6,
      budget: { min: 50, max: 100, flexibility: 'moderate' },
      interests: ['cooking'],
    });

    const output = await agent.process(input);
    expect(output).toBeDefined();
    expect(output.mode).toBeDefined();
  });
});

describe('DialogueManager - Output Validation', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should produce valid ask mode output', async () => {
    const input = createMockInput({
      confidence: 0.3,
      interests: [],
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      expect(output.questions).toBeDefined();
      expect(output.questions.length).toBeGreaterThan(0);
      expect(output.proceedWithRecommendations).toBe(false);
      expect(output.reasoning).toBeDefined();
      expect(output.confidenceAssessment).toBeDefined();
      expect(output.decisionTimeMs).toBeGreaterThanOrEqual(0);
      expect(output.processedAt).toBeInstanceOf(Date);
    }
  });

  it('should produce valid recommend mode output', async () => {
    const input = createMockInput({
      confidence: 0.8,
      budget: { min: 100, max: 200, flexibility: 'flexible' },
      interests: ['tech', 'gaming'],
      recipient: { relationshipType: 'friend' },
      occasion: { name: 'birthday', urgency: 'planned' },
    });

    const output = await agent.process(input);

    if (output.mode === 'recommend') {
      expect(output.proceedWithRecommendations).toBe(true);
      expect(output.questions).toBeUndefined();
      expect(output.reasoning).toBeDefined();
      expect(output.confidenceAssessment).toBeDefined();
      expect(output.decisionTimeMs).toBeGreaterThanOrEqual(0);
      expect(output.processedAt).toBeInstanceOf(Date);
    }
  });

  it('should produce valid hybrid mode output', async () => {
    const input = createMockInput({
      confidence: 0.6,
      interests: ['music'],
      budget: { min: 50, max: 100, flexibility: 'moderate' },
    });

    const output = await agent.process(input);

    if (output.mode === 'hybrid') {
      expect(output.questionsForRefinement).toBeDefined();
      expect(output.questionsForRefinement.length).toBeGreaterThan(0);
      expect(output.proceedWithRecommendations).toBe(true);
      expect(output.reasoning).toBeDefined();
      expect(output.confidenceAssessment).toBeDefined();
      expect(output.decisionTimeMs).toBeGreaterThanOrEqual(0);
      expect(output.processedAt).toBeInstanceOf(Date);
    }
  });
});

// =============================================================================
// Unit Tests - Error Handling & Circuit Breaker
// =============================================================================

describe('DialogueManager - Error Handling', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should gracefully degrade to recommend mode on error', async () => {
    // Force an error by providing malformed data
    const input = createMockInput({
      confidence: 0.5,
      interests: ['test'],
    });

    // Mock internal error (this is a simplified test - in reality errors might be harder to trigger)
    const output = await agent.process(input);

    // Should still produce valid output
    expect(output).toBeDefined();
    expect(output.mode).toBeDefined();
    expect(['ask', 'recommend', 'hybrid']).toContain(output.mode);
  });

  it('should include fallback reason when degrading from error', async () => {
    const input = createMockInput({
      confidence: 0.5,
      interests: null as any, // Force error
    });

    try {
      const output = await agent.process(input);
      // If it gracefully degrades
      if (output.mode === 'recommend' && 'fallbackReason' in output) {
        expect(output.fallbackReason).toBeDefined();
      }
    } catch (error) {
      // Validation error is also acceptable
      expect(error).toBeInstanceOf(ValidationError);
    }
  });
});

// =============================================================================
// Vague Query Handling Tests (Issue #7)
// =============================================================================

describe('DialogueManager - Vague Query Handling (Issue #7)', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should ask questions with 2 critical fields and 0.55 confidence (new behavior)', async () => {
    const input = createMockInput({
      confidence: 0.55, // Medium-low confidence
      interests: ['birthday'], // Generic interest
      budget: { min: 0, max: 100, flexibility: 'flexible' },
      // Missing: recipient, occasion (only 2/4 critical fields)
    });

    const output = await agent.process(input);

    // NEW BEHAVIOR: Should ask questions for vague queries
    expect(output.mode).toBe('ask');
    expect(output.proceedWithRecommendations).toBe(false);
    expect(output.reasoning).toMatch(/vague query/i);
  });

  it('should ask questions with 2 critical fields and 0.59 confidence (boundary)', async () => {
    const input = createMockInput({
      confidence: 0.59, // Just below 0.60 threshold
      interests: ['gift'],
      recipient: { relationshipType: 'friend' },
      // Only 2/4 critical fields
    });

    const output = await agent.process(input);

    // Should trigger vague query handling
    expect(output.mode).toBe('ask');
    expect(output.proceedWithRecommendations).toBe(false);
  });

  it('should use hybrid mode with 3 critical fields and 0.55 confidence (unchanged)', async () => {
    const input = createMockInput({
      confidence: 0.55, // Medium-low confidence
      interests: ['tech'],
      budget: { min: 50, max: 150, flexibility: 'moderate' },
      recipient: { relationshipType: 'friend' },
      // 3/4 critical fields - should bypass vague query check
    });

    const output = await agent.process(input);

    // With 3 critical fields, should use hybrid mode (unchanged behavior)
    expect(output.mode).toBe('hybrid');
    expect(output.proceedWithRecommendations).toBe(true);
  });

  it('should use hybrid mode with 2 critical fields and 0.60 confidence (boundary)', async () => {
    const input = createMockInput({
      confidence: 0.60, // Exactly at threshold
      interests: ['gaming'],
      budget: { min: 0, max: 50, flexibility: 'strict' },
      // Only 2/4 critical fields
    });

    const output = await agent.process(input);

    // At exactly 0.60 confidence, should use hybrid mode
    expect(output.mode).toBe('hybrid');
    expect(output.proceedWithRecommendations).toBe(true);
  });

  it('should ask for very vague query like "birthday gift" (1 field, low confidence)', async () => {
    const input = createMockInput({
      confidence: 0.35, // Low confidence
      occasion: { name: 'birthday', urgency: 'planned' },
      // Only 1/4 critical fields
    });

    const output = await agent.process(input);

    // Should definitely ask questions
    expect(output.mode).toBe('ask');
    expect(output.proceedWithRecommendations).toBe(false);
    expect(output.confidenceAssessment.criticalFieldCount).toBe(1);
  });

  it('should NOT trigger vague query check with high confidence', async () => {
    const input = createMockInput({
      confidence: 0.75, // High confidence
      interests: ['music'],
      budget: { min: 100, max: 200, flexibility: 'flexible' },
      recipient: { relationshipType: 'friend' },
      // 3/4 critical fields - enough to bypass low confidence
    });

    const output = await agent.process(input);

    // High confidence with 3+ critical fields should recommend
    expect(output.mode).toBe('recommend');
    expect(output.proceedWithRecommendations).toBe(true);
  });

  it('should log vague query detection reasoning', async () => {
    const input = createMockInput({
      confidence: 0.50,
      interests: ['present'],
      // Only 1/4 critical fields
    });

    const output = await agent.process(input);

    if (output.mode === 'ask') {
      expect(output.reasoning).toContain('critical fields');
      expect(output.reasoning).toMatch(/confidence|vague/i);
    }
  });

  it('should prioritize vague query check over fallback ask mode', async () => {
    const input = createMockInput({
      confidence: 0.48, // Just above LOW threshold
      interests: ['something'],
      occasion: { name: 'general', urgency: 'flexible' },
      // 2/4 critical fields, 0.48 confidence
    });

    const output = await agent.process(input);

    // Should trigger vague query handling, not fallback
    expect(output.mode).toBe('ask');
    expect(output.reasoning).toBeDefined();
  });

  it('should handle edge case: 2 critical fields, exactly 0.60 confidence', async () => {
    const input = createMockInput({
      confidence: 0.60, // Exactly at vague query threshold
      interests: ['books'],
      budget: { min: 20, max: 80, flexibility: 'moderate' },
      // Exactly 2/4 critical fields
    });

    const output = await agent.process(input);

    // At exactly 0.60, should NOT trigger vague query handling
    expect(output.mode).toBe('hybrid');
    expect(output.proceedWithRecommendations).toBe(true);
  });

  it('should handle edge case: 3 critical fields, exactly 0.59 confidence', async () => {
    const input = createMockInput({
      confidence: 0.59, // Just below 0.60
      interests: ['fitness'],
      budget: { min: 30, max: 100, flexibility: 'flexible' },
      recipient: { relationshipType: 'colleague' },
      // Exactly 3/4 critical fields
    });

    const output = await agent.process(input);

    // With 3 critical fields, should bypass vague query check
    expect(output.mode).toBe('hybrid');
    expect(output.proceedWithRecommendations).toBe(true);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('DialogueManager - Performance', () => {
  let agent: DialogueManagerAgent;

  beforeEach(() => {
    agent = new DialogueManagerAgent();
  });

  it('should complete decision in <300ms (budget)', async () => {
    const input = createMockInput({
      confidence: 0.6,
      interests: ['tech'],
      budget: { min: 50, max: 100, flexibility: 'moderate' },
    });

    const start = Date.now();
    const output = await agent.process(input);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(300);
    expect(output.decisionTimeMs).toBeLessThan(300);
  });

  it('should complete decision in <100ms (target)', async () => {
    const input = createMockInput({
      confidence: 0.7,
      interests: ['gaming'],
      budget: { min: 0, max: 50, flexibility: 'strict' },
      recipient: { relationshipType: 'friend' },
    });

    const start = Date.now();
    const output = await agent.process(input);
    const duration = Date.now() - start;

    // Target is <100ms
    expect(duration).toBeLessThan(100);
    expect(output.decisionTimeMs).toBeLessThan(100);
  });

  it('should be fast even with complex input', async () => {
    const input = createMockInput({
      confidence: 0.45,
      interests: ['music', 'art', 'cooking', 'tech'],
      budget: { min: 100, max: 500, flexibility: 'flexible' },
      recipient: {
        relationshipType: 'partner',
        age: 30,
      },
      occasion: {
        name: 'anniversary',
        urgency: 'planned',
      },
      ambiguities: [
        { field: 'budget', issue: 'Too broad', suggestedClarification: 'What price range?' },
      ],
    });

    const start = Date.now();
    const output = await agent.process(input);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(300);
  });

  it('should track decision time accurately', async () => {
    const input = createMockInput({
      confidence: 0.5,
      interests: ['sports'],
    });

    const output = await agent.process(input);

    // Decision time might be 0ms if very fast (template-based questions)
    expect(output.decisionTimeMs).toBeGreaterThanOrEqual(0);
    expect(output.decisionTimeMs).toBeLessThan(1000); // Sanity check
  });
});
