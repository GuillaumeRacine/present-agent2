/**
 * Recommendation Orchestrator
 *
 * Chains all agents together in the correct sequence to produce
 * personalized gift recommendations.
 *
 * NEW: Includes DialogueManager for intelligent conversation management
 */

import crypto from 'crypto';
import { Driver } from 'neo4j-driver';
import {
  Agent,
  OrchestratorInput,
  OrchestratorOutput,
  ListenerInput,
  ListenerOutput,
  MemoryInput,
  MemoryOutput,
  RelationshipInput,
  RelationshipOutput,
  ConstraintsInput,
  ConstraintsOutput,
  MeaningInput,
  MeaningOutput,
  ExplorerInput,
  ExplorerOutput,
  ValidatorInput,
  ValidatorOutput,
  StorytellerInput,
  StorytellerOutput,
  PresenterInput,
  PresenterOutput,
  LearningInput,
  LearningOutput,
} from '../types/agents';
import {
  DialogueManagerInput,
  DialogueManagerOutput,
  ConversationTurn,
} from '../types/dialogue';
import {
  DialoguePresenterInput,
  DialoguePresenterOutput,
  ConversationHistoryItem,
} from '../types/presentation';
import { getConversationHistory, storeConversationTurn, generateTurnId } from './conversation';
import { mergeWithClarifications } from './conversation/answer-merger';
import { logger } from '../lib/logger';
import { detectUserContext } from './agents/dialogue-presenter';
import {
  BarRaiserInput,
  BarRaiserOutput,
  BarRaiserConfig,
  BarRaiserFeedback,
  DEFAULT_BAR_RAISER_CONFIG,
} from '../types/bar-raiser';
import { QualityTracker } from './quality-tracker';

/**
 * Main orchestrator that executes the complete recommendation workflow
 */
export class RecommendationOrchestrator {
  private qualityTracker: QualityTracker | null = null;

  constructor(
    private listenerAgent: Agent<ListenerInput, ListenerOutput>,
    private memoryAgent: Agent<MemoryInput, MemoryOutput>,
    private dialogueAgent: Agent<DialogueManagerInput, DialogueManagerOutput> | null,
    private dialoguePresenterAgent: Agent<DialoguePresenterInput, DialoguePresenterOutput> | null,
    private relationshipAgent: Agent<RelationshipInput, RelationshipOutput>,
    private constraintsAgent: Agent<ConstraintsInput, ConstraintsOutput>,
    private meaningAgent: Agent<MeaningInput, MeaningOutput>,
    private explorerAgent: Agent<ExplorerInput, ExplorerOutput>,
    private validatorAgent: Agent<ValidatorInput, ValidatorOutput>,
    private storytellerAgent: Agent<StorytellerInput, StorytellerOutput>,
    private presenterAgent: Agent<PresenterInput, PresenterOutput>,
    private neo4jDriver: Driver | null = null,
    private enableDialogue: boolean = false,
    private barRaiserAgent: Agent<BarRaiserInput, BarRaiserOutput> | null = null,
    private barRaiserConfig: BarRaiserConfig = DEFAULT_BAR_RAISER_CONFIG,
    private learningAgent: Agent<LearningInput, LearningOutput> | null = null
  ) {
    if (neo4jDriver) {
      this.qualityTracker = new QualityTracker(neo4jDriver);
    }
  }

  /**
   * Execute the complete recommendation workflow
   * NEW: With optional DialogueManager integration
   */
  async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const agentTimings: Record<string, number> = {};
    const recommendationId = crypto.randomUUID();

    try {
      logger.info('Orchestrator: Starting execution', {
        sessionId: input.sessionId,
        userId: input.userId,
        hasClarifications: !!input.clarifications,
        enableDialogue: this.enableDialogue,
      });

      // If clarifications provided, merge with previous context
      let listenerOutput: ListenerOutput;

      if (input.clarifications && this.neo4jDriver) {
        logger.info('Orchestrator: Merging clarifications', {
          sessionId: input.sessionId,
          clarifications: Object.keys(input.clarifications),
        });

        const enriched = await mergeWithClarifications(
          this.neo4jDriver,
          input.sessionId,
          input.originalQuery || input.userQuery,
          input.clarifications
        );

        listenerOutput = enriched.enrichedContext;
        agentTimings['answer_merge'] = 0; // Included in next step timing
      } else {
        // Step 1: Extract context from user query
        const listenerStart = Date.now();
        listenerOutput = await this.listenerAgent.process({
          userQuery: input.userQuery,
          sessionId: input.sessionId,
          userId: input.userId,
        });
        agentTimings['listener'] = Date.now() - listenerStart;
      }

      // Step 2: Recall relevant history and patterns
      const memoryStart = Date.now();
      const memoryOutput = await this.memoryAgent.process({
        userId: input.userId,
        sessionId: input.sessionId,
        listenerOutput,
      });
      agentTimings['memory'] = Date.now() - memoryStart;

      // NEW Step 3: DialogueManager decision (if enabled and not skipped)
      if (this.enableDialogue && this.dialogueAgent && this.neo4jDriver && !input.skipQuestions) {
        const dialogueStart = Date.now();

        // Get conversation history
        const conversationHistory = await getConversationHistory(
          this.neo4jDriver,
          input.sessionId,
          10
        );

        const dialogueDecision = await this.dialogueAgent.process({
          listenerOutput,
          memoryOutput,
          conversationHistory,
        });

        agentTimings['dialogueManager'] = Date.now() - dialogueStart;

        logger.info('Orchestrator: DialogueManager decision', {
          mode: dialogueDecision.mode,
          confidence: dialogueDecision.confidenceAssessment.overallConfidence,
        });

        // Branch based on decision
        if (dialogueDecision.mode === 'ask') {
          // NEW: Present questions with conversational wrapper
          let presentedQuestions: DialoguePresenterOutput | null = null;
          if (this.dialoguePresenterAgent) {
            const presenterStart = Date.now();

            const userContext = detectUserContext(listenerOutput);
            const historyItems: ConversationHistoryItem[] = conversationHistory.map((turn) => ({
              mode: turn.dialogueDecision.mode,
              askedQuestions: turn.askedQuestions,
              userCorrected: false, // TODO: detect corrections
            }));

            presentedQuestions = await this.dialoguePresenterAgent.process({
              dialogueOutput: dialogueDecision,
              userContext,
              conversationHistory: historyItems,
            });

            agentTimings['dialoguePresenter'] = Date.now() - presenterStart;

            logger.info('Orchestrator: Questions presented', {
              type: presentedQuestions.type,
              hasNaturalLanguage: !!presentedQuestions.naturalLanguage,
            });
          }

          // Store conversation turn
          const turn: ConversationTurn = {
            id: generateTurnId(input.sessionId, conversationHistory.length + 1),
            sessionId: input.sessionId,
            turnNumber: conversationHistory.length + 1,
            timestamp: new Date(),
            userInput: input.userQuery,
            listenerOutput,
            dialogueDecision,
            askedQuestions: dialogueDecision.questions.map((q) => q.id),
            recommendationsShown: false,
            confidence: listenerOutput.confidence,
            processingTimeMs: Date.now() - startTime,
          };

          await storeConversationTurn(this.neo4jDriver, turn);

          // Return questions with natural language presentation
          return {
            mode: 'clarifying',
            questions: dialogueDecision.questions,
            naturalLanguage: presentedQuestions?.type === 'questions'
              ? presentedQuestions.naturalLanguage
              : undefined,
            encouragement: presentedQuestions?.type === 'questions'
              ? presentedQuestions.encouragement
              : undefined,
            showEscapeHatch: presentedQuestions?.type === 'questions'
              ? presentedQuestions.showEscapeHatch
              : true,
            partialContext: listenerOutput,
            reasoning: dialogueDecision.reasoning,
            sessionId: input.sessionId,
            timestamp: new Date(),
            performance: {
              totalExecutionTimeMs: Date.now() - startTime,
              agentTimings,
            },
            executionTrace: {
              listener: listenerOutput,
              memory: memoryOutput,
              dialogueManager: dialogueDecision,
              dialoguePresenter: presentedQuestions,
            },
          };
        }

        if (dialogueDecision.mode === 'hybrid') {
          // NEW: Present hybrid mode with conversational wrapper
          let presentedHybrid: DialoguePresenterOutput | null = null;
          if (this.dialoguePresenterAgent) {
            const presenterStart = Date.now();

            const userContext = detectUserContext(listenerOutput);
            const historyItems: ConversationHistoryItem[] = conversationHistory.map((turn) => ({
              mode: turn.dialogueDecision.mode,
              askedQuestions: turn.askedQuestions,
              userCorrected: false,
            }));

            presentedHybrid = await this.dialoguePresenterAgent.process({
              dialogueOutput: dialogueDecision,
              userContext,
              conversationHistory: historyItems,
            });

            agentTimings['dialoguePresenter'] = Date.now() - presenterStart;
          }

          // Continue to recommendations AND prepare refinement questions
          const recommendations = await this.continueRecommendationPipeline(
            memoryOutput,
            agentTimings
          );

          // Store conversation turn
          const turn: ConversationTurn = {
            id: generateTurnId(input.sessionId, conversationHistory.length + 1),
            sessionId: input.sessionId,
            turnNumber: conversationHistory.length + 1,
            timestamp: new Date(),
            userInput: input.userQuery,
            listenerOutput,
            dialogueDecision,
            askedQuestions: [],
            recommendationsShown: true,
            confidence: listenerOutput.confidence,
            processingTimeMs: Date.now() - startTime,
          };

          await storeConversationTurn(this.neo4jDriver, turn);

          return {
            mode: 'recommendations_with_refinement',
            recommendationId,
            recommendations,
            refinementQuestions: dialogueDecision.questionsForRefinement,
            intro: 'Here are some ideas based on what you\'ve told me...',
            naturalLanguage: presentedHybrid?.type === 'hybrid'
              ? presentedHybrid.naturalLanguage
              : undefined,
            contextSummary: presentedHybrid?.type === 'hybrid'
              ? presentedHybrid.contextSummary
              : undefined,
            sessionId: input.sessionId,
            timestamp: new Date(),
            performance: {
              totalExecutionTimeMs: Date.now() - startTime,
              agentTimings,
            },
            executionTrace: {
              listener: listenerOutput,
              memory: memoryOutput,
              dialogueManager: dialogueDecision,
              dialoguePresenter: presentedHybrid,
              ...recommendations.executionTrace,
            },
            finalRecommendations: recommendations,
            orchestratedAt: new Date(),
          };
        }

        // Mode is 'recommend' - continue normally
      }

      // Steps 3-5: Run Relationship, Constraints, and Meaning agents in PARALLEL
      // These agents don't depend on each other's output, only on memoryOutput
      const parallelStart = Date.now();

      const [relationshipOutput, constraintsOutput, meaningOutput] = await Promise.all([
        // Step 3: Analyze relationship dynamics
        (async () => {
          const start = Date.now();
          const result = await this.relationshipAgent.process({
            memoryContext: memoryOutput,
          });
          agentTimings['relationship'] = Date.now() - start;
          return result;
        })(),

        // Step 4: Validate and normalize constraints
        (async () => {
          const start = Date.now();
          const result = await this.constraintsAgent.process({
            relationshipContext: { memoryContext: memoryOutput } as any,
          });
          agentTimings['constraints'] = Date.now() - start;
          return result;
        })(),

        // Step 5: Identify what would be meaningful
        (async () => {
          const start = Date.now();
          const result = await this.meaningAgent.process({
            constraintsContext: { relationshipContext: { memoryContext: memoryOutput } } as any,
          });
          agentTimings['meaning'] = Date.now() - start;
          return result;
        })(),
      ]);

      agentTimings['parallel_total'] = Date.now() - parallelStart;
      logger.info('Orchestrator: Parallel agents completed', {
        relationshipTime: agentTimings['relationship'],
        constraintsTime: agentTimings['constraints'],
        meaningTime: agentTimings['meaning'],
        parallelTotal: agentTimings['parallel_total'],
      });

      // Steps 6-9 + Bar Raiser: Retry loop for quality enforcement
      // Steps 1-5 outputs (Listener, Memory, Relationship, Constraints, Meaning)
      // are cached from first pass and NOT re-run on retry.
      const maxRetries = this.barRaiserAgent ? this.barRaiserConfig.maxRetries : 0;
      let bestAttempt: {
        explorerOutput: ExplorerOutput;
        validatorOutput: ValidatorOutput;
        storytellerOutput: StorytellerOutput;
        presenterOutput: PresenterOutput;
        barRaiserOutput?: BarRaiserOutput;
        score: number;
      } | null = null;
      let previousFeedback: BarRaiserFeedback | undefined;
      let finalBarRaiserOutput: BarRaiserOutput | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const isRetry = attempt > 0;

        if (isRetry) {
          logger.info(`Orchestrator: Bar Raiser retry attempt ${attempt + 1}/${maxRetries + 1}`, {
            searchDirection: previousFeedback?.explorerGuidance.searchDirection,
            missedInterests: previousFeedback?.explorerGuidance.missedInterests,
          });
        }

        // Step 6: Discover product candidates
        const explorerStart = Date.now();
        const explorerOutput = await this.explorerAgent.process({
          meaningContext: meaningOutput,
          barRaiserFeedback: isRetry && previousFeedback ? previousFeedback.explorerGuidance : undefined,
          qualityExpectations: this.barRaiserAgent ? {
            interestCoverage: 'Recommendations MUST cover the interests mentioned by the user',
            diversity: 'Results should span different categories, price points, and styles',
            budgetAdherence: 'ALL products must be within the stated budget range',
          } : undefined,
        });
        agentTimings[isRetry ? `explorer_retry_${attempt}` : 'explorer'] = Date.now() - explorerStart;

        // Step 7: Validate candidates
        const validatorStart = Date.now();
        const validatorOutput = await this.validatorAgent.process({
          explorerContext: explorerOutput,
          constraintsContext: constraintsOutput,
          barRaiserGuidance: isRetry && previousFeedback ? previousFeedback.validatorGuidance : undefined,
          qualityExpectations: this.barRaiserAgent ? {
            humanSanityCheck: 'Would a real person actually buy this as a gift? Reject products that feel random or inappropriate.',
            relevance: 'Products must genuinely match stated interests, not just keyword overlap.',
            thresholdIntegrity: 'Prefer fewer quality products over many poor ones. Do NOT auto-lower thresholds.',
          } : undefined,
        });
        agentTimings[isRetry ? `validator_retry_${attempt}` : 'validator'] = Date.now() - validatorStart;

        // Step 8: Craft personal reasoning
        const storytellerStart = Date.now();
        const storytellerOutput = await this.storytellerAgent.process({
          validatorContext: validatorOutput,
          barRaiserGuidance: isRetry && previousFeedback ? previousFeedback.storytellerGuidance : undefined,
          qualityExpectations: this.barRaiserAgent ? {
            personalization: 'Stories MUST reference the specific person and their interests — never generic.',
            storytellingQuality: 'Explanations should be compelling and specific, not filler text.',
            interestCoverage: 'Each story should connect the product to at least one specific interest or life context mentioned by the user.',
          } : undefined,
        });
        agentTimings[isRetry ? `storyteller_retry_${attempt}` : 'storyteller'] = Date.now() - storytellerStart;

        // Step 9: Format and present
        const presenterStart = Date.now();
        const presenterOutput = await this.presenterAgent.process({
          storytellerContext: storytellerOutput,
        });
        agentTimings[isRetry ? `presenter_retry_${attempt}` : 'presenter'] = Date.now() - presenterStart;

        // Step 10: Bar Raiser evaluation (if enabled)
        if (this.barRaiserAgent) {
          const barRaiserStart = Date.now();
          const barRaiserOutput = await this.barRaiserAgent.process({
            executionTrace: {
              listener: listenerOutput,
              memory: memoryOutput,
              relationship: relationshipOutput,
              constraints: constraintsOutput,
              meaning: meaningOutput,
              explorer: explorerOutput,
              validator: validatorOutput,
              storyteller: storytellerOutput,
              presenter: presenterOutput,
            },
            presenterOutput,
            userQuery: input.userQuery,
            attemptNumber: attempt,
            previousFeedback,
            sessionId: input.sessionId,
          });
          agentTimings[isRetry ? `barRaiser_retry_${attempt}` : 'barRaiser'] = Date.now() - barRaiserStart;

          // Track best attempt by score
          if (!bestAttempt || barRaiserOutput.overallScore > bestAttempt.score) {
            bestAttempt = {
              explorerOutput,
              validatorOutput,
              storytellerOutput,
              presenterOutput,
              barRaiserOutput,
              score: barRaiserOutput.overallScore,
            };
          }

          logger.info(`Orchestrator: Bar Raiser verdict (attempt ${attempt + 1})`, {
            verdict: barRaiserOutput.verdict,
            score: barRaiserOutput.overallScore,
            criticalFailures: barRaiserOutput.criticalFailures.length,
          });

          if (barRaiserOutput.verdict === 'APPROVED' || barRaiserOutput.verdict === 'APPROVED_WITH_CONCERNS') {
            finalBarRaiserOutput = barRaiserOutput;
            bestAttempt = {
              explorerOutput,
              validatorOutput,
              storytellerOutput,
              presenterOutput,
              barRaiserOutput,
              score: barRaiserOutput.overallScore,
            };
            break;
          }

          // REJECTED — set feedback for next attempt
          previousFeedback = barRaiserOutput.feedback;
          finalBarRaiserOutput = barRaiserOutput;
        } else {
          // No Bar Raiser — use first attempt directly
          bestAttempt = {
            explorerOutput,
            validatorOutput,
            storytellerOutput,
            presenterOutput,
            score: 0,
          };
          break;
        }
      }

      // Use best attempt (either approved or best-scoring after exhaustion)
      const finalPresenter = bestAttempt!.presenterOutput;
      const finalExplorer = bestAttempt!.explorerOutput;
      const finalValidator = bestAttempt!.validatorOutput;
      const finalStoryteller = bestAttempt!.storytellerOutput;

      // Persist quality record (async, don't block response)
      if (this.qualityTracker && finalBarRaiserOutput) {
        const record = this.qualityTracker.buildQualityRecord(
          finalBarRaiserOutput,
          input.sessionId,
          input.userQuery,
          (finalBarRaiserOutput.attemptNumber || 0) + 1,
          finalValidator.validationSummary.thresholdsLowered,
          finalPresenter.recommendations?.length || 0
        );
        this.qualityTracker.persistQualityRecord(record).catch((err) => {
          logger.error('Failed to persist quality record (non-blocking)', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      // Record recommendation for learning (async, non-blocking)
      if (this.learningAgent && finalPresenter) {
        this.learningAgent.process({
          sessionId: input.sessionId,
          userId: input.userId,
          recommendationId,
          userActions: { viewed: [], clicked: [], liked: [], dismissed: [] },
          originalContext: finalPresenter,
        }).catch((err) => {
          logger.error('Learning agent failed (non-blocking)', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      const totalExecutionTimeMs = Date.now() - startTime;

      // Return in new format
      return {
        mode: 'recommendations',
        recommendationId,
        recommendations: finalPresenter,
        sessionId: input.sessionId,
        timestamp: new Date(),
        performance: {
          totalExecutionTimeMs,
          agentTimings,
        },
        executionTrace: {
          listener: listenerOutput,
          memory: memoryOutput,
          relationship: relationshipOutput,
          constraints: constraintsOutput,
          meaning: meaningOutput,
          explorer: finalExplorer,
          validator: finalValidator,
          storyteller: finalStoryteller,
          presenter: finalPresenter,
          barRaiser: finalBarRaiserOutput,
        },
        qualityScorecard: finalBarRaiserOutput?.scorecard,
        // Backward compatibility
        finalRecommendations: finalPresenter,
        orchestratedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Continue to recommendation pipeline (Steps 3-9)
   * Helper method for DialogueManager hybrid mode
   */
  private async continueRecommendationPipeline(
    memoryOutput: MemoryOutput,
    agentTimings: Record<string, number>
  ): Promise<{ executionTrace: any } & PresenterOutput> {
    // Steps 3-5: Run Relationship, Constraints, and Meaning agents in PARALLEL
    const parallelStart = Date.now();

    const [relationshipOutput, constraintsOutput, meaningOutput] = await Promise.all([
      (async () => {
        const start = Date.now();
        const result = await this.relationshipAgent.process({
          memoryContext: memoryOutput,
        });
        agentTimings['relationship'] = Date.now() - start;
        return result;
      })(),
      (async () => {
        const start = Date.now();
        const result = await this.constraintsAgent.process({
          relationshipContext: { memoryContext: memoryOutput } as any,
        });
        agentTimings['constraints'] = Date.now() - start;
        return result;
      })(),
      (async () => {
        const start = Date.now();
        const result = await this.meaningAgent.process({
          constraintsContext: { relationshipContext: { memoryContext: memoryOutput } } as any,
        });
        agentTimings['meaning'] = Date.now() - start;
        return result;
      })(),
    ]);

    agentTimings['parallel_total'] = Date.now() - parallelStart;

    // Steps 6-9 with Bar Raiser retry loop (same pattern as main execute)
    const maxRetries = this.barRaiserAgent ? this.barRaiserConfig.maxRetries : 0;
    let bestPresenter: PresenterOutput | null = null;
    let bestTrace: any = null;
    let bestScore = -1;
    let previousFeedback: BarRaiserFeedback | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const isRetry = attempt > 0;

      // Step 6: Discover product candidates
      const explorerStart = Date.now();
      const explorerOutput = await this.explorerAgent.process({
        meaningContext: meaningOutput,
        barRaiserFeedback: isRetry && previousFeedback ? previousFeedback.explorerGuidance : undefined,
      });
      agentTimings[isRetry ? `explorer_retry_${attempt}` : 'explorer'] = Date.now() - explorerStart;

      // Step 7: Validate candidates
      const validatorStart = Date.now();
      const validatorOutput = await this.validatorAgent.process({
        explorerContext: explorerOutput,
        constraintsContext: constraintsOutput,
        barRaiserGuidance: isRetry && previousFeedback ? previousFeedback.validatorGuidance : undefined,
      });
      agentTimings[isRetry ? `validator_retry_${attempt}` : 'validator'] = Date.now() - validatorStart;

      // Step 8: Craft personal reasoning
      const storytellerStart = Date.now();
      const storytellerOutput = await this.storytellerAgent.process({
        validatorContext: validatorOutput,
        barRaiserGuidance: isRetry && previousFeedback ? previousFeedback.storytellerGuidance : undefined,
      });
      agentTimings[isRetry ? `storyteller_retry_${attempt}` : 'storyteller'] = Date.now() - storytellerStart;

      // Step 9: Format and present
      const presenterStart = Date.now();
      const presenterOutput = await this.presenterAgent.process({
        storytellerContext: storytellerOutput,
      });
      agentTimings[isRetry ? `presenter_retry_${attempt}` : 'presenter'] = Date.now() - presenterStart;

      const trace = {
        relationship: relationshipOutput,
        constraints: constraintsOutput,
        meaning: meaningOutput,
        explorer: explorerOutput,
        validator: validatorOutput,
        storyteller: storytellerOutput,
        presenter: presenterOutput,
      };

      if (!this.barRaiserAgent) {
        return { ...presenterOutput, executionTrace: trace };
      }

      // Bar Raiser evaluation
      const barRaiserStart = Date.now();
      const barRaiserOutput = await this.barRaiserAgent.process({
        executionTrace: { listener: {} as any, memory: {} as any, ...trace },
        presenterOutput,
        userQuery: '',
        attemptNumber: attempt,
        previousFeedback,
        sessionId: '',
      });
      agentTimings[isRetry ? `barRaiser_retry_${attempt}` : 'barRaiser'] = Date.now() - barRaiserStart;

      if (barRaiserOutput.overallScore > bestScore) {
        bestPresenter = presenterOutput;
        bestTrace = { ...trace, barRaiser: barRaiserOutput };
        bestScore = barRaiserOutput.overallScore;
      }

      if (barRaiserOutput.verdict === 'APPROVED' || barRaiserOutput.verdict === 'APPROVED_WITH_CONCERNS') {
        break;
      }

      previousFeedback = barRaiserOutput.feedback;
    }

    return {
      ...bestPresenter!,
      executionTrace: bestTrace,
    };
  }

  /**
   * Execute with verbose logging for debugging
   */
  async executeWithLogging(input: OrchestratorInput): Promise<OrchestratorOutput> {
    console.log('\n🎁 Starting recommendation workflow...');
    console.log(`Query: "${input.userQuery}"`);
    console.log(`User: ${input.userId}`);
    console.log(`Session: ${input.sessionId}\n`);

    const result = await this.execute(input);

    console.log('\n✅ Workflow complete!');
    console.log(`Total time: ${result.performance.totalExecutionTimeMs}ms`);
    console.log('\nAgent timings:');
    Object.entries(result.performance.agentTimings).forEach(([agent, time]) => {
      console.log(`  ${agent}: ${time}ms`);
    });

    // Handle different output modes
    if (result.mode === 'clarifying') {
      console.log(`\nMode: Asking ${result.questions.length} clarifying questions`);
    } else if (result.mode === 'recommendations') {
      console.log(`\nRecommendations: ${result.recommendations.totalRecommendations}`);
    } else if (result.mode === 'recommendations_with_refinement') {
      console.log(`\nRecommendations: ${result.recommendations.totalRecommendations}`);
      console.log(`Refinement questions: ${result.refinementQuestions?.length || 0}`);
    }

    return result;
  }

  /**
   * Get execution statistics from a completed workflow
   */
  getExecutionStats(output: OrchestratorOutput): {
    totalTime: number;
    slowestAgent: { name: string; timeMs: number };
    fastestAgent: { name: string; timeMs: number };
    avgAgentTime: number;
  } {
    const timings = Object.entries(output.performance.agentTimings);
    const [slowestName, slowestTime] = timings.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );
    const [fastestName, fastestTime] = timings.reduce((min, curr) =>
      curr[1] < min[1] ? curr : min
    );
    const avgTime = timings.reduce((sum, [, time]) => sum + time, 0) / timings.length;

    return {
      totalTime: output.performance.totalExecutionTimeMs,
      slowestAgent: { name: slowestName, timeMs: slowestTime },
      fastestAgent: { name: fastestName, timeMs: fastestTime },
      avgAgentTime: avgTime,
    };
  }
}

/**
 * Factory function to create a fully configured orchestrator
 *
 * @param enableDialogue Whether to enable DialogueManager (default: false)
 * @param enableBarRaiser Whether to enable Bar Raiser quality enforcement (default: true)
 */
export async function createOrchestrator(
  enableDialogue: boolean = false,
  enableBarRaiser: boolean = true
): Promise<RecommendationOrchestrator> {
  // Import all agent implementations
  const { ListenerAgent } = await import('./agents/listener');
  const { MemoryAgent } = await import('./agents/memory');
  const { DialogueManagerAgent } = enableDialogue
    ? await import('./agents/dialogue-manager')
    : { DialogueManagerAgent: null as any };
  const { DialoguePresenterAgent } = enableDialogue
    ? await import('./agents/dialogue-presenter')
    : { DialoguePresenterAgent: null as any };
  const { RelationshipAgent } = await import('./agents/relationship');
  const { ConstraintsAgent } = await import('./agents/constraints');
  const { MeaningAgent } = await import('./agents/meaning');
  const { ExplorerAgent } = await import('./agents/explorer');
  const { ValidatorAgent } = await import('./agents/validator');
  const { StorytellerAgent } = await import('./agents/storyteller');
  const { PresenterAgent } = await import('./agents/presenter');

  // Initialize dependencies
  const { getDriver } = await import('../lib/neo4j');
  const neo4jDriver = getDriver();
  const llmClient = await import('../lib/llm').then((m) => m.createOpenAIClient());

  // Create agent instances
  const listener = new ListenerAgent();
  const memory = new MemoryAgent(neo4jDriver);
  const dialogueManager = enableDialogue ? new DialogueManagerAgent() : null;
  const dialoguePresenter = enableDialogue ? new DialoguePresenterAgent() : null;
  const relationship = new RelationshipAgent(llmClient);
  const constraints = new ConstraintsAgent();
  const meaning = new MeaningAgent(llmClient);
  const explorer = new ExplorerAgent(neo4jDriver);
  const validator = new ValidatorAgent(llmClient);
  const storyteller = new StorytellerAgent(llmClient);
  const presenter = new PresenterAgent(llmClient);

  // Bar Raiser agent (quality enforcement)
  let barRaiser = null;
  if (enableBarRaiser) {
    const { BarRaiserAgent } = await import('./agents/bar-raiser');
    barRaiser = new BarRaiserAgent(llmClient);
  }

  // Learning agent (async post-recommendation learning)
  const { LearningAgent } = await import('./agents/learning');
  const learningAgent = new LearningAgent(neo4jDriver);

  return new RecommendationOrchestrator(
    listener,
    memory,
    dialogueManager,
    dialoguePresenter,
    relationship,
    constraints,
    meaning,
    explorer,
    validator,
    storyteller,
    presenter,
    neo4jDriver,
    enableDialogue,
    barRaiser,
    undefined, // barRaiserConfig (use default)
    learningAgent
  );
}

/**
 * Orchestrator with mock agents for testing
 */
export async function createMockOrchestrator(): Promise<RecommendationOrchestrator> {
  // Import mock implementations
  const { MockListenerAgent } = await import('./agents/__mocks__/listener');
  const { MockMemoryAgent } = await import('./agents/__mocks__/memory');
  const { MockRelationshipAgent } = await import('./agents/__mocks__/relationship');
  const { MockConstraintsAgent } = await import('./agents/__mocks__/constraints');
  const { MockMeaningAgent } = await import('./agents/__mocks__/meaning');
  const { MockExplorerAgent } = await import('./agents/__mocks__/explorer');
  const { MockValidatorAgent } = await import('./agents/__mocks__/validator');
  const { MockStorytellerAgent } = await import('./agents/__mocks__/storyteller');
  const { MockPresenterAgent } = await import('./agents/__mocks__/presenter');

  return new RecommendationOrchestrator(
    new MockListenerAgent(),
    new MockMemoryAgent(),
    null, // dialogueManager (not needed for mock)
    null, // dialoguePresenter (not needed for mock)
    new MockRelationshipAgent(),
    new MockConstraintsAgent(),
    new MockMeaningAgent(),
    new MockExplorerAgent(),
    new MockValidatorAgent(),
    new MockStorytellerAgent(),
    new MockPresenterAgent(),
    null, // neo4jDriver (not needed for mock)
    false, // enableDialogue
    null, // barRaiser (not needed for mock)
    undefined, // barRaiserConfig
    null  // learningAgent (not needed for mock)
  );
}
