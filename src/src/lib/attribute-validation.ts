/**
 * Attribute Validation Utility
 *
 * Validates and cleans gift attributes based on exclusivity and conditional rules.
 * Ensures logical consistency and flags conflicts for review.
 *
 * Phase 3: Enhancement for improved attribute quality
 */

import {
  GiftAttributes,
  ATTRIBUTE_EXCLUSIVITY_RULES,
  CONDITIONAL_ATTRIBUTE_RULES
} from '../types/gift-attributes.js';
import { logger } from './logger.js';

/**
 * Validation result with detailed conflict and suggestion information
 */
export interface AttributeValidationResult {
  /** Whether attributes pass validation (no critical conflicts) */
  valid: boolean;

  /** List of conflicts detected (mutually exclusive attributes both set) */
  conflicts: Array<{
    attribute1: string;
    attribute2: string;
    severity: 'error' | 'warning';
    message: string;
  }>;

  /** Suggestions for additional attributes based on conditional rules */
  suggestions: Array<{
    attribute: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  }>;

  /** Missing required attributes */
  missingRequired: Array<{
    attribute: string;
    requiredBy: string;
    message: string;
  }>;

  /** Attribute density score (how many attributes are set) */
  densityScore: number;

  /** Total number of active attributes */
  activeCount: number;
}

/**
 * Validate gift attributes against exclusivity and conditional rules
 *
 * @param attributes - The product's gift attributes
 * @returns Validation result with conflicts, suggestions, and density metrics
 */
export function validateAttributes(attributes: Partial<GiftAttributes>): AttributeValidationResult {
  const conflicts: AttributeValidationResult['conflicts'] = [];
  const suggestions: AttributeValidationResult['suggestions'] = [];
  const missingRequired: AttributeValidationResult['missingRequired'] = [];

  // Get active attributes (set to true)
  const activeAttributes = Object.entries(attributes)
    .filter(([_, value]) => value === true)
    .map(([key, _]) => key);

  const activeCount = activeAttributes.length;

  // Check for mutually exclusive conflicts
  for (const attr of activeAttributes) {
    const exclusiveAttrs = ATTRIBUTE_EXCLUSIVITY_RULES[attr];
    if (exclusiveAttrs) {
      for (const exclusiveAttr of exclusiveAttrs) {
        if (attributes[exclusiveAttr as keyof GiftAttributes] === true) {
          conflicts.push({
            attribute1: attr,
            attribute2: exclusiveAttr,
            severity: 'error',
            message: `${attr} and ${exclusiveAttr} are mutually exclusive and cannot both be true`
          });
        }
      }
    }
  }

  // Check conditional rules
  for (const attr of activeAttributes) {
    const rules = CONDITIONAL_ATTRIBUTE_RULES[attr];
    if (!rules) continue;

    // Check excludes
    if (rules.excludes) {
      for (const excludedAttr of rules.excludes) {
        if (attributes[excludedAttr as keyof GiftAttributes] === true) {
          conflicts.push({
            attribute1: attr,
            attribute2: excludedAttr,
            severity: 'warning',
            message: `${attr} typically excludes ${excludedAttr} (conditional rule)`
          });
        }
      }
    }

    // Check required attributes
    if (rules.requires) {
      for (const requiredAttr of rules.requires) {
        if (attributes[requiredAttr as keyof GiftAttributes] !== true) {
          missingRequired.push({
            attribute: requiredAttr,
            requiredBy: attr,
            message: `${attr} requires ${requiredAttr} to be set`
          });
        }
      }
    }

    // Generate suggestions
    if (rules.suggests) {
      for (const suggestedAttr of rules.suggests) {
        if (attributes[suggestedAttr as keyof GiftAttributes] !== true) {
          suggestions.push({
            attribute: suggestedAttr,
            reason: `Often paired with ${attr}`,
            confidence: 'medium'
          });
        }
      }
    }
  }

  // Calculate density score (percentage of possible attributes that are set)
  // Total possible attributes: ~100 (from GiftAttributes interface)
  const totalPossibleAttributes = 100;
  const densityScore = (activeCount / totalPossibleAttributes) * 100;

  // Determine if valid (no ERROR severity conflicts)
  const errorConflicts = conflicts.filter(c => c.severity === 'error');
  const valid = errorConflicts.length === 0 && missingRequired.length === 0;

  return {
    valid,
    conflicts,
    suggestions,
    missingRequired,
    densityScore,
    activeCount
  };
}

/**
 * Clean attributes by resolving conflicts automatically
 *
 * Resolution strategy:
 * 1. For mutually exclusive pairs, keep the first one encountered
 * 2. For conditional excludes, remove the excluded attribute
 * 3. For required attributes, add them if missing
 *
 * @param attributes - Raw attributes to clean
 * @param options - Cleaning options
 * @returns Cleaned attributes with conflicts resolved
 */
export function cleanAttributes(
  attributes: Partial<GiftAttributes>,
  options: {
    /** Auto-apply suggestions? */
    applySuggestions?: boolean;
    /** Confidence threshold for suggestions (only apply if >= threshold) */
    suggestionThreshold?: 'high' | 'medium' | 'low';
    /** Log cleaning actions? */
    verbose?: boolean;
  } = {}
): Partial<GiftAttributes> {
  const { applySuggestions = false, suggestionThreshold = 'medium', verbose = false } = options;

  const cleaned = { ...attributes };
  const changes: string[] = [];

  // Get validation result
  const validation = validateAttributes(cleaned);

  // Resolve ERROR conflicts (mutually exclusive pairs)
  const errorConflicts = validation.conflicts.filter(c => c.severity === 'error');
  for (const conflict of errorConflicts) {
    // Keep attribute1, remove attribute2 (arbitrary but consistent)
    cleaned[conflict.attribute2 as keyof GiftAttributes] = false;
    changes.push(`Removed ${conflict.attribute2} (conflicts with ${conflict.attribute1})`);
  }

  // Resolve conditional excludes (WARNING conflicts)
  const warningConflicts = validation.conflicts.filter(c => c.severity === 'warning');
  for (const conflict of warningConflicts) {
    // Remove the excluded attribute
    cleaned[conflict.attribute2 as keyof GiftAttributes] = false;
    changes.push(`Removed ${conflict.attribute2} (excluded by ${conflict.attribute1})`);
  }

  // Add required attributes
  for (const missing of validation.missingRequired) {
    cleaned[missing.attribute as keyof GiftAttributes] = true;
    changes.push(`Added ${missing.attribute} (required by ${missing.requiredBy})`);
  }

  // Apply suggestions if requested
  if (applySuggestions) {
    const confidenceLevels = { high: 3, medium: 2, low: 1 };
    const threshold = confidenceLevels[suggestionThreshold];

    for (const suggestion of validation.suggestions) {
      if (confidenceLevels[suggestion.confidence] >= threshold) {
        cleaned[suggestion.attribute as keyof GiftAttributes] = true;
        changes.push(`Added ${suggestion.attribute} (${suggestion.reason})`);
      }
    }
  }

  // Log changes if verbose
  if (verbose && changes.length > 0) {
    logger.info('Attribute cleaning applied:', { changes });
  }

  return cleaned;
}

/**
 * Get attribute density statistics for a set of products
 *
 * @param productAttributes - Array of product attribute sets
 * @returns Density statistics
 */
export function getAttributeDensityStats(
  productAttributes: Array<Partial<GiftAttributes>>
): {
  mean: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  p90: number;
  totalProducts: number;
  distributionByCount: Record<number, number>;
} {
  const densities = productAttributes.map(attrs => {
    const activeCount = Object.values(attrs).filter(v => v === true).length;
    return activeCount;
  });

  densities.sort((a, b) => a - b);

  const sum = densities.reduce((acc, val) => acc + val, 0);
  const mean = sum / densities.length;

  const getPercentile = (p: number) => {
    const index = Math.floor((p / 100) * densities.length);
    return densities[index] || 0;
  };

  const median = getPercentile(50);
  const p25 = getPercentile(25);
  const p75 = getPercentile(75);
  const p90 = getPercentile(90);
  const min = densities[0] || 0;
  const max = densities[densities.length - 1] || 0;

  // Distribution by count
  const distributionByCount: Record<number, number> = {};
  for (const count of densities) {
    distributionByCount[count] = (distributionByCount[count] || 0) + 1;
  }

  return {
    mean,
    median,
    min,
    max,
    p25,
    p75,
    p90,
    totalProducts: densities.length,
    distributionByCount
  };
}

/**
 * Suggest additional attributes to improve density
 *
 * Uses conditional rules to suggest attributes that would make sense
 * given the currently set attributes.
 *
 * @param attributes - Current attributes
 * @param targetDensity - Target number of attributes (default: 10)
 * @returns Suggested attributes to add
 */
export function suggestAttributesForDensity(
  attributes: Partial<GiftAttributes>,
  targetDensity: number = 10
): Array<{
  attribute: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}> {
  const validation = validateAttributes(attributes);
  const currentDensity = validation.activeCount;

  if (currentDensity >= targetDensity) {
    return [];
  }

  // Return top N suggestions based on confidence
  const suggestions = validation.suggestions.slice(0, targetDensity - currentDensity);
  return suggestions;
}

/**
 * Compare two attribute sets and return differences
 *
 * @param attributes1 - First attribute set
 * @param attributes2 - Second attribute set
 * @returns Differences between the two sets
 */
export function compareAttributes(
  attributes1: Partial<GiftAttributes>,
  attributes2: Partial<GiftAttributes>
): {
  onlyInFirst: string[];
  onlyInSecond: string[];
  inBoth: string[];
  different: Array<{
    attribute: string;
    value1: boolean | undefined;
    value2: boolean | undefined;
  }>;
} {
  const keys1 = Object.keys(attributes1);
  const keys2 = Object.keys(attributes2);

  const allKeys = Array.from(new Set([...keys1, ...keys2]));

  const onlyInFirst: string[] = [];
  const onlyInSecond: string[] = [];
  const inBoth: string[] = [];
  const different: Array<{ attribute: string; value1: boolean | undefined; value2: boolean | undefined }> = [];

  for (const key of allKeys) {
    const val1 = attributes1[key as keyof GiftAttributes];
    const val2 = attributes2[key as keyof GiftAttributes];

    const in1 = val1 === true;
    const in2 = val2 === true;

    if (in1 && in2) {
      inBoth.push(key);
    } else if (in1 && !in2) {
      onlyInFirst.push(key);
      different.push({ attribute: key, value1: val1, value2: val2 });
    } else if (!in1 && in2) {
      onlyInSecond.push(key);
      different.push({ attribute: key, value1: val1, value2: val2 });
    }
  }

  return {
    onlyInFirst,
    onlyInSecond,
    inBoth,
    different
  };
}
