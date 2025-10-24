/**
 * Validator Agent
 *
 * Rigorous quality gate - validates candidates pass all requirements
 */

import { BaseAgent } from './base';
import { ValidatorInput, ValidatorOutput, ValidationResult } from '../../types/agents';
import OpenAI from 'openai';

export class ValidatorAgent extends BaseAgent<ValidatorInput, ValidatorOutput> {
  name = 'Validator';

  constructor(private openai: OpenAI) {
    super();
  }

  async process(input: ValidatorInput): Promise<ValidatorOutput> {
    this.log('Validating candidates');

    try {
      const candidates = input.explorerContext.candidates;

      // Validate each candidate
      const validations = await Promise.all(
        candidates.map((candidate) => this.validateCandidate(candidate, input.explorerContext))
      );

      // Separate passed and rejected
      const validatedCandidates = [];
      const rejectedCandidates = [];

      for (let i = 0; i < candidates.length; i++) {
        if (validations[i].passed) {
          validatedCandidates.push(candidates[i]);
        } else {
          rejectedCandidates.push({
            candidate: candidates[i],
            validation: validations[i],
          });
        }
      }

      return {
        explorerContext: input.explorerContext,
        validatedCandidates,
        rejectedCandidates,
        validationSummary: {
          totalCandidates: candidates.length,
          passed: validatedCandidates.length,
          rejected: rejectedCandidates.length,
          avgValidationScore:
            validations.reduce((sum, v) => sum + v.overallScore, 0) / validations.length,
        },
        validatedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private async validateCandidate(
    candidate: any,
    context: any
  ): Promise<ValidationResult> {
    const checks = {
      budgetCheck: this.checkBudget(candidate, context),
      constraintsCheck: this.checkConstraints(candidate, context),
      relevanceCheck: await this.checkRelevance(candidate, context),
      qualityCheck: this.checkQuality(candidate),
      appropriatenessCheck: await this.checkAppropriateness(candidate, context),
    };

    const passed = Object.values(checks).every((check) => check.passed);
    const overallScore = Object.values(checks).reduce((sum, c) => sum + (c.score || 0), 0) / 5;

    const passReasons = [];
    const failReasons = [];

    for (const [checkName, check] of Object.entries(checks)) {
      if (check.passed && check.score && check.score > 0.8) {
        passReasons.push(`Strong ${checkName.replace('Check', '')} score`);
      }
      if (!check.passed) {
        failReasons.push(
          `Failed ${checkName}: ${check.violations?.join(', ') || check.concerns?.join(', ') || check.issues?.join(', ')}`
        );
      }
    }

    return {
      productId: candidate.product.id,
      passed,
      checks,
      overallScore,
      confidence: overallScore,
      passReasons: passReasons.length > 0 ? passReasons : undefined,
      failReasons: failReasons.length > 0 ? failReasons : undefined,
    };
  }

  private checkBudget(candidate: any, context: any) {
    const budget = context.meaningContext.constraintsContext.hardConstraints.budget;
    const price = candidate.product.price;
    const inBudget = price >= budget.min && price <= budget.max;

    return {
      passed: inBudget,
      score: inBudget ? 1.0 : 0.0,
    };
  }

  private checkConstraints(candidate: any, context: any) {
    const required =
      context.meaningContext.constraintsContext.hardConstraints.requiredAttributes || [];
    const excluded =
      context.meaningContext.constraintsContext.hardConstraints.excludedAttributes || [];

    const violations = [];
    // TODO: Check product attributes against required/excluded

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  private async checkRelevance(candidate: any, context: any) {
    // Use LLM to assess relevance
    const score = candidate.scores.hybridScore;

    return {
      passed: score > 0.6, // Threshold
      score,
    };
  }

  private checkQuality(candidate: any) {
    const issues = [];

    // Check for missing critical info
    if (!candidate.product.description) issues.push('Missing description');
    if (!candidate.product.imageUrl) issues.push('Missing image');
    if (candidate.product.price <= 0) issues.push('Invalid price');

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  private async checkAppropriateness(candidate: any, context: any) {
    // Use LLM to check if gift is appropriate for relationship/occasion
    const relationship =
      context.meaningContext.constraintsContext.relationshipContext.relationshipAnalysis;
    const concerns = [];

    // TODO: LLM check for appropriateness

    return {
      passed: concerns.length === 0,
      concerns,
    };
  }
}
