/**
 * Recommendation Orchestrator
 *
 * Chains all 10 agents together in the correct sequence to produce
 * personalized gift recommendations.
 */

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

/**
 * Main orchestrator that executes the complete recommendation workflow
 */
export class RecommendationOrchestrator {
  constructor(
    private listenerAgent: Agent<ListenerInput, ListenerOutput>,
    private memoryAgent: Agent<MemoryInput, MemoryOutput>,
    private relationshipAgent: Agent<RelationshipInput, RelationshipOutput>,
    private constraintsAgent: Agent<ConstraintsInput, ConstraintsOutput>,
    private meaningAgent: Agent<MeaningInput, MeaningOutput>,
    private explorerAgent: Agent<ExplorerInput, ExplorerOutput>,
    private validatorAgent: Agent<ValidatorInput, ValidatorOutput>,
    private storytellerAgent: Agent<StorytellerInput, StorytellerOutput>,
    private presenterAgent: Agent<PresenterInput, PresenterOutput>
  ) {}

  /**
   * Execute the complete recommendation workflow
   */
  async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const agentTimings: Record<string, number> = {};

    try {
      // Step 1: Extract context from user query
      const listenerStart = Date.now();
      const listenerOutput = await this.listenerAgent.process({
        userQuery: input.userQuery,
        sessionId: input.sessionId,
        userId: input.userId,
      });
      agentTimings['listener'] = Date.now() - listenerStart;

      // Step 2: Recall relevant history and patterns
      const memoryStart = Date.now();
      const memoryOutput = await this.memoryAgent.process({
        userId: input.userId,
        sessionId: input.sessionId,
        listenerOutput,
      });
      agentTimings['memory'] = Date.now() - memoryStart;

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

      return {
        finalRecommendations: presenterOutput,
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
        performance: {
          totalExecutionTimeMs,
          agentTimings,
        },
        orchestratedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
    console.log(`\nRecommendations: ${result.finalRecommendations.totalRecommendations}`);

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
 */
export async function createOrchestrator(): Promise<RecommendationOrchestrator> {
  // Import all agent implementations
  // Note: These will be implemented incrementally
  const { ListenerAgent } = await import('./agents/listener');
  const { MemoryAgent } = await import('./agents/memory');
  const { RelationshipAgent } = await import('./agents/relationship');
  const { ConstraintsAgent } = await import('./agents/constraints');
  const { MeaningAgent } = await import('./agents/meaning');
  const { ExplorerAgent } = await import('./agents/explorer');
  const { ValidatorAgent } = await import('./agents/validator');
  const { StorytellerAgent } = await import('./agents/storyteller');
  const { PresenterAgent } = await import('./agents/presenter');

  // Initialize dependencies (Neo4j, OpenAI clients)
  const neo4jClient = await import('../lib/neo4j').then((m) => m.createNeo4jClient());
  const openaiClient = await import('../lib/openai').then((m) => m.createOpenAIClient());

  // Create agent instances
  const listener = new ListenerAgent(openaiClient);
  const memory = new MemoryAgent(neo4jClient);
  const relationship = new RelationshipAgent(openaiClient);
  const constraints = new ConstraintsAgent();
  const meaning = new MeaningAgent(openaiClient);
  const explorer = new ExplorerAgent(neo4jClient);
  const validator = new ValidatorAgent(openaiClient);
  const storyteller = new StorytellerAgent(openaiClient);
  const presenter = new PresenterAgent(openaiClient);

  return new RecommendationOrchestrator(
    listener,
    memory,
    relationship,
    constraints,
    meaning,
    explorer,
    validator,
    storyteller,
    presenter
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
    new MockRelationshipAgent(),
    new MockConstraintsAgent(),
    new MockMeaningAgent(),
    new MockExplorerAgent(),
    new MockValidatorAgent(),
    new MockStorytellerAgent(),
    new MockPresenterAgent()
  );
}
