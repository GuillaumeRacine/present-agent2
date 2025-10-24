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

    return {
      min: budget?.min || 0,
      max: budget?.max || 1000,
      isStrict: listenerBudget?.flexibility === 'strict',
    };
  }

  private extractHardConstraints(context: any) {
    const constraints = context.memoryContext.listenerContext.constraints || [];
    const occasion = context.memoryContext.listenerContext.occasion;

    return {
      required: constraints.filter((c: string) => c.startsWith('must')),
      excluded: constraints.filter((c: string) => c.startsWith('no ')),
      deliveryBy: occasion?.date ? new Date(occasion.date) : undefined,
    };
  }

  private extractSoftPreferences(context: any) {
    const values = context.memoryContext.listenerContext.values || [];
    const userPrefs = context.memoryContext.userPreferences;

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
