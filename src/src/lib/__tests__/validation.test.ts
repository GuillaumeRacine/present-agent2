/**
 * Validation - Comprehensive Test Suite
 *
 * Tests all validation functions for DialogueManager inputs/outputs
 */

import { describe, it, expect } from 'vitest';
import {
  validateDialogueManagerInput,
  validateDialogueManagerOutput,
  validateClarificationAnswers,
  validateConfidenceAssessment,
  validateConversationTurn,
  isValidDate,
  hasRequiredKeys,
  sanitizeErrorMessage,
} from '../validation';
import {
  ValidationError,
  DialogueManagerInput,
  DialogueManagerOutput,
} from '../../types/dialogue';
import { ListenerOutput, MemoryOutput } from '../../types/agents';

// =============================================================================
// Test Helpers
// =============================================================================

function createValidListenerOutput(): ListenerOutput {
  return {
    userQuery: 'test query',
    confidence: 0.6,
    interests: ['tech'],
    extractedAt: new Date(),
  };
}

function createValidMemoryOutput(): MemoryOutput {
  return {
    userPreferences: {},
    conversationHistory: [],
  };
}

// =============================================================================
// Input Validation Tests
// =============================================================================

describe('Validation - DialogueManager Input', () => {
  it('should accept valid input', () => {
    const input: DialogueManagerInput = {
      listenerOutput: createValidListenerOutput(),
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).not.toThrow();
  });

  it('should reject missing listenerOutput', () => {
    const input = {
      memoryOutput: createValidMemoryOutput(),
    } as any;

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('listenerOutput is required');
  });

  it('should reject missing memoryOutput', () => {
    const input = {
      listenerOutput: createValidListenerOutput(),
    } as any;

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('memoryOutput is required');
  });

  it('should reject confidence < 0', () => {
    const input: DialogueManagerInput = {
      listenerOutput: { ...createValidListenerOutput(), confidence: -0.1 },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('Invalid confidence');
  });

  it('should reject confidence > 1', () => {
    const input: DialogueManagerInput = {
      listenerOutput: { ...createValidListenerOutput(), confidence: 1.5 },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
  });

  it('should accept confidence at boundaries (0 and 1)', () => {
    const input1: DialogueManagerInput = {
      listenerOutput: { ...createValidListenerOutput(), confidence: 0 },
      memoryOutput: createValidMemoryOutput(),
    };

    const input2: DialogueManagerInput = {
      listenerOutput: { ...createValidListenerOutput(), confidence: 1 },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input1)).not.toThrow();
    expect(() => validateDialogueManagerInput(input2)).not.toThrow();
  });

  it('should reject negative budget.min', () => {
    const input: DialogueManagerInput = {
      listenerOutput: {
        ...createValidListenerOutput(),
        budget: { min: -10, max: 100, flexibility: 'moderate' },
      },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('budget.min');
  });

  it('should reject budget.max < budget.min', () => {
    const input: DialogueManagerInput = {
      listenerOutput: {
        ...createValidListenerOutput(),
        budget: { min: 100, max: 50, flexibility: 'flexible' },
      },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('budget.max');
  });

  it('should accept valid budget', () => {
    const input: DialogueManagerInput = {
      listenerOutput: {
        ...createValidListenerOutput(),
        budget: { min: 50, max: 100, flexibility: 'moderate' },
      },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).not.toThrow();
  });

  it('should reject non-array interests', () => {
    const input: DialogueManagerInput = {
      listenerOutput: {
        ...createValidListenerOutput(),
        interests: 'not an array' as any,
      },
      memoryOutput: createValidMemoryOutput(),
    };

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('interests must be an array');
  });

  it('should accept valid forcedMode values', () => {
    const modes: Array<'ask' | 'recommend' | 'hybrid'> = ['ask', 'recommend', 'hybrid'];

    modes.forEach((mode) => {
      const input: DialogueManagerInput = {
        listenerOutput: createValidListenerOutput(),
        memoryOutput: createValidMemoryOutput(),
        forcedMode: mode,
      };

      expect(() => validateDialogueManagerInput(input)).not.toThrow();
    });
  });

  it('should reject invalid forcedMode', () => {
    const input = {
      listenerOutput: createValidListenerOutput(),
      memoryOutput: createValidMemoryOutput(),
      forcedMode: 'invalid',
    } as any;

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
    expect(() => validateDialogueManagerInput(input)).toThrow('Invalid forcedMode');
  });

  it('should accept valid conversation history', () => {
    const input: DialogueManagerInput = {
      listenerOutput: createValidListenerOutput(),
      memoryOutput: createValidMemoryOutput(),
      conversationHistory: [
        {
          sessionId: 'test',
          turnNumber: 1,
          askedQuestions: ['budget'],
        },
      ],
    };

    expect(() => validateDialogueManagerInput(input)).not.toThrow();
  });

  it('should reject non-array conversation history', () => {
    const input = {
      listenerOutput: createValidListenerOutput(),
      memoryOutput: createValidMemoryOutput(),
      conversationHistory: 'not an array',
    } as any;

    expect(() => validateDialogueManagerInput(input)).toThrow(ValidationError);
  });
});

// =============================================================================
// Output Validation Tests
// =============================================================================

describe('Validation - DialogueManager Output', () => {
  describe('Ask Mode Validation', () => {
    it('should accept valid ask mode output', () => {
      const output: DialogueManagerOutput = {
        mode: 'ask',
        questions: [
          {
            id: 'budget',
            type: 'essential',
            field: 'budget',
            question: 'What is your budget?',
            suggestedAnswers: [
              { label: 'Under $50', value: { min: 0, max: 50 } },
              { label: '$50-$100', value: { min: 50, max: 100 } },
            ],
            priority: 1,
            impactOnConfidence: 0.15,
          },
        ],
        proceedWithRecommendations: false,
        reasoning: 'Low confidence',
        confidenceAssessment: {
          overallConfidence: 0.3,
          criticalFieldsCovered: [],
          criticalFieldsMissing: ['budget'],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      };

      expect(() => validateDialogueManagerOutput(output)).not.toThrow();
    });

    it('should reject ask mode with no questions', () => {
      const output = {
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
      } as DialogueManagerOutput;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('Ask mode requires questions');
    });

    it('should reject ask mode with proceedWithRecommendations=true', () => {
      const output = {
        mode: 'ask',
        questions: [
          {
            id: 'budget',
            type: 'essential',
            field: 'budget',
            question: 'Budget?',
            suggestedAnswers: [
              { label: 'Low', value: 'low' },
              { label: 'High', value: 'high' },
            ],
            priority: 1,
            impactOnConfidence: 0.15,
          },
        ],
        proceedWithRecommendations: true, // Invalid for ask mode
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
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('must not proceed to recommendations');
    });

    it('should reject questions with < 2 answers', () => {
      const output = {
        mode: 'ask',
        questions: [
          {
            id: 'budget',
            type: 'essential',
            field: 'budget',
            question: 'Budget?',
            suggestedAnswers: [{ label: 'Low', value: 'low' }], // Only 1 answer
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
      } as DialogueManagerOutput;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('at least 2 answer options');
    });

    it('should reject questions with invalid priority', () => {
      const output = {
        mode: 'ask',
        questions: [
          {
            id: 'budget',
            type: 'essential',
            field: 'budget',
            question: 'Budget?',
            suggestedAnswers: [
              { label: 'Low', value: 'low' },
              { label: 'High', value: 'high' },
            ],
            priority: 0, // Invalid (must be >= 1)
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
      } as DialogueManagerOutput;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('invalid priority');
    });

    it('should reject questions with invalid impactOnConfidence', () => {
      const output = {
        mode: 'ask',
        questions: [
          {
            id: 'budget',
            type: 'essential',
            field: 'budget',
            question: 'Budget?',
            suggestedAnswers: [
              { label: 'Low', value: 'low' },
              { label: 'High', value: 'high' },
            ],
            priority: 1,
            impactOnConfidence: 1.5, // Invalid (must be 0-1)
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
      } as DialogueManagerOutput;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('invalid impactOnConfidence');
    });
  });

  describe('Recommend Mode Validation', () => {
    it('should accept valid recommend mode output', () => {
      const output: DialogueManagerOutput = {
        mode: 'recommend',
        proceedWithRecommendations: true,
        reasoning: 'High confidence',
        confidenceAssessment: {
          overallConfidence: 0.8,
          criticalFieldsCovered: ['budget', 'interests'],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 2,
        },
        decisionTimeMs: 30,
        processedAt: new Date(),
      };

      expect(() => validateDialogueManagerOutput(output)).not.toThrow();
    });

    it('should accept recommend mode with fallbackReason', () => {
      const output: DialogueManagerOutput = {
        mode: 'recommend',
        proceedWithRecommendations: true,
        reasoning: 'Error recovery',
        confidenceAssessment: {
          overallConfidence: 0.5,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 100,
        processedAt: new Date(),
        fallbackReason: 'Circuit breaker tripped',
      };

      expect(() => validateDialogueManagerOutput(output)).not.toThrow();
    });

    it('should reject recommend mode with questions', () => {
      const output = {
        mode: 'recommend',
        questions: [{ id: 'test' }], // Should not have questions
        proceedWithRecommendations: true,
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.8,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('should not have questions');
    });

    it('should reject recommend mode with proceedWithRecommendations=false', () => {
      const output = {
        mode: 'recommend',
        proceedWithRecommendations: false, // Invalid
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.8,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('must proceed to recommendations');
    });
  });

  describe('Hybrid Mode Validation', () => {
    it('should accept valid hybrid mode output', () => {
      const output: DialogueManagerOutput = {
        mode: 'hybrid',
        questionsForRefinement: [
          {
            id: 'refine_music',
            type: 'refinement',
            field: 'interests',
            question: 'Refine music interest?',
            suggestedAnswers: [
              { label: 'Plays instrument', value: 'musician' },
              { label: 'Listens', value: 'listener' },
            ],
            priority: 6,
            impactOnConfidence: 0.12,
          },
        ],
        proceedWithRecommendations: true,
        reasoning: 'Medium confidence',
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: ['interests'],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 1,
        },
        decisionTimeMs: 40,
        processedAt: new Date(),
      };

      expect(() => validateDialogueManagerOutput(output)).not.toThrow();
    });

    it('should reject hybrid mode with no refinement questions', () => {
      const output = {
        mode: 'hybrid',
        questionsForRefinement: [],
        proceedWithRecommendations: true,
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as DialogueManagerOutput;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('requires refinement questions');
    });

    it('should reject hybrid mode with proceedWithRecommendations=false', () => {
      const output = {
        mode: 'hybrid',
        questionsForRefinement: [
          {
            id: 'test',
            type: 'refinement',
            field: 'test',
            question: 'Test?',
            suggestedAnswers: [
              { label: 'A', value: 'a' },
              { label: 'B', value: 'b' },
            ],
            priority: 1,
            impactOnConfidence: 0.1,
          },
        ],
        proceedWithRecommendations: false, // Invalid
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('must proceed to recommendations');
    });
  });

  describe('Common Field Validation', () => {
    it('should reject missing mode', () => {
      const output = {
        proceedWithRecommendations: true,
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('mode is required');
    });

    it('should reject missing reasoning', () => {
      const output = {
        mode: 'recommend',
        proceedWithRecommendations: true,
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('reasoning is required');
    });

    it('should reject missing confidenceAssessment', () => {
      const output = {
        mode: 'recommend',
        proceedWithRecommendations: true,
        reasoning: 'Test',
        decisionTimeMs: 50,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('confidenceAssessment is required');
    });

    it('should reject negative decisionTimeMs', () => {
      const output = {
        mode: 'recommend',
        proceedWithRecommendations: true,
        reasoning: 'Test',
        confidenceAssessment: {
          overallConfidence: 0.6,
          criticalFieldsCovered: [],
          criticalFieldsMissing: [],
          highImpactAmbiguities: [],
          criticalFieldCount: 0,
        },
        decisionTimeMs: -10,
        processedAt: new Date(),
      } as any;

      expect(() => validateDialogueManagerOutput(output)).toThrow(ValidationError);
      expect(() => validateDialogueManagerOutput(output)).toThrow('Invalid decisionTimeMs');
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('Validation - Helper Functions', () => {
  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2024-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate(123)).toBe(false);
    });
  });

  describe('hasRequiredKeys', () => {
    it('should return true when all keys present', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(hasRequiredKeys(obj, ['a', 'b'])).toBe(true);
    });

    it('should return false when keys missing', () => {
      const obj = { a: 1 };
      expect(hasRequiredKeys(obj, ['a', 'b'])).toBe(false);
    });

    it('should handle empty requirements', () => {
      const obj = { a: 1 };
      expect(hasRequiredKeys(obj, [])).toBe(true);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should redact credit card numbers', () => {
      const message = 'Error with card 1234567812345678';
      const sanitized = sanitizeErrorMessage(message);

      expect(sanitized).not.toContain('1234567812345678');
      expect(sanitized).toContain('[CARD]');
    });

    it('should redact SSN', () => {
      const message = 'Error with SSN 123-45-6789';
      const sanitized = sanitizeErrorMessage(message);

      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).toContain('[SSN]');
    });

    it('should redact Bearer tokens', () => {
      const message = 'Error with Bearer abc123xyz';
      const sanitized = sanitizeErrorMessage(message);

      expect(sanitized).not.toContain('abc123xyz');
      expect(sanitized).toContain('Bearer [TOKEN]');
    });

    it('should handle messages without sensitive data', () => {
      const message = 'Simple error message';
      const sanitized = sanitizeErrorMessage(message);

      expect(sanitized).toBe(message);
    });
  });
});
