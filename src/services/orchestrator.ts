/**
 * Recommendation Orchestrator
 *
 * Chains all agents together in the correct sequence to produce
 * personalized gift recommendations.
 *
 * NEW: Includes DialogueManager for intelligent conversation management
 */

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

/**
 * Main orchestrator that executes the complete recommendation workflow
 */
export class RecommendationOrchestrator {
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
    private enableDialogue: boolean = false
  ) {}

  /**
   * Execute the complete recommendation workflow
   * NEW: With optional DialogueManager integration
   */
  async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const agentTimings: Record<string, number> = {};

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

      // Step 3: Analyze relationship dynamics
      const relationshipStart = Date.now();
      const relationshipOutput = await this.relationshipAgent.process({
        memoryContext: memoryOutput,
      });
      agentTimings['relationship'] = Date.now() - relationshipStart;

      // Step 4: Validate and normalize constraints
      const constraintsStart = Date.now();
      const constraintsOutput = await this.constraintsAgent.process({
        relationshipContext: relationshipOutput,
      });
      agentTimings['constraints'] = Date.now() - constraintsStart;

      // Step 5: Identify what would be meaningful
      const meaningStart = Date.now();
      const meaningOutput = await this.meaningAgent.process({
        constraintsContext: constraintsOutput,
      });
      agentTimings['meaning'] = Date.now() - meaningStart;

      // Step 6: Discover product candidates (CRITICAL - graph + embeddings)
      const explorerStart = Date.now();
      const explorerOutput = await this.explorerAgent.process({
        meaningContext: meaningOutput,
      });
      agentTimings['explorer'] = Date.now() - explorerStart;

      // Step 7: Validate candidates (quality gate)
      const validatorStart = Date.now();
      const validatorOutput = await this.validatorAgent.process({
        explorerContext: explorerOutput,
      });
      agentTimings['validator'] = Date.now() - validatorStart;

      // Step 8: Craft personal reasoning for each candidate
      const storytellerStart = Date.now();
      const storytellerOutput = await this.storytellerAgent.process({
        validatorContext: validatorOutput,
      });
      agentTimings['storyteller'] = Date.now() - storytellerStart;

      // Step 9: Format and present final recommendations
      const presenterStart = Date.now();
      const presenterOutput = await this.presenterAgent.process({
        storytellerContext: storytellerOutput,
      });
      agentTimings['presenter'] = Date.now() - presenterStart;

      const totalExecutionTimeMs = Date.now() - startTime;

      // Return in new format
      return {
        mode: 'recommendations',
        recommendations: presenterOutput,
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
          explorer: explorerOutput,
          validator: validatorOutput,
          storyteller: storytellerOutput,
          presenter: presenterOutput,
        },
        // Backward compatibility
        finalRecommendations: presenterOutput,
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
    // Step 3: Analyze relationship dynamics
    const relationshipStart = Date.now();
    const relationshipOutput = await this.relationshipAgent.process({
      memoryContext: memoryOutput,
    });
    agentTimings['relationship'] = Date.now() - relationshipStart;

    // Step 4: Validate and normalize constraints
    const constraintsStart = Date.now();
    const constraintsOutput = await this.constraintsAgent.process({
      relationshipContext: relationshipOutput,
    });
    agentTimings['constraints'] = Date.now() - constraintsStart;

    // Step 5: Identify what would be meaningful
    const meaningStart = Date.now();
    const meaningOutput = await this.meaningAgent.process({
      constraintsContext: constraintsOutput,
    });
    agentTimings['meaning'] = Date.now() - meaningStart;

    // Step 6: Discover product candidates
    const explorerStart = Date.now();
    const explorerOutput = await this.explorerAgent.process({
      meaningContext: meaningOutput,
    });
    agentTimings['explorer'] = Date.now() - explorerStart;

    // Step 7: Validate candidates
    const validatorStart = Date.now();
    const validatorOutput = await this.validatorAgent.process({
      explorerContext: explorerOutput,
    });
    agentTimings['validator'] = Date.now() - validatorStart;

    // Step 8: Craft personal reasoning
    const storytellerStart = Date.now();
    const storytellerOutput = await this.storytellerAgent.process({
      validatorContext: validatorOutput,
    });
    agentTimings['storyteller'] = Date.now() - storytellerStart;

    // Step 9: Format and present
    const presenterStart = Date.now();
    const presenterOutput = await this.presenterAgent.process({
      storytellerContext: storytellerOutput,
    });
    agentTimings['presenter'] = Date.now() - presenterStart;

    return {
      ...presenterOutput,
      executionTrace: {
        relationship: relationshipOutput,
        constraints: constraintsOutput,
        meaning: meaningOutput,
        explorer: explorerOutput,
        validator: validatorOutput,
        storyteller: storytellerOutput,
        presenter: presenterOutput,
      },
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
 */
export async function createOrchestrator(
  enableDialogue: boolean = false
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
    enableDialogue
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
    new MockPresenterAgent()
  );
}
