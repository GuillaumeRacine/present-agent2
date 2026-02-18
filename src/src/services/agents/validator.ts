/**
 * Validator Agent - Enhanced with Strict Quality Gates
 *
 * Multi-dimensional validation system that ensures only high-quality,
 * relevant recommendations pass through. Implements:
 * - Relevance thresholds (hybrid: 0.40, interest: 0.35, archetype: 0.25)
 * - Archetype alignment validation
 * - Personalization quality checks
 * - Diversity enforcement
 * - Progressive threshold lowering with minimum guarantees
 */

import { BaseAgent } from './base';
import { ValidatorInput, ValidatorOutput, ValidationResult, ProductCandidate } from '../../types/agents';
import {
  calculateAttributeMatchScore,
  GiftArchetype,
  inferAttributesFromProduct,
  extractAttributesFromProductProps,
} from '../../types/gift-attributes';
import OpenAI from 'openai';

// Quality gate thresholds (strict)
interface QualityThresholds {
  hybridScore: number;
  interestMatch: number;
  archetypeMatch: number;
  personalizationScore: number;
}

const STRICT_THRESHOLDS: QualityThresholds = {
  hybridScore: 0.40,      // Lowered from 0.50 to reduce false negatives (Issue #6)
  interestMatch: 0.35,    // Lowered from 0.40 to allow more valid matches
  archetypeMatch: 0.25,   // Lowered from 0.30 for better recall
  personalizationScore: 0.40, // Lowered from 0.50 to balance quality with availability
};

const RELAXED_THRESHOLDS: QualityThresholds = {
  hybridScore: 0.35,
  interestMatch: 0.25,
  archetypeMatch: 0.20,
  personalizationScore: 0.30,
};

const MINIMUM_THRESHOLDS: QualityThresholds = {
  hybridScore: 0.30,      // Raised from 0.25 to prevent low-quality recommendations
  interestMatch: 0.25,    // Raised from 0.15 to ensure better interest alignment
  archetypeMatch: 0.10,   // Keep at 0.10 as requested
  personalizationScore: 0.25, // Raised from 0.20 for better personalization
};

// Minimum products to return (will lower thresholds if needed)
const MIN_PRODUCTS_GUARANTEE = 3;

// Diversity constraints
const MAX_PRODUCTS_PER_CATEGORY = 2;
const MIN_PRICE_RANGES = 2; // Must have at least 2 different price ranges

export class ValidatorAgent extends BaseAgent<ValidatorInput, ValidatorOutput> {
  name = 'Validator';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: ValidatorInput): Promise<ValidatorOutput> {
    this.log('Validating candidates with strict quality gates');

    try {
      const candidates = input.explorerContext.candidates;

      // Try strict thresholds first
      let result = await this.validateWithThresholds(input, STRICT_THRESHOLDS);
      let thresholdsUsed = STRICT_THRESHOLDS;
      let thresholdsLowered = false;

      // Log threshold tier used
      this.log('Validation completed with STRICT thresholds', {
        thresholdTier: 'STRICT',
        thresholds: STRICT_THRESHOLDS,
        validatedCount: result.validatedCandidates.length,
        rejectedCount: result.rejectedCandidates.length,
      });

      // If Bar Raiser instructed strict_only, skip threshold lowering entirely
      // This is the SINGLE MOST IMPACTFUL quality fix — stops the system from
      // silently degrading standards to guarantee a minimum product count.
      if (input.barRaiserGuidance?.thresholdPolicy === 'strict_only') {
        this.log('Bar Raiser enforcing STRICT_ONLY threshold policy — skipping threshold lowering', {
          validatedCount: result.validatedCandidates.length,
          policy: 'strict_only',
        });
        // Return strict results even if < MIN_PRODUCTS_GUARANTEE
        // Better to return fewer quality products than many bad ones
      } else if (input.barRaiserGuidance?.thresholdPolicy === 'no_auto_lower') {
        this.log('Bar Raiser enforcing NO_AUTO_LOWER policy — trying relaxed only', {
          validatedCount: result.validatedCandidates.length,
        });
        if (result.validatedCandidates.length < MIN_PRODUCTS_GUARANTEE && candidates.length >= MIN_PRODUCTS_GUARANTEE) {
          result = await this.validateWithThresholds(input, RELAXED_THRESHOLDS);
          thresholdsUsed = RELAXED_THRESHOLDS;
          thresholdsLowered = true;
          // Do NOT fall through to MINIMUM thresholds
        }
      } else {
        // Default behavior: progressively lower thresholds
        if (result.validatedCandidates.length < MIN_PRODUCTS_GUARANTEE && candidates.length >= MIN_PRODUCTS_GUARANTEE) {
          this.log(`Only ${result.validatedCandidates.length} passed strict gates, lowering to relaxed thresholds`, {
            thresholdTier: 'RELAXED',
            thresholds: RELAXED_THRESHOLDS,
          });
          result = await this.validateWithThresholds(input, RELAXED_THRESHOLDS);
          thresholdsUsed = RELAXED_THRESHOLDS;
          thresholdsLowered = true;

          // Still not enough? Try minimum thresholds
          if (result.validatedCandidates.length < MIN_PRODUCTS_GUARANTEE && candidates.length >= MIN_PRODUCTS_GUARANTEE) {
            this.log(`Only ${result.validatedCandidates.length} passed relaxed gates, lowering to minimum thresholds`, {
              thresholdTier: 'MINIMUM',
              thresholds: MINIMUM_THRESHOLDS,
            });
            result = await this.validateWithThresholds(input, MINIMUM_THRESHOLDS);
            thresholdsUsed = MINIMUM_THRESHOLDS;
          }
        }
      }

      // Calculate rejection analytics
      const rejectionsByCategory: Record<string, number> = {};
      result.rejectedCandidates.forEach(({ validation }) => {
        const category = validation.rejectionCategory || 'unknown';
        rejectionsByCategory[category] = (rejectionsByCategory[category] || 0) + 1;
      });

      // Calculate quality metrics
      const allValidations = [
        ...result.validatedCandidates.map((c, i) => result.validations![i]),
        ...result.rejectedCandidates.map(r => r.validation),
      ];

      const avgRelevanceScore = this.avg(allValidations.map(v => v.dimensionScores.relevanceScore));
      const avgArchetypeScore = this.avg(allValidations.map(v => v.dimensionScores.archetypeScore));
      const avgPersonalizationScore = this.avg(allValidations.map(v => v.dimensionScores.personalizationScore));
      const diversityScore = this.calculateDiversityScore(result.validatedCandidates);

      return {
        explorerContext: input.explorerContext,
        validatedCandidates: result.validatedCandidates,
        rejectedCandidates: result.rejectedCandidates,
        validationSummary: {
          totalCandidates: candidates.length,
          passed: result.validatedCandidates.length,
          rejected: result.rejectedCandidates.length,
          avgValidationScore: this.avg(allValidations.map(v => v.overallScore)),
          avgRelevanceScore,
          avgArchetypeScore,
          avgPersonalizationScore,
          diversityScore,
          rejectionsByCategory,
          thresholdsUsed,
          thresholdsLowered,
        },
        validatedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private async validateWithThresholds(
    input: ValidatorInput,
    thresholds: QualityThresholds
  ): Promise<{
    validatedCandidates: ProductCandidate[];
    rejectedCandidates: Array<{ candidate: ProductCandidate; validation: ValidationResult }>;
    validations?: ValidationResult[];
  }> {
    const candidates = input.explorerContext.candidates;
    const acceptedProducts: ProductCandidate[] = [];

    // Validate each candidate
    const validations = await Promise.all(
      candidates.map((candidate) => this.validateCandidate(candidate, input, thresholds, acceptedProducts))
    );

    // Separate passed and rejected
    const validatedCandidates: ProductCandidate[] = [];
    const rejectedCandidates: Array<{ candidate: ProductCandidate; validation: ValidationResult }> = [];

    for (let i = 0; i < candidates.length; i++) {
      if (validations[i].passed) {
        validatedCandidates.push(candidates[i]);
        acceptedProducts.push(candidates[i]); // Track for diversity checks
      } else {
        rejectedCandidates.push({
          candidate: candidates[i],
          validation: validations[i],
        });
      }
    }

    return { validatedCandidates, rejectedCandidates, validations };
  }

  private async validateCandidate(
    candidate: ProductCandidate,
    input: ValidatorInput,
    thresholds: QualityThresholds,
    acceptedProducts: ProductCandidate[]
  ): Promise<ValidationResult> {
    // Use direct constraintsContext if provided, otherwise fall back to nested path
    const constraintsContext = input.constraintsContext || input.explorerContext.meaningContext.constraintsContext;

    // Run all validation checks
    const checks = {
      budgetCheck: this.checkBudget(candidate, constraintsContext),
      constraintsCheck: this.checkConstraints(candidate, constraintsContext),
      relevanceCheck: await this.checkRelevance(candidate, input, thresholds),
      qualityCheck: this.checkQuality(candidate),
      appropriatenessCheck: await this.checkAppropriateness(candidate, constraintsContext),
      archetypeCheck: this.checkArchetypeAlignment(candidate, input, thresholds),
      personalizationCheck: await this.checkPersonalizationQuality(candidate, input, thresholds),
      diversityCheck: this.checkDiversity(candidate, acceptedProducts),
    };

    // Calculate dimension scores
    const dimensionScores = {
      relevanceScore: checks.relevanceCheck.score,
      archetypeScore: checks.archetypeCheck.score,
      personalizationScore: checks.personalizationCheck.score,
      diversityScore: checks.diversityCheck.score,
    };

    // Multi-dimensional gate: Must pass at least 6/8 checks AND have good dimension scores
    const checksArray = Object.values(checks);
    const passedChecks = checksArray.filter(c => c.passed).length;
    const totalChecks = checksArray.length;

    // Weighted overall score (emphasize relevance and archetype)
    const overallScore = (
      dimensionScores.relevanceScore * 0.40 +      // 40% weight
      dimensionScores.archetypeScore * 0.30 +      // 30% weight
      dimensionScores.personalizationScore * 0.20 + // 20% weight
      dimensionScores.diversityScore * 0.10        // 10% weight
    );

    // Pass if: (1) passes most checks AND (2) overall score is good
    const passed = passedChecks >= 6 && overallScore >= 0.40;

    // Build reasons
    const passReasons: string[] = [];
    const failReasons: string[] = [];
    let rejectionCategory: ValidationResult['rejectionCategory'] | undefined;

    for (const [checkName, check] of Object.entries(checks)) {
      if (check.passed && 'score' in check && check.score > 0.7) {
        passReasons.push(`Strong ${checkName.replace('Check', '')} (${(check.score * 100).toFixed(0)}%)`);
      }
      if (!check.passed) {
        const reason = ('violations' in check && check.violations?.join(', ')) ||
                      ('concerns' in check && check.concerns?.join(', ')) ||
                      ('issues' in check && check.issues?.join(', ')) ||
                      ('reason' in check && check.reason) ||
                      'Failed check';
        failReasons.push(`${checkName}: ${reason}`);

        // Categorize rejection
        if (!rejectionCategory) {
          if (checkName === 'relevanceCheck') rejectionCategory = 'low_relevance';
          else if (checkName === 'archetypeCheck') rejectionCategory = 'archetype_mismatch';
          else if (checkName === 'personalizationCheck') rejectionCategory = 'poor_personalization';
          else if (checkName === 'diversityCheck') rejectionCategory = 'duplicate';
          else if (checkName === 'qualityCheck') rejectionCategory = 'quality_issues';
          else if (checkName === 'budgetCheck') rejectionCategory = 'budget';
          else if (checkName === 'constraintsCheck') rejectionCategory = 'constraints';
        }
      }
    }

    return {
      productId: candidate.product.id,
      passed,
      checks,
      dimensionScores,
      overallScore,
      confidence: overallScore,
      passReasons: passReasons.length > 0 ? passReasons : undefined,
      failReasons: failReasons.length > 0 ? failReasons : undefined,
      rejectionCategory: !passed ? rejectionCategory : undefined,
    };
  }

  private checkBudget(candidate: ProductCandidate, context: any) {
    const budget = context.hardConstraints?.budget;
    const price = candidate.product.price;

    // If no budget specified, pass by default
    if (!budget) {
      return {
        passed: true,
        score: 1.0,
      };
    }

    const inBudget = price >= budget.min && price <= budget.max;

    return {
      passed: inBudget,
      score: inBudget ? 1.0 : 0.0,
    };
  }

  private checkConstraints(candidate: ProductCandidate, context: any) {
    const required = context.hardConstraints?.requiredAttributes || [];
    const excluded = context.hardConstraints?.excludedAttributes || [];

    const violations: string[] = [];
    // TODO: Check product attributes against required/excluded
    // For now, pass if no explicit violations

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  private async checkRelevance(
    candidate: ProductCandidate,
    input: ValidatorInput,
    thresholds: QualityThresholds
  ) {
    const hybridScore = candidate.scores.hybridScore;
    const vectorScore = candidate.scores.vectorScore;

    // Interest match score (how many interests matched)
    const interests = input.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.memoryContext?.listenerContext?.interests || [];
    const matchedInterests = candidate.matchReasons?.matchedInterests || [];
    const interestMatchScore = interests.length > 0 ? matchedInterests.length / interests.length : 0;

    // STRICT: Must meet all thresholds
    const meetsHybridThreshold = hybridScore >= thresholds.hybridScore || vectorScore >= thresholds.hybridScore;
    const meetsInterestThreshold = interestMatchScore >= thresholds.interestMatch;

    const passed = meetsHybridThreshold && meetsInterestThreshold;

    // Combined relevance score
    const relevanceScore = (hybridScore * 0.6 + interestMatchScore * 0.4);

    return {
      passed,
      score: relevanceScore,
      reason: !passed ? `Hybrid: ${(hybridScore * 100).toFixed(0)}% (min: ${(thresholds.hybridScore * 100).toFixed(0)}%), Interest: ${(interestMatchScore * 100).toFixed(0)}% (min: ${(thresholds.interestMatch * 100).toFixed(0)}%)` : undefined,
    };
  }

  private checkQuality(candidate: ProductCandidate) {
    const issues: string[] = [];

    // Check for missing critical info
    if (!candidate.product.description) issues.push('Missing description');
    if (!candidate.product.imageUrl) issues.push('Missing image');
    if (candidate.product.price <= 0) issues.push('Invalid price');
    if (!candidate.product.title || candidate.product.title.length < 10) issues.push('Title too short or missing');

    return {
      passed: issues.length === 0,
      score: Math.max(0, 1 - (issues.length * 0.25)),
      issues,
    };
  }

  private async checkAppropriateness(candidate: ProductCandidate, context: any) {
    // Use relationship context to check appropriateness
    const relationship = context.relationshipContext?.relationshipAnalysis;
    const concerns: string[] = [];

    // Skip check if relationship data not available
    if (!relationship) {
      return {
        passed: true,
        score: 1.0,
        concerns: [],
      };
    }

    // Basic heuristics for appropriateness
    const price = candidate.product.price;
    const appropriateRange = relationship.socialNorms?.appropriatePriceRange;

    if (appropriateRange) {
      if (price < appropriateRange.min * 0.5) {
        concerns.push('Price may be too low for relationship');
      }
      if (price > appropriateRange.max * 1.5) {
        concerns.push('Price may be too high for relationship');
      }
    }

    // TODO: Add LLM-based appropriateness check for sensitive cases

    return {
      passed: concerns.length === 0,
      score: concerns.length === 0 ? 1.0 : 0.6,
      concerns,
    };
  }

  private checkArchetypeAlignment(
    candidate: ProductCandidate,
    input: ValidatorInput,
    thresholds: QualityThresholds
  ) {
    const meaningFramework = input.explorerContext.meaningContext.meaningFramework;
    const desiredArchetype = meaningFramework.giftArchetype as GiftArchetype;

    // Prefer enriched attributes from Neo4j; fall back to inference when missing
    const hydratedAttributes =
      candidate.product.attributes ||
      candidate.product.giftAttributes ||
      extractAttributesFromProductProps(candidate.product as any);
    const productAttributes =
      hydratedAttributes && Object.keys(hydratedAttributes).length > 0
        ? hydratedAttributes
        : inferAttributesFromProduct({
            title: candidate.product.title || '',
            description: candidate.product.description || '',
            interests: candidate.matchReasons?.matchedInterests || [],
          });

    // Calculate archetype match score
    const archetypeScore = calculateAttributeMatchScore(productAttributes, desiredArchetype);

    // Check archetype-specific rules
    let passed = true;
    let reason: string | undefined;

    // Strict archetype filtering
    if (desiredArchetype === 'experience') {
      // For experiential archetype, filter out physical products with low experiential scores
      if (!productAttributes.isExperiential && archetypeScore < 0.5) {
        passed = false;
        reason = `Not experiential enough (score: ${(archetypeScore * 100).toFixed(0)}%)`;
      }
    } else if (desiredArchetype === 'sentimental' || desiredArchetype === 'thoughtful') {
      // For sentimental, require personalization or memory-making
      if (!productAttributes.isSentimental && !productAttributes.isPersonalized && !productAttributes.isMemoryMaking) {
        if (archetypeScore < 0.3) {
          passed = false;
          reason = 'Lacks sentimental/personalization attributes';
        }
      }
    } else if (desiredArchetype === 'practical') {
      // For practical, filter out novelty/gag gifts
      const title = (candidate.product.title || '').toLowerCase();
      const description = (candidate.product.description || '').toLowerCase();
      if (/(novelty|gag|funny|joke|prank)/.test(title + description)) {
        passed = false;
        reason = 'Novelty/gag gift not suitable for practical archetype';
      }
    }

    // Apply threshold
    if (passed && archetypeScore < thresholds.archetypeMatch) {
      passed = false;
      reason = `Archetype score ${(archetypeScore * 100).toFixed(0)}% below threshold ${(thresholds.archetypeMatch * 100).toFixed(0)}%`;
    }

    return {
      passed,
      score: archetypeScore,
      reason,
    };
  }

  private async checkPersonalizationQuality(
    candidate: ProductCandidate,
    input: ValidatorInput,
    thresholds: QualityThresholds
  ) {
    const memoryContext = input.explorerContext?.meaningContext?.constraintsContext?.relationshipContext?.memoryContext;
    const giverProfile = memoryContext?.giverProfile;
    const enrichedRecipient = memoryContext?.enrichedRecipient;

    let personalizationScore = 0.5; // Default neutral score
    let passed = true;
    let reason: string | undefined;

    // If giver profile exists, expect higher personalization
    if (giverProfile) {
      const personalizationImportance = giverProfile.givingPhilosophy?.personalization_importance || 0;

      // If giver values personalization highly (>0.7), be strict
      if (personalizationImportance > 0.7) {
        // Check if product has personalization attributes
        const hydratedAttributes =
          candidate.product.attributes ||
          candidate.product.giftAttributes ||
          extractAttributesFromProductProps(candidate.product as any);
        const productAttributes =
          hydratedAttributes && Object.keys(hydratedAttributes).length > 0
            ? hydratedAttributes
            : inferAttributesFromProduct({
                title: candidate.product.title || '',
                description: candidate.product.description || '',
                interests: candidate.matchReasons?.matchedInterests || [],
              });

        const hasPersonalization = productAttributes.isPersonalized ||
                                   productAttributes.isSentimental ||
                                   (candidate.matchReasons?.matchedInterests || []).length >= 2;

        if (hasPersonalization) {
          personalizationScore = 0.8;
        } else {
          personalizationScore = 0.3;
          if (thresholds.personalizationScore > 0.3) {
            passed = false;
            reason = `Giver values personalization (${(personalizationImportance * 100).toFixed(0)}%) but product lacks personal touch`;
          }
        }
      }
    }

    // If recipient profile is rich, expect context references
    if (enrichedRecipient) {
      const hasLifeContext = enrichedRecipient.life_context?.recent_life_events?.length > 0;
      const hasRichInterests = enrichedRecipient.interests?.length >= 3;

      if (hasLifeContext || hasRichInterests) {
        // Check if product matches recent life events or deep interests
        const matchedInterests = (candidate.matchReasons?.matchedInterests || []).length;
        if (matchedInterests >= 2) {
          personalizationScore = Math.max(personalizationScore, 0.7);
        } else if (matchedInterests >= 1) {
          personalizationScore = Math.max(personalizationScore, 0.5);
        }
      }
    }

    // Storyteller reasoning quality (if available)
    // This will be checked later by Storyteller, but we can validate basic reasoning exists
    const hasGoodReasoning = (candidate.matchReasons?.matchedInterests || []).length >= 1;
    if (hasGoodReasoning) {
      personalizationScore = Math.min(1.0, personalizationScore + 0.1);
    }

    // Apply threshold
    if (personalizationScore < thresholds.personalizationScore) {
      passed = false;
      reason = reason || `Personalization score ${(personalizationScore * 100).toFixed(0)}% below threshold ${(thresholds.personalizationScore * 100).toFixed(0)}%`;
    }

    return {
      passed,
      score: personalizationScore,
      reason,
    };
  }

  private checkDiversity(candidate: ProductCandidate, acceptedProducts: ProductCandidate[]) {
    let passed = true;
    let reason: string | undefined;
    let diversityScore = 1.0;

    // Check 1: Max 2 products per category
    // Extract category from product (use vendor as proxy for now)
    const category = candidate.product.vendor || 'unknown';
    const sameCategory = acceptedProducts.filter(p => (p.product.vendor || 'unknown') === category);

    if (sameCategory.length >= MAX_PRODUCTS_PER_CATEGORY) {
      passed = false;
      reason = `Already have ${MAX_PRODUCTS_PER_CATEGORY} products from ${category}`;
      diversityScore = 0;
    }

    // Check 2: Avoid very similar products (same title prefix)
    const candidatePrefix = (candidate.product.title || '').split(' ').slice(0, 3).join(' ').toLowerCase();
    const hasSimilar = acceptedProducts.some(p => {
      const prefix = (p.product.title || '').split(' ').slice(0, 3).join(' ').toLowerCase();
      return prefix === candidatePrefix;
    });

    if (hasSimilar) {
      passed = false;
      reason = reason || 'Very similar product already accepted';
      diversityScore = Math.min(diversityScore, 0.2);
    }

    // Check 3: Price diversity (penalize if too similar to existing prices)
    if (acceptedProducts.length > 0) {
      const prices = acceptedProducts.map(p => p.product.price);
      const candidatePrice = candidate.product.price;
      const tooSimilar = prices.some(price => Math.abs(price - candidatePrice) / candidatePrice < 0.15);

      if (tooSimilar && acceptedProducts.length >= 2) {
        diversityScore = Math.min(diversityScore, 0.6);
      }
    }

    return {
      passed,
      score: diversityScore,
      reason,
    };
  }

  private calculateDiversityScore(candidates: ProductCandidate[]): number {
    if (candidates.length === 0) return 0;

    // Calculate diversity based on:
    // 1. Category spread
    const categories = new Set(candidates.map(c => c.product.vendor));
    const categoryDiversity = Math.min(1.0, categories.size / candidates.length);

    // 2. Price spread
    const prices = candidates.map(c => c.product.price);
    const priceRanges = this.getPriceRanges(prices);
    const priceDiversity = Math.min(1.0, priceRanges / 3); // Ideal: 3 ranges

    // 3. Archetype diversity
    const archetypes = new Set(candidates.map(c => c.matchReasons?.matchedArchetype).filter(Boolean));
    const archetypeDiversity = Math.min(1.0, archetypes.size / Math.min(candidates.length, 3));

    return (categoryDiversity + priceDiversity + archetypeDiversity) / 3;
  }

  private getPriceRanges(prices: number[]): number {
    if (prices.length === 0) return 0;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    // Divide into 3 ranges: low, medium, high
    const ranges = new Set<string>();
    for (const price of prices) {
      const normalized = (price - min) / (range || 1);
      if (normalized < 0.33) ranges.add('low');
      else if (normalized < 0.67) ranges.add('medium');
      else ranges.add('high');
    }

    return ranges.size;
  }

  private avg(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}
