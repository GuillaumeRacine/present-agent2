/**
 * Persona Test Harness
 *
 * Runs gift recommendation system with simulated personas
 * to measure relevance, personalization, and UX quality.
 */

import { RecommendationOrchestrator, createOrchestrator } from '../services/orchestrator';
import { PersonaSimulator } from '../services/agents/persona-simulator';
import {
  TestPersona,
  SimulatedQuery,
  PersonaTestResult,
  BatchTestConfig,
  BatchTestResults,
  AggregateMetrics,
  MetricsSummary,
  TestInsights,
  PrioritizedImprovement,
} from '../types/persona';
import { TEST_PERSONAS } from './personas/test-personas';
import { logger } from '../lib/logger';
import fs from 'fs/promises';
import path from 'path';

export class PersonaTestHarness {
  private orchestrator: RecommendationOrchestrator | null = null;
  private simulator: PersonaSimulator;

  constructor() {
    this.simulator = new PersonaSimulator();
  }

  private async ensureOrchestrator(): Promise<RecommendationOrchestrator> {
    if (!this.orchestrator) {
      // Enable Bar Raiser for persona tests to exercise quality enforcement
      this.orchestrator = await createOrchestrator(false, true);
    }
    return this.orchestrator;
  }

  /**
   * Run a single persona test
   */
  async runPersonaTest(
    persona: TestPersona,
    scenarioIndex: number = 0
  ): Promise<PersonaTestResult> {
    const scenario = persona.scenarios[scenarioIndex];

    logger.info('PersonaTestHarness: Running test', {
      personaId: persona.id,
      personaName: persona.name,
      scenarioId: scenario.id,
    });

    // Step 1: Generate realistic query from persona
    const simulatedQuery = await this.simulator.generateQuery(persona, scenario);
    logger.info('PersonaTestHarness: Query generated', {
      query: simulatedQuery.query,
    });

    // Step 2: Run through recommendation system
    const orchestrator = await this.ensureOrchestrator();
    const startTime = Date.now();
    const result = await orchestrator.execute({
      userQuery: simulatedQuery.query,
      userId: `user_${persona.id}`,
      sessionId: `session_${persona.id}_${Date.now()}`,
    });
    const recommendations = result.finalRecommendations.recommendations || [];
    const responseTime = Date.now() - startTime;

    logger.info('PersonaTestHarness: Recommendations generated', {
      count: recommendations.length,
      responseTime,
    });

    // Step 3: Evaluate from persona's perspective
    const testResult = await this.simulator.evaluateRecommendations(
      simulatedQuery,
      recommendations
    );

    // Fill in system metrics
    testResult.responseTime = responseTime;
    testResult.systemMetrics.totalTime = responseTime;
    testResult.systemMetrics.candidatesFound = recommendations.length;

    logger.info('PersonaTestHarness: Test complete', {
      personaId: persona.id,
      relevanceScore: testResult.relevanceScore,
      meetsExpectations: testResult.meetsExpectations,
    });

    return testResult;
  }

  /**
   * Run batch test with multiple personas
   */
  async runBatchTest(
    personaIds?: string[],
    includeVariations: boolean = false,
    iterations: number = 1
  ): Promise<BatchTestResults> {
    const runId = `batch_${Date.now()}`;
    const personasToTest = personaIds
      ? TEST_PERSONAS.filter((p) => personaIds.includes(p.id))
      : TEST_PERSONAS;

    const config: BatchTestConfig = {
      personas: personasToTest,
      runId,
      timestamp: new Date(),
      iterations,
      includeVariations,
    };

    logger.info('PersonaTestHarness: Starting batch test', {
      runId,
      personaCount: personasToTest.length,
      iterations,
      includeVariations,
    });

    const results: PersonaTestResult[] = [];

    // Run tests for each persona
    for (const persona of personasToTest) {
      for (let i = 0; i < iterations; i++) {
        try {
          const result = await this.runPersonaTest(persona, 0);
          results.push(result);

          // Optional: Run variations
          if (includeVariations && i === 0) {
            logger.info('PersonaTestHarness: Running variations', {
              personaId: persona.id,
            });

            const variations = await this.simulator.generateQueryVariations(
              persona,
              persona.scenarios[0],
              2
            );

            for (const variation of variations) {
              const orchestrator = await this.ensureOrchestrator();
              const startTime = Date.now();
              const result = await orchestrator.execute({
                userQuery: variation.query,
                userId: `user_${persona.id}_var`,
                sessionId: `session_${persona.id}_var_${Date.now()}`,
              });
              const recommendations = result.finalRecommendations.recommendations || [];
              const responseTime = Date.now() - startTime;

              const varResult = await this.simulator.evaluateRecommendations(
                variation,
                recommendations
              );

              varResult.responseTime = responseTime;
              varResult.systemMetrics.totalTime = responseTime;
              results.push(varResult);
            }
          }
        } catch (error) {
          logger.error('PersonaTestHarness: Test failed', {
            personaId: persona.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(results);

    // Generate insights
    const insights = this.generateInsights(results, aggregateMetrics);

    const batchResults: BatchTestResults = {
      config,
      results,
      aggregateMetrics,
      insights,
    };

    logger.info('PersonaTestHarness: Batch test complete', {
      runId,
      totalTests: results.length,
      avgRelevance: aggregateMetrics.avgRelevanceScore,
      successRate: aggregateMetrics.successRate,
    });

    return batchResults;
  }

  /**
   * Calculate aggregate metrics from test results
   */
  private calculateAggregateMetrics(results: PersonaTestResult[]): AggregateMetrics {
    const totalTests = results.length;

    if (totalTests === 0) {
      return {
        totalTests: 0,
        avgRelevanceScore: 0,
        avgPersonalizationScore: 0,
        avgUXScore: 0,
        avgResponseTime: 0,
        successRate: 0,
        byPersonaType: {},
        byOccasionType: {},
        byBudgetRange: {},
        interestMatchRate: 0,
        budgetAdherenceRate: 0,
        diversityScore: 0,
      };
    }

    // Overall averages
    const avgRelevanceScore =
      results.reduce((sum, r) => sum + r.relevanceScore, 0) / totalTests;
    const avgPersonalizationScore =
      results.reduce((sum, r) => sum + r.personalizationScore, 0) / totalTests;
    const avgUXScore = results.reduce((sum, r) => sum + r.uxScore, 0) / totalTests;
    const avgResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    const successRate = results.filter((r) => r.meetsExpectations).length / totalTests;

    // Quality metrics
    const interestMatchRate =
      results.reduce((sum, r) => sum + r.metrics.interestMatchAccuracy, 0) / totalTests;
    const budgetAdherenceRate =
      results.reduce((sum, r) => sum + r.metrics.budgetAdherence, 0) / totalTests;
    const diversityScore =
      results.reduce((sum, r) => sum + r.metrics.diversityScore, 0) / totalTests;

    // Group by categories
    const byPersonaType = this.groupByCategory(results, (r) => r.personaId);
    const byOccasionType = this.groupByCategory(
      results,
      (r) => r.scenarioId.split('-')[2] || 'unknown'
    );
    const byBudgetRange = this.groupByCategory(results, (r) => {
      const avgPrice =
        r.recommendations.reduce((sum, rec) => sum + rec.product.price, 0) /
        r.recommendations.length;
      if (avgPrice < 50) return 'under-50';
      if (avgPrice < 100) return '50-100';
      if (avgPrice < 200) return '100-200';
      return 'over-200';
    });

    return {
      totalTests,
      avgRelevanceScore,
      avgPersonalizationScore,
      avgUXScore,
      avgResponseTime,
      successRate,
      byPersonaType,
      byOccasionType,
      byBudgetRange,
      interestMatchRate,
      budgetAdherenceRate,
      diversityScore,
    };
  }

  /**
   * Group results by category and calculate summary
   */
  private groupByCategory(
    results: PersonaTestResult[],
    categoryFn: (r: PersonaTestResult) => string
  ): Record<string, MetricsSummary> {
    const grouped: Record<string, PersonaTestResult[]> = {};

    for (const result of results) {
      const category = categoryFn(result);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    }

    const summary: Record<string, MetricsSummary> = {};

    for (const [category, categoryResults] of Object.entries(grouped)) {
      const count = categoryResults.length;
      summary[category] = {
        count,
        avgRelevance:
          categoryResults.reduce((sum, r) => sum + r.relevanceScore, 0) / count,
        avgPersonalization:
          categoryResults.reduce((sum, r) => sum + r.personalizationScore, 0) / count,
        avgUX: categoryResults.reduce((sum, r) => sum + r.uxScore, 0) / count,
        successRate: categoryResults.filter((r) => r.meetsExpectations).length / count,
      };
    }

    return summary;
  }

  /**
   * Generate insights from test results
   */
  private generateInsights(
    results: PersonaTestResult[],
    metrics: AggregateMetrics
  ): TestInsights {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Identify strengths (score > 7.5)
    if (metrics.avgRelevanceScore > 7.5) {
      strengths.push(`High relevance scores (${metrics.avgRelevanceScore.toFixed(1)}/10)`);
    }
    if (metrics.avgPersonalizationScore > 7.5) {
      strengths.push(
        `Strong personalization (${metrics.avgPersonalizationScore.toFixed(1)}/10)`
      );
    }
    if (metrics.avgUXScore > 7.5) {
      strengths.push(`Excellent UX (${metrics.avgUXScore.toFixed(1)}/10)`);
    }
    if (metrics.successRate > 0.75) {
      strengths.push(`High success rate (${(metrics.successRate * 100).toFixed(0)}%)`);
    }
    if (metrics.interestMatchRate > 0.8) {
      strengths.push(
        `Accurate interest matching (${(metrics.interestMatchRate * 100).toFixed(0)}%)`
      );
    }

    // Identify weaknesses (score < 6.0)
    if (metrics.avgRelevanceScore < 6.0) {
      weaknesses.push(
        `Low relevance scores (${metrics.avgRelevanceScore.toFixed(1)}/10) - recommendations not matching user needs`
      );
      criticalIssues.push('Relevance score below acceptable threshold');
    }
    if (metrics.avgPersonalizationScore < 6.0) {
      weaknesses.push(
        `Weak personalization (${metrics.avgPersonalizationScore.toFixed(1)}/10) - gifts feel generic`
      );
    }
    if (metrics.avgUXScore < 6.0) {
      weaknesses.push(
        `Poor UX (${metrics.avgUXScore.toFixed(1)}/10) - users struggling with interface`
      );
      criticalIssues.push('UX score below acceptable threshold');
    }
    if (metrics.successRate < 0.5) {
      weaknesses.push(
        `Low success rate (${(metrics.successRate * 100).toFixed(0)}%) - not meeting user expectations`
      );
      criticalIssues.push('Success rate below 50%');
    }
    if (metrics.budgetAdherenceRate < 0.7) {
      weaknesses.push(
        `Poor budget adherence (${(metrics.budgetAdherenceRate * 100).toFixed(0)}%) - recommendations outside budget`
      );
    }
    if (metrics.diversityScore < 0.5) {
      weaknesses.push(
        `Low diversity (${(metrics.diversityScore * 100).toFixed(0)}%) - recommendations too similar`
      );
    }

    // Identify opportunities
    if (metrics.interestMatchRate > 0.7 && metrics.avgRelevanceScore < 7.0) {
      opportunities.push(
        'Interest matching works well but relevance is lower - explore other factors (values, occasion)'
      );
    }
    if (metrics.avgPersonalizationScore < metrics.avgRelevanceScore - 1.0) {
      opportunities.push(
        'Relevance is better than personalization - add more persona-specific reasoning'
      );
    }
    if (metrics.avgResponseTime > 30000) {
      opportunities.push(
        `Response time slow (${(metrics.avgResponseTime / 1000).toFixed(1)}s) - optimize agent pipeline`
      );
    }

    // Generate recommendations
    if (metrics.avgRelevanceScore < 7.0) {
      recommendations.push(
        'Improve relevance: Tune graph weights, enhance interest extraction, add more relationships'
      );
    }
    if (metrics.avgPersonalizationScore < 7.0) {
      recommendations.push(
        'Enhance personalization: Use recipient learning, add persona-aware reasoning'
      );
    }
    if (metrics.budgetAdherenceRate < 0.8) {
      recommendations.push(
        'Fix budget adherence: Strengthen budget constraints in Explorer and Validator'
      );
    }
    if (metrics.diversityScore < 0.6) {
      recommendations.push(
        'Increase diversity: Implement diversity penalty in scoring, sample from different categories'
      );
    }

    // Analyze per-persona patterns
    const personaPatterns = this.analyzePersonaPatterns(results);
    const prioritizedImprovements = this.prioritizeImprovements(
      weaknesses,
      metrics,
      personaPatterns
    );

    return {
      strengths,
      weaknesses,
      opportunities,
      criticalIssues,
      recommendations,
      prioritizedImprovements,
    };
  }

  /**
   * Analyze patterns across personas
   */
  private analyzePersonaPatterns(results: PersonaTestResult[]): string[] {
    const patterns: string[] = [];

    // Group by persona characteristics
    const byPlanningStyle: Record<string, PersonaTestResult[]> = {};

    for (const result of results) {
      // Would need persona data here - simplified for now
      patterns.push(`Analyzed ${results.length} test results`);
    }

    return patterns;
  }

  /**
   * Prioritize improvements based on impact and effort
   */
  private prioritizeImprovements(
    weaknesses: string[],
    metrics: AggregateMetrics,
    patterns: string[]
  ): PrioritizedImprovement[] {
    const improvements: PrioritizedImprovement[] = [];

    if (metrics.avgRelevanceScore < 6.0) {
      improvements.push({
        area: 'relevance',
        issue: 'Low relevance scores across personas',
        impact: 'critical',
        effort: 'high',
        affectedPersonas: ['all'],
        suggestedSolution:
          'Retune graph weights, improve interest extraction, add value/occasion matching',
        priority: 10,
      });
    }

    if (metrics.budgetAdherenceRate < 0.7) {
      improvements.push({
        area: 'relevance',
        issue: 'Budget constraints not respected',
        impact: 'high',
        effort: 'medium',
        affectedPersonas: ['budget-conscious'],
        suggestedSolution:
          'Add hard budget filter in Explorer, strengthen Validator budget checks',
        priority: 9,
      });
    }

    if (metrics.diversityScore < 0.5) {
      improvements.push({
        area: 'ux',
        issue: 'Recommendations too similar',
        impact: 'medium',
        effort: 'medium',
        affectedPersonas: ['variety-seekers'],
        suggestedSolution:
          'Implement diversity penalty in scoring, sample from different categories',
        priority: 7,
      });
    }

    if (metrics.avgPersonalizationScore < 6.5) {
      improvements.push({
        area: 'personalization',
        issue: 'Generic recommendations',
        impact: 'high',
        effort: 'medium',
        affectedPersonas: ['thoughtful-planners'],
        suggestedSolution:
          'Leverage recipient learning system, add persona-aware reasoning in Storyteller',
        priority: 8,
      });
    }

    if (metrics.avgResponseTime > 30000) {
      improvements.push({
        area: 'performance',
        issue: 'Slow response times',
        impact: 'medium',
        effort: 'high',
        affectedPersonas: ['time-pressured'],
        suggestedSolution: 'Parallelize agent calls, add caching, optimize LLM calls',
        priority: 6,
      });
    }

    return improvements.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Save batch results to file
   */
  async saveBatchResults(results: BatchTestResults, outputDir: string = './test-results') {
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `${results.config.runId}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(results, null, 2));

    logger.info('PersonaTestHarness: Results saved', {
      filepath,
      testCount: results.results.length,
    });

    return filepath;
  }
}

export function createPersonaTestHarness(): PersonaTestHarness {
  return new PersonaTestHarness();
}
