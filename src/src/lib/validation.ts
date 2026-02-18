/**
 * Input/Output Validation Utilities
 *
 * Provides validation functions for DialogueManager inputs and outputs
 * to ensure type safety and catch errors early.
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md Section 3
 */

import {
  DialogueManagerInput,
  DialogueManagerOutput,
  ConversationTurn,
  ValidationError,
} from '../types/dialogue';
import { ListenerOutput, MemoryOutput } from '../types/agents';

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate DialogueManager input
 * @throws ValidationError if input is invalid
 */
export function validateDialogueManagerInput(input: DialogueManagerInput): void {
  // Required fields
  if (!input.listenerOutput) {
    throw new ValidationError('listenerOutput is required', { input });
  }

  if (!input.memoryOutput) {
    throw new ValidationError('memoryOutput is required', { input });
  }

  // Validate listener output
  validateListenerOutput(input.listenerOutput);

  // Validate conversation history if present
  if (input.conversationHistory) {
    validateConversationHistory(input.conversationHistory);
  }

  // Validate forced mode if present
  if (input.forcedMode) {
    const validModes = ['ask', 'recommend', 'hybrid'];
    if (!validModes.includes(input.forcedMode)) {
      throw new ValidationError(`Invalid forcedMode: ${input.forcedMode}`, {
        forcedMode: input.forcedMode,
        validModes,
      });
    }
  }
}

/**
 * Validate ListenerOutput
 */
function validateListenerOutput(output: ListenerOutput): void {
  // Confidence range
  if (output.confidence < 0 || output.confidence > 1) {
    throw new ValidationError(`Invalid confidence: ${output.confidence}`, {
      confidence: output.confidence,
      expectedRange: [0, 1],
    });
  }

  // Budget validation (if present)
  if (output.budget) {
    if (output.budget.min < 0) {
      throw new ValidationError(`Invalid budget.min: ${output.budget.min}`, {
        budget: output.budget,
      });
    }
    if (output.budget.max < output.budget.min) {
      throw new ValidationError(
        `budget.max (${output.budget.max}) < budget.min (${output.budget.min})`,
        { budget: output.budget }
      );
    }
  }

  // Interests validation (if present)
  if (output.interests && !Array.isArray(output.interests)) {
    throw new ValidationError('interests must be an array', {
      interests: output.interests,
    });
  }
}

/**
 * Validate conversation history
 */
function validateConversationHistory(history: ConversationTurn[]): void {
  if (!Array.isArray(history)) {
    throw new ValidationError('conversationHistory must be an array', { history });
  }

  history.forEach((turn, index) => {
    if (!turn.sessionId) {
      throw new ValidationError(`Turn ${index} missing sessionId`, { turn });
    }

    if (turn.turnNumber < 1) {
      throw new ValidationError(
        `Turn ${index} has invalid turnNumber: ${turn.turnNumber}`,
        { turn }
      );
    }

    if (!turn.askedQuestions || !Array.isArray(turn.askedQuestions)) {
      throw new ValidationError(`Turn ${index} missing or invalid askedQuestions`, {
        turn,
      });
    }
  });
}

// ============================================================================
// Output Validation
// ============================================================================

/**
 * Validate DialogueManager output
 * @throws ValidationError if output is invalid
 */
export function validateDialogueManagerOutput(output: DialogueManagerOutput): void {
  // Validate common fields
  if (!output.mode) {
    throw new ValidationError('mode is required', { output });
  }

  if (!output.reasoning) {
    throw new ValidationError('reasoning is required', { output });
  }

  if (!output.confidenceAssessment) {
    throw new ValidationError('confidenceAssessment is required', { output });
  }

  if (output.decisionTimeMs < 0) {
    throw new ValidationError(`Invalid decisionTimeMs: ${output.decisionTimeMs}`, {
      output,
    });
  }

  // Mode-specific validation
  switch (output.mode) {
    case 'ask':
      validateAskMode(output);
      break;
    case 'recommend':
      validateRecommendMode(output);
      break;
    case 'hybrid':
      validateHybridMode(output);
      break;
    default:
      throw new ValidationError(`Invalid mode: ${(output as any).mode}`, { output });
  }
}

/**
 * Validate ask mode output
 */
function validateAskMode(output: DialogueManagerOutput): void {
  if (output.mode !== 'ask') {
    throw new ValidationError('Expected mode to be "ask"', { output });
  }

  if (!output.questions || output.questions.length === 0) {
    throw new ValidationError('Ask mode requires questions', { output });
  }

  if (output.proceedWithRecommendations !== false) {
    throw new ValidationError('Ask mode must not proceed to recommendations', { output });
  }

  // Validate each question
  output.questions.forEach((q, index) => {
    if (!q.id || !q.question || !q.suggestedAnswers) {
      throw new ValidationError(`Question ${index} is incomplete`, { question: q });
    }

    if (q.suggestedAnswers.length < 2) {
      throw new ValidationError(
        `Question ${index} needs at least 2 answer options`,
        { question: q }
      );
    }

    if (q.priority < 1) {
      throw new ValidationError(`Question ${index} has invalid priority`, {
        question: q,
      });
    }

    if (q.impactOnConfidence < 0 || q.impactOnConfidence > 1) {
      throw new ValidationError(
        `Question ${index} has invalid impactOnConfidence: ${q.impactOnConfidence}`,
        { question: q }
      );
    }
  });
}

/**
 * Validate recommend mode output
 */
function validateRecommendMode(output: DialogueManagerOutput): void {
  if (output.mode !== 'recommend') {
    throw new ValidationError('Expected mode to be "recommend"', { output });
  }

  if (output.questions && output.questions.length > 0) {
    throw new ValidationError('Recommend mode should not have questions', { output });
  }

  if (output.proceedWithRecommendations !== true) {
    throw new ValidationError('Recommend mode must proceed to recommendations', {
      output,
    });
  }
}

/**
 * Validate hybrid mode output
 */
function validateHybridMode(output: DialogueManagerOutput): void {
  if (output.mode !== 'hybrid') {
    throw new ValidationError('Expected mode to be "hybrid"', { output });
  }

  if (!output.questionsForRefinement || output.questionsForRefinement.length === 0) {
    throw new ValidationError('Hybrid mode requires refinement questions', { output });
  }

  if (output.proceedWithRecommendations !== true) {
    throw new ValidationError('Hybrid mode must proceed to recommendations', { output });
  }

  // Validate refinement questions
  output.questionsForRefinement.forEach((q, index) => {
    if (!q.id || !q.question || !q.suggestedAnswers) {
      throw new ValidationError(`Refinement question ${index} is incomplete`, {
        question: q,
      });
    }

    if (q.suggestedAnswers.length < 2) {
      throw new ValidationError(
        `Refinement question ${index} needs at least 2 answer options`,
        { question: q }
      );
    }
  });
}

// ============================================================================
// Answer Validation
// ============================================================================

/**
 * Validate clarification answers
 * @throws ValidationError if answers are invalid
 */
export function validateClarificationAnswers(
  answers: Record<string, any>,
  askedQuestionIds: string[]
): void {
  if (!answers || typeof answers !== 'object') {
    throw new ValidationError('answers must be an object', { answers });
  }

  // Check that answers correspond to asked questions
  const answerKeys = Object.keys(answers);

  answerKeys.forEach((key) => {
    if (!askedQuestionIds.includes(key)) {
      throw new ValidationError(`Answer provided for question that wasn't asked: ${key}`, {
        providedKey: key,
        askedQuestions: askedQuestionIds,
      });
    }
  });

  // At least one answer should be provided
  if (answerKeys.length === 0) {
    throw new ValidationError('At least one answer must be provided', {
      askedQuestions: askedQuestionIds,
    });
  }
}

// ============================================================================
// Confidence Assessment Validation
// ============================================================================

/**
 * Validate confidence assessment
 */
export function validateConfidenceAssessment(assessment: {
  overallConfidence: number;
  criticalFieldsCovered: string[];
  criticalFieldsMissing: string[];
  highImpactAmbiguities: string[];
  criticalFieldCount: number;
}): void {
  // Confidence range
  if (assessment.overallConfidence < 0 || assessment.overallConfidence > 1) {
    throw new ValidationError(
      `Invalid overallConfidence: ${assessment.overallConfidence}`,
      { assessment }
    );
  }

  // Critical field count consistency
  if (assessment.criticalFieldCount !== assessment.criticalFieldsCovered.length) {
    throw new ValidationError(
      'criticalFieldCount does not match criticalFieldsCovered.length',
      { assessment }
    );
  }

  // Arrays should be arrays
  if (!Array.isArray(assessment.criticalFieldsCovered)) {
    throw new ValidationError('criticalFieldsCovered must be an array', { assessment });
  }

  if (!Array.isArray(assessment.criticalFieldsMissing)) {
    throw new ValidationError('criticalFieldsMissing must be an array', { assessment });
  }

  if (!Array.isArray(assessment.highImpactAmbiguities)) {
    throw new ValidationError('highImpactAmbiguities must be an array', { assessment });
  }
}

// ============================================================================
// Conversation Turn Validation
// ============================================================================

/**
 * Validate a single conversation turn
 */
export function validateConversationTurn(turn: ConversationTurn): void {
  if (!turn.id) {
    throw new ValidationError('Turn missing id', { turn });
  }

  if (!turn.sessionId) {
    throw new ValidationError('Turn missing sessionId', { turn });
  }

  if (turn.turnNumber < 1) {
    throw new ValidationError(`Invalid turnNumber: ${turn.turnNumber}`, { turn });
  }

  if (!turn.timestamp) {
    throw new ValidationError('Turn missing timestamp', { turn });
  }

  if (!turn.userInput) {
    throw new ValidationError('Turn missing userInput', { turn });
  }

  if (!turn.listenerOutput) {
    throw new ValidationError('Turn missing listenerOutput', { turn });
  }

  if (!turn.dialogueDecision) {
    throw new ValidationError('Turn missing dialogueDecision', { turn });
  }

  if (!Array.isArray(turn.askedQuestions)) {
    throw new ValidationError('Turn askedQuestions must be an array', { turn });
  }

  if (turn.confidence < 0 || turn.confidence > 1) {
    throw new ValidationError(`Invalid confidence: ${turn.confidence}`, { turn });
  }

  if (turn.processingTimeMs < 0) {
    throw new ValidationError(`Invalid processingTimeMs: ${turn.processingTimeMs}`, {
      turn,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid date
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if an object has required keys
 */
export function hasRequiredKeys(obj: any, keys: string[]): boolean {
  return keys.every((key) => key in obj);
}

/**
 * Sanitize error messages to prevent sensitive data leakage
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove potential sensitive data patterns
  return message
    .replace(/\b\d{16}\b/g, '[CARD]') // Credit card numbers
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
    .replace(/Bearer\s+\S+/gi, 'Bearer [TOKEN]'); // Auth tokens
}
