#!/usr/bin/env tsx
/**
 * Persona Testing CLI
 *
 * Run comprehensive persona tests to evaluate system quality
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { PersonaTestHarness } from '../src/test/persona-test-harness';
import { PersonaReportGenerator } from '../src/test/persona-report-generator';
import { TEST_PERSONAS, getPersonaSummary } from '../src/test/personas/test-personas';
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('test-personas')
  .description('Run persona-based testing to evaluate recommendation quality')
  .version('1.0.0');

// List personas
program
  .command('list')
  .description('List all available test personas')
  .action(async () => {
    console.log(chalk.blue.bold('\n📋 Available Test Personas\n'));

    for (const persona of TEST_PERSONAS) {
      console.log(chalk.cyan(`${persona.id}`));
      console.log(`  Name: ${persona.name}`);
      console.log(
        `  Age: ${persona.demographics.age}, ${persona.demographics.occupation}`
      );
      console.log(`  Planning Style: ${persona.giftGivingStyle.planningStyle}`);
      console.log(
        `  Budget: $${persona.giftGivingStyle.typicalBudgetRange.min}-$${persona.giftGivingStyle.typicalBudgetRange.max}`
      );
      console.log(`  Scenarios: ${persona.scenarios.length}`);
      console.log();
    }

    console.log(chalk.blue('\nSummary:'));
    console.log(getPersonaSummary());
  });

// Run single persona test
program
  .command('run')
  .description('Run test for a single persona')
  .option('-p, --persona <id>', 'Persona ID to test')
  .option('-s, --scenario <index>', 'Scenario index (default: 0)', '0')
  .option('-o, --output <dir>', 'Output directory', './test-results')
  .action(async (options) => {
    const personaId = options.persona;
    const scenarioIndex = parseInt(options.scenario, 10);

    if (!personaId) {
      console.error(chalk.red('Error: --persona is required'));
      console.log('Use "test-personas list" to see available personas');
      process.exit(1);
    }

    const persona = TEST_PERSONAS.find((p) => p.id === personaId);
    if (!persona) {
      console.error(chalk.red(`Error: Persona ${personaId} not found`));
      process.exit(1);
    }

    console.log(chalk.blue.bold(`\n🧪 Running Test: ${persona.name}\n`));

    // Initialize Neo4j
    try {
      await initNeo4j({
        uri: process.env.NEO4J_URL || '',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || '',
        database: process.env.NEO4J_DATABASE || 'neo4j',
      });
    } catch (error) {
      console.error(chalk.red('Failed to initialize Neo4j connection'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    const harness = new PersonaTestHarness();
    const spinner = ora('Generating query and running recommendation system...').start();

    try {
      const result = await harness.runPersonaTest(persona, scenarioIndex);

      spinner.succeed('Test complete!');

      // Display results
      console.log(chalk.blue('\n📊 Results:\n'));
      console.log(`Query: ${chalk.cyan(result.generatedQuery)}`);
      console.log(`Response Time: ${chalk.yellow((result.responseTime / 1000).toFixed(1))}s`);
      console.log(
        `Recommendations: ${chalk.green(result.recommendations.length)} products`
      );
      console.log();

      console.log(chalk.blue('Scores:'));
      console.log(`  Relevance: ${getScoreColor(result.relevanceScore)}/10`);
      console.log(
        `  Personalization: ${getScoreColor(result.personalizationScore)}/10`
      );
      console.log(`  UX: ${getScoreColor(result.uxScore)}/10`);
      console.log(
        `  Meets Expectations: ${result.meetsExpectations ? chalk.green('✓ Yes') : chalk.red('✗ No')}`
      );
      console.log();

      console.log(chalk.blue('Top Recommendations:'));
      for (const rec of result.recommendations.slice(0, 3)) {
        const consider = rec.wouldConsider ? chalk.green('✓') : chalk.red('✗');
        console.log(
          `  ${consider} ${rec.product.name} - $${rec.product.price.toFixed(2)} (${rec.perceivedRelevance}/10)`
        );
      }
      console.log();

      console.log(chalk.blue('What Worked:'));
      result.whatWorked.forEach((w) => console.log(chalk.green(`  ✓ ${w}`)));
      console.log();

      console.log(chalk.blue('What Didn\'t Work:'));
      result.whatDidntWork.forEach((w) => console.log(chalk.red(`  ✗ ${w}`)));
      console.log();

      if (result.suggestions.length > 0) {
        console.log(chalk.blue('Suggestions:'));
        result.suggestions.forEach((s) => console.log(chalk.yellow(`  → ${s}`)));
        console.log();
      }

      // Save result
      await fs.mkdir(options.output, { recursive: true });
      const filename = `${personaId}_${Date.now()}.json`;
      const filepath = path.join(options.output, filename);
      await fs.writeFile(filepath, JSON.stringify(result, null, 2));
      console.log(chalk.dim(`Result saved to: ${filepath}`));
    } catch (error) {
      spinner.fail('Test failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeNeo4j();
    }
  });

// Run batch test
program
  .command('batch')
  .description('Run tests for multiple personas')
  .option('-p, --personas <ids...>', 'Persona IDs to test (default: all)')
  .option('-i, --iterations <n>', 'Number of iterations per persona', '1')
  .option('-v, --variations', 'Include query variations', false)
  .option('-o, --output <dir>', 'Output directory', './test-results')
  .action(async (options) => {
    const personaIds = options.personas;
    const iterations = parseInt(options.iterations, 10);
    const includeVariations = options.variations;

    const personas = personaIds
      ? TEST_PERSONAS.filter((p) => personaIds.includes(p.id))
      : TEST_PERSONAS;

    if (personas.length === 0) {
      console.error(chalk.red('Error: No valid personas selected'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n🧪 Running Batch Test\n'));
    console.log(`Personas: ${chalk.cyan(personas.length)}`);
    console.log(`Iterations: ${chalk.cyan(iterations)}`);
    console.log(`Variations: ${chalk.cyan(includeVariations ? 'Yes' : 'No')}`);
    console.log();

    // Initialize Neo4j
    try {
      await initNeo4j({
        uri: process.env.NEO4J_URL || '',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || '',
        database: process.env.NEO4J_DATABASE || 'neo4j',
      });
    } catch (error) {
      console.error(chalk.red('Failed to initialize Neo4j connection'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    const harness = new PersonaTestHarness();
    const spinner = ora('Running batch tests...').start();

    try {
      const results = await harness.runBatchTest(personaIds, includeVariations, iterations);

      spinner.succeed('Batch test complete!');

      // Display summary
      console.log(chalk.blue.bold('\n📊 Batch Test Results\n'));
      console.log(`Total Tests: ${chalk.cyan(results.aggregateMetrics.totalTests)}`);
      console.log(
        `Success Rate: ${getScoreColor(results.aggregateMetrics.successRate * 10)} (${(results.aggregateMetrics.successRate * 100).toFixed(1)}%)`
      );
      console.log();

      console.log(chalk.blue('Average Scores:'));
      console.log(
        `  Relevance: ${getScoreColor(results.aggregateMetrics.avgRelevanceScore)}/10`
      );
      console.log(
        `  Personalization: ${getScoreColor(results.aggregateMetrics.avgPersonalizationScore)}/10`
      );
      console.log(`  UX: ${getScoreColor(results.aggregateMetrics.avgUXScore)}/10`);
      console.log(
        `  Response Time: ${chalk.yellow((results.aggregateMetrics.avgResponseTime / 1000).toFixed(1))}s`
      );
      console.log();

      if (results.insights.criticalIssues.length > 0) {
        console.log(chalk.red.bold('⚠️ Critical Issues:'));
        results.insights.criticalIssues.forEach((i) => console.log(chalk.red(`  • ${i}`)));
        console.log();
      }

      console.log(chalk.green.bold('✅ Strengths:'));
      results.insights.strengths.forEach((s) => console.log(chalk.green(`  • ${s}`)));
      console.log();

      if (results.insights.weaknesses.length > 0) {
        console.log(chalk.yellow.bold('⚠️ Weaknesses:'));
        results.insights.weaknesses.forEach((w) => console.log(chalk.yellow(`  • ${w}`)));
        console.log();
      }

      console.log(chalk.blue.bold('🚀 Top Improvements:'));
      for (const imp of results.insights.prioritizedImprovements.slice(0, 5)) {
        console.log(chalk.cyan(`\n  ${imp.priority}. ${imp.issue}`));
        console.log(
          chalk.dim(`     Impact: ${imp.impact}, Effort: ${imp.effort}, Area: ${imp.area}`)
        );
        console.log(chalk.dim(`     Solution: ${imp.suggestedSolution}`));
      }
      console.log();

      // Generate reports
      const reportSpinner = ora('Generating reports...').start();

      await fs.mkdir(options.output, { recursive: true });

      const reportGenerator = new PersonaReportGenerator();

      // Save full results
      const resultsPath = path.join(options.output, `${results.config.runId}.json`);
      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

      // Generate markdown report
      const reportPath = path.join(options.output, `${results.config.runId}_report.md`);
      await reportGenerator.generateReport(results, reportPath);

      // Generate JSON summary
      const summaryPath = path.join(options.output, `${results.config.runId}_summary.json`);
      await reportGenerator.generateJSONSummary(results, summaryPath);

      // Generate CSV
      const csvPath = path.join(options.output, `${results.config.runId}_results.csv`);
      await reportGenerator.generateCSV(results, csvPath);

      reportSpinner.succeed('Reports generated!');

      console.log(chalk.blue('\n📁 Output Files:'));
      console.log(chalk.dim(`  Full results: ${resultsPath}`));
      console.log(chalk.dim(`  Report: ${reportPath}`));
      console.log(chalk.dim(`  Summary: ${summaryPath}`));
      console.log(chalk.dim(`  CSV: ${csvPath}`));
      console.log();
    } catch (error) {
      spinner.fail('Batch test failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeNeo4j();
    }
  });

// Quick test command
program
  .command('quick')
  .description('Run quick test with 3 diverse personas')
  .option('-o, --output <dir>', 'Output directory', './test-results')
  .action(async (options) => {
    // Select 3 diverse personas
    const quickPersonas = [
      'persona-001-sarah', // Thoughtful planner
      'persona-002-mike', // Last-minute
      'persona-003-jessica', // Budget-conscious
    ];

    console.log(chalk.blue.bold('\n⚡ Running Quick Test (3 personas)\n'));

    // Initialize Neo4j
    try {
      await initNeo4j({
        uri: process.env.NEO4J_URL || '',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || '',
        database: process.env.NEO4J_DATABASE || 'neo4j',
      });
    } catch (error) {
      console.error(chalk.red('Failed to initialize Neo4j connection'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    const harness = new PersonaTestHarness();
    const spinner = ora('Running tests...').start();

    try {
      const results = await harness.runBatchTest(quickPersonas, false, 1);

      spinner.succeed('Quick test complete!');

      // Display summary
      console.log(chalk.blue.bold('\n📊 Quick Test Results\n'));
      console.log(
        `Success Rate: ${getScoreColor(results.aggregateMetrics.successRate * 10)} (${(results.aggregateMetrics.successRate * 100).toFixed(1)}%)`
      );
      console.log(
        `Avg Relevance: ${getScoreColor(results.aggregateMetrics.avgRelevanceScore)}/10`
      );
      console.log(
        `Avg Personalization: ${getScoreColor(results.aggregateMetrics.avgPersonalizationScore)}/10`
      );
      console.log();

      // Generate report
      await fs.mkdir(options.output, { recursive: true });
      const reportGenerator = new PersonaReportGenerator();
      const reportPath = path.join(options.output, `quick_test_${Date.now()}_report.md`);
      await reportGenerator.generateReport(results, reportPath);

      console.log(chalk.dim(`Report saved to: ${reportPath}`));
    } catch (error) {
      spinner.fail('Quick test failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeNeo4j();
    }
  });

// Helper to colorize scores
function getScoreColor(score: number): string {
  if (!score && score !== 0) return chalk.gray('N/A');
  if (score >= 8.0) return chalk.green.bold(score.toFixed(1));
  if (score >= 7.0) return chalk.green(score.toFixed(1));
  if (score >= 6.0) return chalk.yellow(score.toFixed(1));
  if (score >= 5.0) return chalk.yellow.bold(score.toFixed(1));
  return chalk.red.bold(score.toFixed(1));
}

program.parse();
