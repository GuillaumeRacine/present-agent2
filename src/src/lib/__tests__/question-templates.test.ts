/**
 * Question Templates - Comprehensive Test Suite
 *
 * Tests template generation, refinement logic, and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  budgetQuestion,
  interestsQuestion,
  relationshipQuestion,
  occasionQuestion,
  recipientAgeQuestion,
  refineInterestQuestion,
  intentPriorityQuestion,
  giftPhilosophyQuestion,
  spaceConstraintQuestion,
  urgencyQuestion,
  ambiguityQuestion,
  identifyVagueInterests,
  detectIntentConflicts,
  getRefinementOptionsFor,
  INTEREST_REFINEMENTS,
} from '../question-templates';

// =============================================================================
// Essential Question Templates
// =============================================================================

describe('Question Templates - Essential Questions', () => {
  it('should generate valid budget question', () => {
    const q = budgetQuestion();

    expect(q.id).toBe('budget');
    expect(q.type).toBe('essential');
    expect(q.field).toBe('budget');
    expect(q.question).toBeDefined();
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(3);
    expect(q.priority).toBe(1); // Highest priority
    expect(q.impactOnConfidence).toBeGreaterThan(0);
    expect(q.rationale).toBeDefined();

    // Check suggested answers have proper structure
    q.suggestedAnswers.forEach((answer) => {
      expect(answer.label).toBeDefined();
      expect(answer.value).toBeDefined();
      expect(answer.value.min).toBeGreaterThanOrEqual(0);
      expect(answer.value.max).toBeGreaterThan(answer.value.min);
    });
  });

  it('should generate valid interests question', () => {
    const q = interestsQuestion();

    expect(q.id).toBe('interests');
    expect(q.type).toBe('essential');
    expect(q.field).toBe('interests');
    expect(q.priority).toBe(2);
    expect(q.impactOnConfidence).toBe(0.2); // Highest impact
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(4);

    // Check answers have descriptions
    q.suggestedAnswers.forEach((answer) => {
      expect(answer.label).toBeDefined();
      expect(answer.value).toBeDefined();
      expect(answer.description).toBeDefined();
    });
  });

  it('should generate valid relationship question', () => {
    const q = relationshipQuestion();

    expect(q.id).toBe('relationship');
    expect(q.type).toBe('essential');
    expect(q.field).toBe('recipient.relationshipType');
    expect(q.priority).toBe(3);
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(4);

    // Common relationships should be included
    const labels = q.suggestedAnswers.map((a) => a.label);
    expect(labels).toContain('Parent');
    expect(labels).toContain('Partner/Spouse');
    expect(labels).toContain('Friend');
  });

  it('should generate valid occasion question', () => {
    const q = occasionQuestion();

    expect(q.id).toBe('occasion');
    expect(q.type).toBe('essential');
    expect(q.field).toBe('occasion');
    expect(q.priority).toBe(4);
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(3);

    // Check occasion structure
    q.suggestedAnswers.forEach((answer) => {
      expect(answer.value.name).toBeDefined();
      expect(answer.value.urgency).toBeDefined();
    });
  });

  it('should generate valid recipient age question', () => {
    const q = recipientAgeQuestion();

    expect(q.id).toBe('recipient_age');
    expect(q.type).toBe('essential');
    expect(q.field).toBe('recipient.age');
    expect(q.priority).toBe(5);
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(4);

    // Age ranges should be numbers
    q.suggestedAnswers.forEach((answer) => {
      expect(typeof answer.value).toBe('number');
      expect(answer.value).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Refinement Questions
// =============================================================================

describe('Question Templates - Refinement Questions', () => {
  it('should generate refinement question for music', () => {
    const q = refineInterestQuestion('music');

    expect(q).toBeDefined();
    expect(q?.id).toBe('refine_music');
    expect(q?.type).toBe('refinement');
    expect(q?.field).toBe('interests');
    expect(q?.question).toContain('music');
    expect(q?.suggestedAnswers.length).toBeGreaterThan(0);
  });

  it('should generate refinement question for sports', () => {
    const q = refineInterestQuestion('sports');

    expect(q).toBeDefined();
    expect(q?.id).toBe('refine_sports');
    expect(q?.suggestedAnswers.length).toBeGreaterThan(0);

    const options = q?.suggestedAnswers.map((a) => a.value);
    expect(options).toContain('fitness');
    expect(options).toContain('sports-fan');
  });

  it('should generate refinement question for cooking', () => {
    const q = refineInterestQuestion('cooking');

    expect(q).toBeDefined();
    expect(q?.id).toBe('refine_cooking');

    const options = q?.suggestedAnswers.map((a) => a.value);
    expect(options).toContain('home-cook');
    expect(options).toContain('baker');
    expect(options).toContain('griller');
  });

  it('should generate refinement question for tech', () => {
    const q = refineInterestQuestion('tech');

    expect(q).toBeDefined();
    expect(q?.id).toBe('refine_tech');

    const options = q?.suggestedAnswers.map((a) => a.value);
    expect(options).toContain('gamer');
    expect(options).toContain('gadget-lover');
  });

  it('should return null for interests without refinements', () => {
    const q = refineInterestQuestion('unknown_interest');
    expect(q).toBeNull();
  });

  it('should be case-insensitive', () => {
    const q1 = refineInterestQuestion('Music');
    const q2 = refineInterestQuestion('MUSIC');
    const q3 = refineInterestQuestion('music');

    expect(q1).toBeDefined();
    expect(q2).toBeDefined();
    expect(q3).toBeDefined();
    expect(q1?.id).toBe(q2?.id);
    expect(q2?.id).toBe(q3?.id);
  });

  it('should have all refinement options in registry', () => {
    const interests = ['music', 'sports', 'art', 'cooking', 'tech', 'outdoors', 'reading', 'coffee', 'wine'];

    interests.forEach((interest) => {
      expect(INTEREST_REFINEMENTS[interest]).toBeDefined();
      expect(INTEREST_REFINEMENTS[interest].options.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Intent Clarification Questions
// =============================================================================

describe('Question Templates - Intent Questions', () => {
  it('should generate intent priority question', () => {
    const q = intentPriorityQuestion(['practical', 'unique']);

    expect(q.id).toBe('intent_priority');
    expect(q.type).toBe('intent');
    expect(q.field).toBe('intentSignals');
    expect(q.question).toContain('practical');
    expect(q.question).toContain('unique');
    expect(q.suggestedAnswers.length).toBe(3); // first, second, both
  });

  it('should generate gift philosophy question', () => {
    const q = giftPhilosophyQuestion();

    expect(q.id).toBe('gift_philosophy');
    expect(q.type).toBe('intent');
    expect(q.field).toBe('giftPhilosophy');
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(3);

    const values = q.suggestedAnswers.map((a) => a.value);
    expect(values).toContain('practical');
    expect(values).toContain('unique');
    expect(values).toContain('meaningful');
    expect(values).toContain('quality');
  });
});

// =============================================================================
// Constraint Questions
// =============================================================================

describe('Question Templates - Constraint Questions', () => {
  it('should generate space constraint question', () => {
    const q = spaceConstraintQuestion();

    expect(q.id).toBe('space_constraint');
    expect(q.type).toBe('constraint');
    expect(q.field).toBe('enhancedConstraints.space');
    expect(q.suggestedAnswers.length).toBe(3);

    const values = q.suggestedAnswers.map((a) => a.value);
    expect(values).toContain('minimal');
    expect(values).toContain('moderate');
    expect(values).toContain('no_constraint');
  });

  it('should generate urgency question', () => {
    const q = urgencyQuestion();

    expect(q.id).toBe('urgency');
    expect(q.type).toBe('constraint');
    expect(q.field).toBe('occasion.urgency');
    expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(3);

    const values = q.suggestedAnswers.map((a) => a.value);
    expect(values).toContain('immediate');
    expect(values).toContain('urgent');
    expect(values).toContain('planned');
    expect(values).toContain('flexible');
  });
});

// =============================================================================
// Ambiguity Questions
// =============================================================================

describe('Question Templates - Ambiguity Questions', () => {
  it('should generate ambiguity question from detected ambiguity', () => {
    const ambiguity = {
      field: 'budget',
      issue: 'Range too broad',
      suggestedClarification: 'What specific price range works for you?',
    };

    const q = ambiguityQuestion(ambiguity);

    expect(q.id).toBe('ambiguity_budget');
    expect(q.type).toBe('ambiguity');
    expect(q.field).toBe('budget');
    expect(q.question).toBe('What specific price range works for you?');
    expect(q.suggestedAnswers.length).toBeGreaterThan(0);
  });

  it('should use generic question when no suggestion provided', () => {
    const ambiguity = {
      field: 'interests',
      issue: 'Vague interest mentioned',
    };

    const q = ambiguityQuestion(ambiguity);

    expect(q.question).toContain('clarify');
    expect(q.question).toContain('Vague interest mentioned');
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

describe('Question Templates - Helper Functions', () => {
  describe('identifyVagueInterests', () => {
    it('should identify vague interests that have refinements', () => {
      const interests = ['music', 'tech', 'cooking', 'specific-hobby'];
      const vague = identifyVagueInterests(interests);

      expect(vague).toContain('music');
      expect(vague).toContain('tech');
      expect(vague).toContain('cooking');
      expect(vague).not.toContain('specific-hobby');
    });

    it('should return empty array for no vague interests', () => {
      const interests = ['knitting', 'pottery', 'specific-thing'];
      const vague = identifyVagueInterests(interests);

      expect(vague).toHaveLength(0);
    });

    it('should handle empty interests array', () => {
      const vague = identifyVagueInterests([]);
      expect(vague).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const interests = ['MUSIC', 'Tech', 'COOKING'];
      const vague = identifyVagueInterests(interests);

      expect(vague.length).toBe(3);
    });
  });

  describe('detectIntentConflicts', () => {
    it('should detect safe + unique conflict', () => {
      const intentSignals = {
        safe: true,
        unique: true,
      };

      const conflicts = detectIntentConflicts(intentSignals);

      expect(conflicts).toContain('safe');
      expect(conflicts).toContain('unique');
    });

    it('should detect practical + sentimental conflict', () => {
      const intentSignals = {
        practical: true,
        sentimental: true,
      };

      const conflicts = detectIntentConflicts(intentSignals);

      expect(conflicts).toContain('practical');
      expect(conflicts).toContain('sentimental');
    });

    it('should detect safe + impress conflict', () => {
      const intentSignals = {
        safe: true,
        impress: true,
      };

      const conflicts = detectIntentConflicts(intentSignals);

      expect(conflicts).toContain('safe');
      expect(conflicts).toContain('impress');
    });

    it('should return empty array for no conflicts', () => {
      const intentSignals = {
        practical: true,
        unique: false,
      };

      const conflicts = detectIntentConflicts(intentSignals);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty intent signals', () => {
      const conflicts = detectIntentConflicts({});
      expect(conflicts).toHaveLength(0);
    });

    it('should detect multiple conflicts', () => {
      const intentSignals = {
        safe: true,
        unique: true,
        impress: true,
      };

      const conflicts = detectIntentConflicts(intentSignals);

      // Should detect both safe+unique and safe+impress
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('getRefinementOptionsFor', () => {
    it('should return options for valid interest', () => {
      const options = getRefinementOptionsFor('music');

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].label).toBeDefined();
      expect(options[0].value).toBeDefined();
    });

    it('should return empty array for unknown interest', () => {
      const options = getRefinementOptionsFor('unknown');
      expect(options).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const options1 = getRefinementOptionsFor('Music');
      const options2 = getRefinementOptionsFor('music');

      expect(options1.length).toBe(options2.length);
    });
  });
});

// =============================================================================
// Question Template Structure Validation
// =============================================================================

describe('Question Templates - Structure Validation', () => {
  const allQuestions = [
    budgetQuestion(),
    interestsQuestion(),
    relationshipQuestion(),
    occasionQuestion(),
    recipientAgeQuestion(),
    giftPhilosophyQuestion(),
    spaceConstraintQuestion(),
    urgencyQuestion(),
  ];

  it('should have unique IDs', () => {
    const ids = allQuestions.map((q) => q.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid priority values', () => {
    allQuestions.forEach((q) => {
      expect(q.priority).toBeGreaterThan(0);
      expect(q.priority).toBeLessThan(20); // Reasonable range
    });
  });

  it('should have valid impact on confidence values', () => {
    allQuestions.forEach((q) => {
      expect(q.impactOnConfidence).toBeGreaterThan(0);
      expect(q.impactOnConfidence).toBeLessThanOrEqual(1);
    });
  });

  it('should have at least 2 suggested answers', () => {
    allQuestions.forEach((q) => {
      expect(q.suggestedAnswers.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should have proper answer structure', () => {
    allQuestions.forEach((q) => {
      q.suggestedAnswers.forEach((answer) => {
        expect(answer.label).toBeDefined();
        expect(answer.label.length).toBeGreaterThan(0);
        expect(answer.value).toBeDefined();
      });
    });
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Question Templates - Performance', () => {
  it('should generate questions instantly (0ms)', () => {
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      budgetQuestion();
      interestsQuestion();
      relationshipQuestion();
    }

    const duration = Date.now() - start;

    // Should be nearly instant (< 10ms for 1000 iterations)
    expect(duration).toBeLessThan(10);
  });

  it('should generate refinement questions quickly', () => {
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      refineInterestQuestion('music');
      refineInterestQuestion('sports');
      refineInterestQuestion('tech');
    }

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('should identify vague interests quickly', () => {
    const interests = ['music', 'tech', 'cooking', 'art', 'sports'];
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      identifyVagueInterests(interests);
    }

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
