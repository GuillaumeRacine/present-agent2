/**
 * DialogueManager Agent
 *
 * Decides whether to ask clarifying questions or proceed to recommendations
 * based on confidence scoring and context completeness.
 *
 * Decision Framework:
 * - ≥0.7 confidence → Proceed to recommendations (high confidence)
 * - 0.5-0.7 confidence → Hybrid mode (show recommendations + offer refinement)
 * - <0.5 confidence → Ask clarifying questions (insufficient context)
 *
 * Also considers:
 * - Critical field coverage (need at least 2/4 critical fields)
 * - High-impact ambiguities
 * - Conversation turn limits (max 3 turns)
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md
 */

import { BaseAgent } from './base';
import {
  DialogueManagerInput,
  DialogueManagerOutput,
  ConfidenceAssessment,
  ClarifyingQuestion,
  QuestionGenerationError,
} from '../../types/dialogue';
import { ListenerOutput } from '../../types/agents';
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
} from '../../lib/question-templates';
import {
  validateDialogueManagerInput,
  validateDialogueManagerOutput,
} from '../../lib/validation';
import { CircuitBreaker, createDialogueManagerCircuitBreaker } from '../../lib/circuit-breaker';

/**
 * DialogueManager agent implementation
 */
export class DialogueManagerAgent extends BaseAgent<
  DialogueManagerInput,
  DialogueManagerOutput
> {
  name = 'DialogueManager';

  // Confidence thresholds (from technical review)
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.7, // Proceed directly to recommendations
    MEDIUM: 0.45, // Consider hybrid mode (lowered from 0.50 based on tests)
    LOW: 0.3, // Definitely ask questions
  };

  // Critical field minimum (need at least 2/4 critical fields)
  private readonly CRITICAL_FIELD_MINIMUM = 2;

  // Maximum conversation turns (prevent infinite loops)
  private readonly MAX_TURNS = 3;

  // Circuit breaker for error recovery
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    super();
    this.circuitBreaker = createDialogueManagerCircuitBreaker();
  }

  /**
   * Process input and make dialogue management decision
   */
  async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      validateDialogueManagerInput(input);

      this.log('Processing dialogue management decision', {
        sessionId: input.listenerOutput.userQuery,
        confidence: input.listenerOutput.confidence,
        turnCount: input.conversationHistory?.length || 0,
      });

      // Execute with circuit breaker protection
      const output = await this.circuitBreaker.execute(async () => {
        return this.processInternal(input, startTime);
      });

      // Validate output
      validateDialogueManagerOutput(output);

      this.log('Dialogue management decision made', {
        mode: output.mode,
        confidence: output.confidenceAssessment.overallConfidence,
        decisionTimeMs: output.decisionTimeMs,
      });

      return output;
    } catch (error) {
      return this.handleError(error, 'process', input, startTime);
    }
  }

  /**
   * Internal processing logic
   */
  private async processInternal(
    input: DialogueManagerInput,
    startTime: number
  ): Promise<DialogueManagerOutput> {
    // Early exit: forced mode (for testing)
    if (input.forcedMode) {
      this.log('Using forced mode', { forcedMode: input.forcedMode });
      return this.buildForcedModeOutput(input.forcedMode, input, startTime);
    }

    // Step 1: Assess current context quality
    const assessment = this.assessContext(input.listenerOutput);

    this.log('Context assessment completed', assessment);

    // Step 2: Check conversation history (prevent repetition and enforce limits)
    const askedBefore = this.getAskedQuestions(input.conversationHistory);
    const turnCount = input.conversationHistory?.length || 0;

    this.log('Conversation history checked', {
      askedBefore,
      turnCount,
      maxTurns: this.MAX_TURNS,
    });

    // Step 3: Check if we've hit max turns
    if (turnCount >= this.MAX_TURNS) {
      this.log('Maximum conversation turns reached - forcing recommend mode', {
        turnCount,
        maxTurns: this.MAX_TURNS,
      });

      return this.buildRecommendMode(
        startTime,
        `Maximum conversation turns (${this.MAX_TURNS}) reached - proceeding to recommendations`,
        assessment
      );
    }

    // Step 4: Generate potential clarifying questions
    const potentialQuestions = this.generateQuestions(input.listenerOutput, assessment);

    this.log('Generated potential questions', {
      totalQuestions: potentialQuestions.length,
      questionIds: potentialQuestions.map((q) => q.id),
    });

    // Step 5: Filter out already-asked questions
    const newQuestions = potentialQuestions.filter((q) => !askedBefore.includes(q.id));

    this.log('Filtered questions (removing duplicates)', {
      beforeFiltering: potentialQuestions.length,
      afterFiltering: newQuestions.length,
      removed: askedBefore,
    });

    // Step 6: Make decision based on confidence and context
    return this.decide(assessment, newQuestions, startTime);
  }

  // ==========================================================================
  // Context Assessment
  // ==========================================================================

  /**
   * Assess context quality and completeness
   */
  private assessContext(listener: ListenerOutput): ConfidenceAssessment {
    // Define critical fields (need at least 2/4 for recommendations)
    const critical = {
      relationshipType: !!listener.recipient?.relationshipType,
      interests: (listener.interests?.length || 0) > 0,
      budget: !!listener.budget && listener.budget.max > 0,
      occasion: !!listener.occasion,
    };

    const criticalFieldsCovered = Object.entries(critical)
      .filter(([_, present]) => present)
      .map(([field]) => field);

    const criticalFieldsMissing = Object.entries(critical)
      .filter(([_, present]) => !present)
      .map(([field]) => field);

    const criticalFieldCount = criticalFieldsCovered.length;

    // Identify high-impact ambiguities
    const highImpactFields = ['budget', 'interests', 'relationshipType'];
    const highImpactAmbiguities = (listener.ambiguities || [])
      .filter((a) => highImpactFields.includes(a.field))
      .map((a) => a.field);

    return {
      overallConfidence: listener.confidence,
      criticalFieldsCovered,
      criticalFieldsMissing,
      highImpactAmbiguities,
      criticalFieldCount,
    };
  }

  /**
   * Get previously asked question IDs from conversation history
   */
  private getAskedQuestions(
    history?: { askedQuestions: string[] }[]
  ): string[] {
    if (!history || history.length === 0) {
      return [];
    }

    const asked = new Set<string>();
    history.forEach((turn) => {
      turn.askedQuestions.forEach((q) => asked.add(q));
    });

    return Array.from(asked);
  }

  // ==========================================================================
  // Decision Logic
  // ==========================================================================

  /**
   * Make dialogue management decision based on assessment and available questions
   */
  private decide(
    assessment: ConfidenceAssessment,
    questions: ClarifyingQuestion[],
    startTime: number
  ): DialogueManagerOutput {
    const { overallConfidence, criticalFieldCount } = assessment;

    this.log('Making decision', {
      overallConfidence,
      criticalFieldCount,
      questionsAvailable: questions.length,
    });

    // HIGH CONFIDENCE: Recommend directly
    if (
      overallConfidence >= this.CONFIDENCE_THRESHOLDS.HIGH &&
      criticalFieldCount >= 3
    ) {
      this.log('Decision: RECOMMEND (high confidence)');
      return this.buildRecommendMode(
        startTime,
        `High confidence (${overallConfidence.toFixed(2)}) with ${criticalFieldCount}/4 critical fields`,
        assessment
      );
    }

    // VAGUE QUERY HANDLING (Issue #7): Force ask mode for borderline cases
    // If we have <3 critical fields and medium-low confidence, ask questions first
    // This prevents generic responses for vague queries like "birthday gift"
    // Place this BEFORE medium confidence check to catch vague queries early
    if (
      criticalFieldCount < 3 &&
      overallConfidence >= this.CONFIDENCE_THRESHOLDS.MEDIUM &&
      overallConfidence < 0.60
    ) {
      this.log(`Forcing ask mode: only ${criticalFieldCount}/4 critical fields with ${overallConfidence.toFixed(2)} confidence`, {
        criticalFieldCount,
        overallConfidence,
        reason: 'Vague query detection - preventing generic recommendations',
      });
      const topQuestions = this.prioritizeQuestions(questions).slice(0, 3);
      return this.buildAskMode(
        startTime,
        `Vague query detected: only ${criticalFieldCount}/4 critical fields with ${overallConfidence.toFixed(2)} confidence - gathering more context to ensure quality`,
        assessment,
        topQuestions
      );
    }

    // MEDIUM CONFIDENCE: Hybrid mode (show recommendations + offer refinement)
    if (
      overallConfidence >= this.CONFIDENCE_THRESHOLDS.MEDIUM &&
      overallConfidence < this.CONFIDENCE_THRESHOLDS.HIGH &&
      criticalFieldCount >= this.CRITICAL_FIELD_MINIMUM
    ) {
      this.log('Decision: HYBRID (medium confidence)');
      const topQuestions = this.prioritizeQuestions(questions).slice(0, 2);
      return this.buildHybridMode(
        startTime,
        `Medium confidence (${overallConfidence.toFixed(2)}) - showing recommendations with refinement option`,
        assessment,
        topQuestions
      );
    }

    // LOW CONFIDENCE: Ask questions
    if (
      overallConfidence < this.CONFIDENCE_THRESHOLDS.MEDIUM ||
      criticalFieldCount < this.CRITICAL_FIELD_MINIMUM
    ) {
      this.log('Decision: ASK (low confidence or insufficient critical fields)');
      const topQuestions = this.prioritizeQuestions(questions).slice(0, 3);

      if (topQuestions.length === 0) {
        // No questions to ask - fallback to recommend mode
        this.log('No questions available - falling back to recommend mode');
        return this.buildRecommendMode(
          startTime,
          'Low confidence but no questions to ask - proceeding with available context',
          assessment
        );
      }

      return this.buildAskMode(
        startTime,
        `Low confidence (${overallConfidence.toFixed(2)}) or insufficient critical fields (${criticalFieldCount}/4)`,
        assessment,
        topQuestions
      );
    }

    // Fallback: err on side of asking
    this.log('Decision: ASK (borderline case - gathering more context)');
    const topQuestions = this.prioritizeQuestions(questions).slice(0, 2);
    return this.buildAskMode(
      startTime,
      'Borderline case - gathering more context to ensure quality',
      assessment,
      topQuestions
    );
  }

  // ==========================================================================
  // Question Generation
  // ==========================================================================

  /**
   * Generate clarifying questions based on missing/vague context
   */
  private generateQuestions(
    listener: ListenerOutput,
    assessment: ConfidenceAssessment
  ): ClarifyingQuestion[] {
    const questions: ClarifyingQuestion[] = [];

    try {
      // Essential: Budget (highest priority)
      if (!listener.budget || listener.budget.max === 0) {
        questions.push(budgetQuestion());
      }

      // Essential: Interests (high priority)
      if (!listener.interests || listener.interests.length === 0) {
        questions.push(interestsQuestion());
      }

      // Essential: Relationship (if completely missing)
      if (!listener.recipient?.relationshipType) {
        questions.push(relationshipQuestion());
      }

      // Essential: Occasion (helpful but not critical)
      if (!listener.occasion) {
        questions.push(occasionQuestion());
      }

      // Essential: Recipient age (for better personalization)
      if (!listener.recipient?.age && !listener.lifeContext?.lifeStage) {
        questions.push(recipientAgeQuestion());
      }

      // Refinement: Vague interests
      const vagueInterests = identifyVagueInterests(listener.interests || []);
      vagueInterests.forEach((interest) => {
        const q = refineInterestQuestion(interest);
        if (q) questions.push(q);
      });

      // Intent: Conflicting signals
      if (listener.intentSignals) {
        const conflicts = detectIntentConflicts(listener.intentSignals);
        if (conflicts.length >= 2) {
          questions.push(intentPriorityQuestion(conflicts));
        }
      }

      // Gift philosophy (if unclear)
      if (!listener.giftPhilosophy) {
        // Only ask if we don't already have intent signals
        if (!listener.intentSignals) {
          questions.push(giftPhilosophyQuestion());
        }
      }

      // Constraint: Space (if mentioned in life context)
      if (
        listener.lifeContext?.livingSituation === 'apartment' ||
        listener.lifeContext?.livingSituation === 'downsizing'
      ) {
        if (!listener.enhancedConstraints?.space) {
          questions.push(spaceConstraintQuestion());
        }
      }

      // Constraint: Urgency (if timing is unclear)
      if (
        listener.occasion &&
        listener.occasion.urgency === 'planned' &&
        !listener.occasion.date
      ) {
        questions.push(urgencyQuestion());
      }

      // Use detected ambiguities from Listener
      (listener.ambiguities || []).forEach((amb) => {
        if (amb.suggestedClarification) {
          questions.push(ambiguityQuestion(amb));
        }
      });

      this.log('Question generation completed', {
        totalQuestions: questions.length,
        questionTypes: questions.map((q) => q.type),
      });

      return questions;
    } catch (error) {
      this.log('ERROR: Question generation failed', { error });
      throw new QuestionGenerationError('Failed to generate questions', {
        listenerOutput: listener,
        error,
      });
    }
  }

  /**
   * Prioritize questions by impact and priority
   */
  private prioritizeQuestions(
    questions: ClarifyingQuestion[]
  ): ClarifyingQuestion[] {
    return questions.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by confidence impact (higher impact = higher priority)
      return b.impactOnConfidence - a.impactOnConfidence;
    });
  }

  // ==========================================================================
  // Output Builders
  // ==========================================================================

  /**
   * Build ASK mode output
   */
  private buildAskMode(
    startTime: number,
    reasoning: string,
    assessment: ConfidenceAssessment,
    questions: ClarifyingQuestion[]
  ): DialogueManagerOutput {
    return {
      mode: 'ask',
      questions,
      proceedWithRecommendations: false,
      reasoning,
      confidenceAssessment: assessment,
      decisionTimeMs: Date.now() - startTime,
      processedAt: new Date(),
    };
  }

  /**
   * Build RECOMMEND mode output
   */
  private buildRecommendMode(
    startTime: number,
    reasoning: string,
    assessment: ConfidenceAssessment,
    fallbackReason?: string
  ): DialogueManagerOutput {
    return {
      mode: 'recommend',
      proceedWithRecommendations: true,
      reasoning,
      confidenceAssessment: assessment,
      decisionTimeMs: Date.now() - startTime,
      processedAt: new Date(),
      ...(fallbackReason && { fallbackReason }),
    };
  }

  /**
   * Build HYBRID mode output
   */
  private buildHybridMode(
    startTime: number,
    reasoning: string,
    assessment: ConfidenceAssessment,
    questionsForRefinement: ClarifyingQuestion[]
  ): DialogueManagerOutput {
    return {
      mode: 'hybrid',
      questionsForRefinement,
      proceedWithRecommendations: true,
      reasoning,
      confidenceAssessment: assessment,
      decisionTimeMs: Date.now() - startTime,
      processedAt: new Date(),
    };
  }

  /**
   * Build forced mode output (for testing)
   */
  private buildForcedModeOutput(
    forcedMode: 'ask' | 'recommend' | 'hybrid',
    input: DialogueManagerInput,
    startTime: number
  ): DialogueManagerOutput {
    const assessment = this.assessContext(input.listenerOutput);

    switch (forcedMode) {
      case 'ask':
        const questions = this.generateQuestions(input.listenerOutput, assessment);
        const topQuestions = this.prioritizeQuestions(questions).slice(0, 3);
        return this.buildAskMode(
          startTime,
          'Forced mode for testing',
          assessment,
          topQuestions
        );

      case 'recommend':
        return this.buildRecommendMode(
          startTime,
          'Forced mode for testing',
          assessment
        );

      case 'hybrid':
        const allQuestions = this.generateQuestions(input.listenerOutput, assessment);
        const refinementQuestions = this.prioritizeQuestions(allQuestions).slice(0, 2);
        return this.buildHybridMode(
          startTime,
          'Forced mode for testing',
          assessment,
          refinementQuestions
        );
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle errors with graceful degradation
   */
  private handleError(
    error: unknown,
    context: string,
    input: DialogueManagerInput,
    startTime: number
  ): DialogueManagerOutput {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    this.log(`ERROR in ${context}: ${errorMessage}`, { error });

    // Graceful degradation: proceed to recommendations
    const assessment = this.assessContext(input.listenerOutput);

    return this.buildRecommendMode(
      startTime,
      'Error occurred - proceeding to recommendations as fallback',
      assessment,
      `DialogueManager error: ${errorMessage}`
    );
  }
}
