/**
 * Constraints Agent
 *
 * Validates and normalizes all constraints (budget, requirements, exclusions)
 */

import { BaseAgent } from './base';
import { ConstraintsInput, ConstraintsOutput } from '../../types/agents';

export class ConstraintsAgent extends BaseAgent<ConstraintsInput, ConstraintsOutput> {
  name = 'Constraints';

  async process(input: ConstraintsInput): Promise<ConstraintsOutput> {
    this.log('Validating constraints');

    try {
      const budget = this.normalizeBudget(input.relationshipContext);
      const hardConstraints = this.extractHardConstraints(input.relationshipContext);
      const softPreferences = this.extractSoftPreferences(input.relationshipContext);
      const validation = this.validateConstraints(hardConstraints, softPreferences);

      return {
        relationshipContext: input.relationshipContext,
        hardConstraints: {
          budget,
          requiredAttributes: hardConstraints.required,
          excludedAttributes: hardConstraints.excluded,
          deliveryBy: hardConstraints.deliveryBy,
        },
        softPreferences: {
          preferredVendors: softPreferences.vendors,
          preferredCategories: softPreferences.categories,
          valueAlignment: softPreferences.values,
        },
        validationStatus: validation.status,
        conflicts: validation.conflicts,
        validatedAt: new Date(),
      };
    } catch (error) {
      return this.handleError(error, 'process');
    }
  }

  private normalizeBudget(context: any): { min: number; max: number; isStrict: boolean } {
    const listenerBudget = context.memoryContext.listenerContext.budget;
    const relationshipBudget = context.calibration.adjustedBudget;

    // Use relationship-calibrated budget if available, otherwise listener budget
    const budget = relationshipBudget || listenerBudget;

    const baseMin = budget?.min || 0;
    const baseMax = budget?.max || 1000;
    const isStrict = listenerBudget?.flexibility === 'strict';

    // STRICT BUDGET ENFORCEMENT: Only apply minimal flexibility for price rounding
    // Users expect budget constraints to be respected exactly
    // Allow only 2% flexibility for minor price variations (e.g., $39.99 vs $40)
    const flexibilityFactor = 0.02;  // Reduced from 0.25 (25%) to 0.02 (2%)
    const adjustedMin = baseMin * (1 - flexibilityFactor);
    const adjustedMax = baseMax * (1 + flexibilityFactor);

    return {
      min: Math.max(0, adjustedMin), // Ensure min doesn't go below 0
      max: adjustedMax,
      isStrict,
    };
  }

  private extractHardConstraints(context: any) {
    // Use enhancedConstraints (new format) which is an object, not array
    const enhancedConstraints = context.memoryContext.listenerContext.enhancedConstraints || {};
    const occasion = context.memoryContext.listenerContext.occasion;

    return {
      required: enhancedConstraints.required || [],
      excluded: enhancedConstraints.excluded || [],
      deliveryBy: occasion?.date ? new Date(occasion.date) : undefined,
    };
  }

  private extractSoftPreferences(context: any) {
    const valuesRaw = context.memoryContext.listenerContext.values || {};
    const userPrefs = context.memoryContext.userPreferences;

    // Convert values object to array format (extract keys where value is true)
    // Listener now outputs values as object: {"eco-friendly": false, "local": false}
    const values = typeof valuesRaw === 'object' && !Array.isArray(valuesRaw)
      ? Object.entries(valuesRaw).filter(([_, v]) => v === true).map(([k]) => k)
      : Array.isArray(valuesRaw) ? valuesRaw : [];

    return {
      vendors: userPrefs?.preferredVendors || [],
      categories: [],
      values,
    };
  }

  private validateConstraints(
    hardConstraints: any,
    softPreferences: any
  ): { status: 'all_valid' | 'conflicts_found' | 'impossible_constraints'; conflicts?: any[] } {
    const conflicts = [];

    // Check for impossible budget
    if (hardConstraints.budget?.min > hardConstraints.budget?.max) {
      conflicts.push({
        constraint: 'budget',
        issue: 'Minimum budget exceeds maximum',
        resolution: 'Adjust budget range',
      });
    }

    // Check for conflicting requirements
    // TODO: Add more validation logic

    return {
      status: conflicts.length > 0 ? 'conflicts_found' : 'all_valid',
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }
}
