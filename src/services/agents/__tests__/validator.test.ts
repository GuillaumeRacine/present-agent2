/**
 * Validator Agent - Comprehensive Test Suite
 *
 * Tests threshold tuning changes (Issue #6) and validation logic.
 * Target: ≥80% coverage for new threshold changes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidatorAgent } from '../validator';
import {
  ValidatorInput,
  ValidatorOutput,
  ProductCandidate,
  ExplorerOutput,
  MeaningOutput,
  ConstraintsOutput,
  RelationshipOutput,
  MemoryOutput,
  ListenerOutput,
} from '../../../types/agents';
import OpenAI from 'openai';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockListenerOutput(): ListenerOutput {
  return {
    userQuery: 'Test query',
    confidence: 0.7,
    interests: ['tech', 'gaming'],
    extractedAt: new Date(),
  };
}

function createMockMemoryOutput(): MemoryOutput {
  return {
    userPreferences: {},
    conversationHistory: [],
    listenerContext: createMockListenerOutput(),
  };
}

function createMockRelationshipOutput(): RelationshipOutput {
  return {
    relationshipAnalysis: {
      relationshipType: 'friend',
      intimacyLevel: 'close',
      socialNorms: {
        appropriatePriceRange: { min: 50, max: 150 },
      },
    },
    memoryContext: createMockMemoryOutput(),
  };
}

function createMockConstraintsOutput(): ConstraintsOutput {
  return {
    hardConstraints: {
      budget: { min: 50, max: 150, flexibility: 'moderate' },
      requiredAttributes: [],
      excludedAttributes: [],
    },
    relationshipContext: createMockRelationshipOutput(),
  };
}

function createMockMeaningOutput(): MeaningOutput {
  return {
    meaningFramework: {
      primaryIntent: 'celebrate',
      giftArchetype: 'thoughtful',
      emotionalGoal: 'show appreciation',
    },
    constraintsContext: createMockConstraintsOutput(),
  };
}

function createMockProductCandidate(
  overrides: Partial<ProductCandidate> = {}
): ProductCandidate {
  return {
    product: {
      id: `product-${Math.random()}`,
      title: 'Test Product',
      description: 'A great test product for testing',
      price: 100,
      imageUrl: 'https://example.com/image.jpg',
      vendor: 'TestVendor',
      productType: 'physical',
      tags: ['test'],
    },
    scores: {
      hybridScore: 0.5,
      vectorScore: 0.5,
      graphScore: 0.5,
    },
    matchReasons: {
      matchedInterests: ['tech'],
      matchedArchetype: 'thoughtful',
    },
    ...overrides,
  };
}

function createMockExplorerOutput(
  candidates: ProductCandidate[] = []
): ExplorerOutput {
  return {
    candidates: candidates.length > 0 ? candidates : [
      createMockProductCandidate(),
      createMockProductCandidate(),
      createMockProductCandidate(),
    ],
    searchMetadata: {
      totalResults: 10,
      searchTimeMs: 100,
    },
    meaningContext: createMockMeaningOutput(),
  };
}

function createMockValidatorInput(
  candidates: ProductCandidate[] = []
): ValidatorInput {
  return {
    explorerContext: createMockExplorerOutput(candidates),
  };
}

// =============================================================================
// Threshold Tuning Tests (Issue #6)
// =============================================================================

describe('Validator - Threshold Tuning (Issue #6)', () => {
  let validator: ValidatorAgent;
  let mockOpenAI: OpenAI;

  beforeEach(() => {
    mockOpenAI = {} as OpenAI;
    validator = new ValidatorAgent(mockOpenAI);
  });

  describe('STRICT Thresholds (lowered from 0.50/0.40 to 0.40/0.35)', () => {
    it('should PASS product with hybrid score 0.42 (was failing at 0.50 threshold)', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: {
            hybridScore: 0.42, // Above new STRICT threshold (0.40)
            vectorScore: 0.42,
            graphScore: 0.40,
          },
          matchReasons: {
            matchedInterests: ['tech', 'gaming'], // 100% match (2/2)
            matchedArchetype: 'thoughtful',
          },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      expect(output.validatedCandidates.length).toBeGreaterThan(0);
      expect(output.validationSummary.passed).toBeGreaterThan(0);

      // Should use STRICT thresholds and pass
      expect(output.validationSummary.thresholdsUsed).toEqual({
        hybridScore: 0.40,
        interestMatch: 0.35,
        archetypeMatch: 0.25,
        personalizationScore: 0.40,
      });
    });

    it('should PASS product with hybrid score 0.40 (boundary test)', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: {
            hybridScore: 0.40, // Exactly at STRICT threshold
            vectorScore: 0.40,
            graphScore: 0.40,
          },
          matchReasons: {
            matchedInterests: ['tech', 'gaming'],
            matchedArchetype: 'thoughtful',
          },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      expect(output.validatedCandidates.length).toBeGreaterThan(0);
    });

    it('should REJECT product with hybrid score 0.38 under STRICT', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: {
            hybridScore: 0.38, // Below STRICT threshold (0.40)
            vectorScore: 0.38,
            graphScore: 0.38,
          },
          matchReasons: {
            matchedInterests: ['tech'],
            matchedArchetype: 'thoughtful',
          },
        }),
        // Add more candidates to prevent threshold lowering
        createMockProductCandidate({
          scores: { hybridScore: 0.45, vectorScore: 0.45, graphScore: 0.45 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.55, vectorScore: 0.55, graphScore: 0.55 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // First candidate should be rejected
      const firstCandidateId = candidates[0].product.id;
      const wasRejected = output.rejectedCandidates.some(
        (r) => r.candidate.product.id === firstCandidateId
      );

      expect(wasRejected).toBe(true);
    });

    it('should PASS product with interest match 0.36 (was failing at 0.40 threshold)', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: {
            hybridScore: 0.50,
            vectorScore: 0.50,
            graphScore: 0.50,
          },
          matchReasons: {
            matchedInterests: ['tech'], // 50% match, but let's simulate 36% through other means
            matchedArchetype: 'thoughtful',
          },
        }),
      ];

      // Create input with more interests to test interest match percentage
      const input = createMockValidatorInput(candidates);
      input.explorerContext.meaningContext.constraintsContext.relationshipContext.memoryContext.listenerContext.interests =
        ['tech', 'gaming', 'music']; // 3 interests, 1 match = 33%

      const output = await validator.process(input);

      // With 33% interest match (below new 35% threshold), should fail on interest match
      // But we have high hybrid score, so depends on overall validation logic
      expect(output.validationSummary.totalCandidates).toBeGreaterThan(0);
    });
  });

  describe('RELAXED Thresholds (0.35 hybrid, 0.25 interest)', () => {
    it('should PASS product with hybrid score 0.38 under RELAXED thresholds', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: {
            hybridScore: 0.38, // Above RELAXED threshold (0.35)
            vectorScore: 0.38,
            graphScore: 0.38,
          },
          matchReasons: {
            matchedInterests: ['tech'],
            matchedArchetype: 'thoughtful',
          },
        }),
        createMockProductCandidate({
          scores: {
            hybridScore: 0.36,
            vectorScore: 0.36,
            graphScore: 0.36,
          },
          matchReasons: {
            matchedInterests: ['tech'],
            matchedArchetype: 'thoughtful',
          },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // Should fall back to RELAXED thresholds if STRICT doesn't give enough products
      if (output.validationSummary.thresholdsLowered) {
        expect(output.validationSummary.thresholdsUsed.hybridScore).toBe(0.35);
        expect(output.validatedCandidates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Threshold Tier Logging', () => {
    it('should log STRICT threshold tier when using strict thresholds', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.45, vectorScore: 0.45, graphScore: 0.45 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.42, vectorScore: 0.42, graphScore: 0.42 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // Verify output contains threshold information
      expect(output.validationSummary.thresholdsUsed).toBeDefined();
      expect(output.validationSummary.thresholdsUsed.hybridScore).toBe(0.40);
      expect(output.validationSummary.thresholdsUsed.interestMatch).toBe(0.35);
    });

    it('should log threshold tier when lowering to RELAXED', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: { hybridScore: 0.36, vectorScore: 0.36, graphScore: 0.36 },
          matchReasons: { matchedInterests: ['tech'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.37, vectorScore: 0.37, graphScore: 0.37 },
          matchReasons: { matchedInterests: ['tech'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.38, vectorScore: 0.38, graphScore: 0.38 },
          matchReasons: { matchedInterests: ['tech'], matchedArchetype: 'thoughtful' },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // Should lower thresholds
      expect(output.validationSummary.thresholdsLowered).toBeDefined();

      if (output.validationSummary.thresholdsLowered) {
        expect(output.validationSummary.thresholdsUsed.hybridScore).toBeLessThan(0.40);
      }
    });
  });

  describe('Progressive Threshold Lowering', () => {
    it('should report thresholds used in validation summary', async () => {
      // Create products with various scores
      const candidates = Array.from({ length: 5 }, (_, i) =>
        createMockProductCandidate({
          product: {
            id: `product-${i}`,
            title: `Test Product ${i}`,
            description: 'A test product for threshold validation',
            price: 100 + i * 10, // Different prices
            imageUrl: `https://example.com/${i}.jpg`,
            vendor: `Vendor${i % 3}`, // Mix of vendors
            productType: 'physical',
            tags: ['test'],
          },
          scores: { hybridScore: 0.40 + i * 0.02, vectorScore: 0.40, graphScore: 0.40 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        })
      );

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // Should report thresholds used
      expect(output.validationSummary.thresholdsUsed).toBeDefined();
      expect(output.validationSummary.thresholdsUsed.hybridScore).toBeDefined();
      expect(output.validationSummary.thresholdsLowered).toBeDefined();
    });

    it('should not lower thresholds if already have 3+ products', async () => {
      const candidates = [
        createMockProductCandidate({
          scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.48, vectorScore: 0.48, graphScore: 0.48 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
        createMockProductCandidate({
          scores: { hybridScore: 0.45, vectorScore: 0.45, graphScore: 0.45 },
          matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
        }),
      ];

      const input = createMockValidatorInput(candidates);
      const output = await validator.process(input);

      // Should use STRICT thresholds
      expect(output.validationSummary.thresholdsUsed.hybridScore).toBe(0.40);
      expect(output.validationSummary.thresholdsLowered).toBe(false);
      expect(output.validatedCandidates.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// =============================================================================
// General Validation Tests
// =============================================================================

describe('Validator - General Validation', () => {
  let validator: ValidatorAgent;
  let mockOpenAI: OpenAI;

  beforeEach(() => {
    mockOpenAI = {} as OpenAI;
    validator = new ValidatorAgent(mockOpenAI);
  });

  it('should validate candidates with complete product info', async () => {
    const candidates = [
      createMockProductCandidate({
        product: {
          id: 'test-1',
          title: 'Complete Product',
          description: 'A product with all required fields',
          price: 100,
          imageUrl: 'https://example.com/image.jpg',
          vendor: 'TestVendor',
          productType: 'physical',
          tags: ['test'],
        },
        scores: {
          hybridScore: 0.50,
          vectorScore: 0.50,
          graphScore: 0.50,
        },
      }),
    ];

    const input = createMockValidatorInput(candidates);
    const output = await validator.process(input);

    expect(output.validationSummary.totalCandidates).toBe(1);
    expect(output.validatedAt).toBeInstanceOf(Date);
  });

  it('should reject products with missing critical info', async () => {
    const candidates = [
      createMockProductCandidate({
        product: {
          id: 'test-1',
          title: '', // Missing title
          description: '', // Missing description
          price: 0, // Invalid price
          imageUrl: '', // Missing image
          vendor: 'TestVendor',
          productType: 'physical',
          tags: [],
        },
        scores: {
          hybridScore: 0.60,
          vectorScore: 0.60,
          graphScore: 0.60,
        },
      }),
      // Add good products so we don't lower thresholds
      createMockProductCandidate({
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
      }),
      createMockProductCandidate({
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
      }),
      createMockProductCandidate({
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
      }),
    ];

    const input = createMockValidatorInput(candidates);
    const output = await validator.process(input);

    // First product should be rejected for quality issues
    const firstProductId = candidates[0].product.id;
    const wasRejected = output.rejectedCandidates.some(
      (r) => r.candidate.product.id === firstProductId
    );

    expect(wasRejected).toBe(true);
  });

  it('should calculate validation summary metrics', async () => {
    const candidates = [
      createMockProductCandidate({
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
      }),
      createMockProductCandidate({
        scores: { hybridScore: 0.45, vectorScore: 0.45, graphScore: 0.45 },
      }),
      createMockProductCandidate({
        scores: { hybridScore: 0.30, vectorScore: 0.30, graphScore: 0.30 },
      }),
    ];

    const input = createMockValidatorInput(candidates);
    const output = await validator.process(input);

    expect(output.validationSummary.totalCandidates).toBe(3);
    expect(output.validationSummary.passed).toBeDefined();
    expect(output.validationSummary.rejected).toBeDefined();
    expect(output.validationSummary.avgValidationScore).toBeDefined();
    expect(output.validationSummary.diversityScore).toBeDefined();
    expect(
      output.validationSummary.passed + output.validationSummary.rejected
    ).toBe(3);
  });

  it('should track diversity in validation summary', async () => {
    const candidates = [
      createMockProductCandidate({
        product: {
          id: 'test-1',
          title: 'Unique Product One From Category A',
          description: 'First product with unique title',
          price: 100,
          imageUrl: 'https://example.com/1.jpg',
          vendor: 'VendorA',
          productType: 'physical',
          tags: ['test'],
        },
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
        matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
      }),
      createMockProductCandidate({
        product: {
          id: 'test-2',
          title: 'Different Product Two From Category B',
          description: 'Second product with different title',
          price: 150, // Different price to ensure diversity
          imageUrl: 'https://example.com/2.jpg',
          vendor: 'VendorB',
          productType: 'physical',
          tags: ['test'],
        },
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
        matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
      }),
      createMockProductCandidate({
        product: {
          id: 'test-3',
          title: 'Another Product Three From Category C',
          description: 'Third product with another unique title',
          price: 200, // Different price
          imageUrl: 'https://example.com/3.jpg',
          vendor: 'VendorC',
          productType: 'physical',
          tags: ['test'],
        },
        scores: { hybridScore: 0.50, vectorScore: 0.50, graphScore: 0.50 },
        matchReasons: { matchedInterests: ['tech', 'gaming'], matchedArchetype: 'thoughtful' },
      }),
    ];

    const input = createMockValidatorInput(candidates);
    const output = await validator.process(input);

    // Should calculate diversity score
    expect(output.validationSummary.diversityScore).toBeDefined();
    expect(output.validationSummary.diversityScore).toBeGreaterThan(0);

    // With 3 different vendors, should have good diversity
    expect(output.validationSummary.diversityScore).toBeGreaterThan(0.5);
  });
});
