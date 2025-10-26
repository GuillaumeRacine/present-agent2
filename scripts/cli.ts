/**
 * CLI Test Interface for Recommendation Engine
 *
 * Interactive interface to test the complete agent orchestration pipeline:
 * - Interactive prompts for gift context
 * - Progress indicators for each agent
 * - Beautiful formatted output
 * - Interactive actions (view details, refine, save)
 * - Debug mode with execution trace
 * - Preset test scenarios
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { createOrchestrator } from '../src/services/orchestrator.js';
import { logger } from '../src/lib/logger.js';
import type { OrchestratorOutput } from '../src/types/agents.js';

// Test scenarios
const SCENARIOS = {
  'dad-birthday': {
    userId: 'user_test_001',
    query: 'My dad just turned 58 and loves his morning coffee ritual. He also enjoys reading and working in his garden. Looking for something in the $40-65 range for his birthday.',
    description: 'Birthday gift for dad who loves coffee, reading, and gardening',
  },
  'girlfriend-birthday': {
    userId: 'user_test_001',
    query: "It's my girlfriend Emily's birthday. She's really into yoga and plant-based cooking. We've been together for 3 months, so I want something thoughtful but not too overwhelming. She cares a lot about eco-friendly and vegan products. Budget is $50-80.",
    description: 'First birthday gift for new girlfriend (3 months, vegan, yoga)',
  },
  'quick-test': {
    userId: 'user_test_001',
    query: 'Gift for someone who likes coffee',
    description: 'Quick test query',
  },
};

interface CLIOptions {
  debug?: boolean;
  scenario?: keyof typeof SCENARIOS;
}

/**
 * Main CLI function
 */
async function main() {
  try {
    console.log(chalk.bold.cyan('\n🎁 Gift Recommendation CLI\n'));

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: CLIOptions = {
      debug: args.includes('--debug'),
      scenario: args.find((arg) => arg.startsWith('--scenario='))?.split('=')[1] as keyof typeof SCENARIOS,
    };

    // Show help
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }

    // List scenarios
    if (args.includes('--list-scenarios')) {
      listScenarios();
      return;
    }

    // Initialize Neo4j
    console.log(chalk.gray('Connecting to Neo4j...'));
    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });
    console.log(chalk.green('✓ Connected\n'));

    // Get user input
    const context = options.scenario
      ? await loadScenario(options.scenario)
      : await collectUserInput();

    // Run recommendation workflow
    const result = await runWorkflow(context, options);

    // Display results
    displayRecommendations(result);

    // Interactive actions
    await handleUserActions(result, options);

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    logger.error('CLI error', { error });
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${chalk.bold('Usage:')}
  npx tsx scripts/cli.ts [options]

${chalk.bold('Options:')}
  --scenario=<name>    Use a preset test scenario
  --list-scenarios     List all available scenarios
  --debug              Show detailed execution trace
  --help, -h           Show this help message

${chalk.bold('Examples:')}
  npx tsx scripts/cli.ts                           ${chalk.gray('# Interactive mode')}
  npx tsx scripts/cli.ts --scenario=dad-birthday  ${chalk.gray('# Use preset scenario')}
  npx tsx scripts/cli.ts --debug                   ${chalk.gray('# Debug mode')}
  npx tsx scripts/cli.ts --list-scenarios          ${chalk.gray('# List scenarios')}
  `);
}

/**
 * List available scenarios
 */
function listScenarios() {
  console.log(chalk.bold('\n📋 Available Test Scenarios:\n'));
  Object.entries(SCENARIOS).forEach(([key, scenario]) => {
    console.log(chalk.cyan(`  ${key}`));
    console.log(chalk.gray(`    ${scenario.description}`));
    console.log(chalk.gray(`    User: ${scenario.userId}\n`));
  });
}

/**
 * Load preset scenario
 */
async function loadScenario(scenarioName: keyof typeof SCENARIOS): Promise<{
  userId: string;
  query: string;
}> {
  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  console.log(chalk.bold(`📝 Using scenario: ${chalk.cyan(scenarioName)}\n`));
  console.log(chalk.gray(`Description: ${scenario.description}`));
  console.log(chalk.gray(`Query: "${scenario.query}"\n`));

  return {
    userId: scenario.userId,
    query: scenario.query,
  };
}

/**
 * Collect user input interactively
 */
async function collectUserInput(): Promise<{ userId: string; query: string }> {
  console.log(chalk.bold('Let\'s find the perfect gift!\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'userId',
      message: 'Select a test user:',
      choices: [
        { name: 'John Doe (test user 1)', value: 'user_test_001' },
        { name: 'Sarah Smith (test user 2)', value: 'user_test_002' },
      ],
      default: 'user_test_001',
    },
    {
      type: 'input',
      name: 'query',
      message: 'Describe the gift you\'re looking for:',
      default: 'Birthday gift for my dad who loves coffee and reading',
      validate: (input) => {
        if (input.trim().length < 10) {
          return 'Please provide more details (at least 10 characters)';
        }
        return true;
      },
    },
  ]);

  console.log('');
  return answers as { userId: string; query: string };
}

/**
 * Run recommendation workflow with progress indicators
 */
async function runWorkflow(
  context: { userId: string; query: string },
  options: CLIOptions
): Promise<OrchestratorOutput> {
  console.log(chalk.bold('🚀 Running recommendation workflow...\n'));

  const orchestrator = await createOrchestrator();

  let spinner: Ora | null = null;

  try {
    // Create input
    const input = {
      userQuery: context.query,
      userId: context.userId,
      sessionId: `session_${Date.now()}`,
    };

    // Run orchestration
    const startTime = Date.now();
    spinner = ora('Starting pipeline...').start();

    const result = await orchestrator.execute(input);

    // Show progress for each agent (simulated since we don't have callbacks yet)
    const agents = ['Listener', 'Memory', 'Relationship', 'Constraints', 'Meaning', 'Explorer', 'Validator', 'Storyteller', 'Presenter'];

    agents.forEach((agent) => {
      const time = result.performance.agentTimings[agent.toLowerCase()] || 0;
      const icon = getAgentIcon(agent);
      spinner.succeed(chalk.gray(`${icon} ${agent}: ${time}ms`));
      spinner = ora().start();
    });

    spinner.stop();

    const totalTime = Date.now() - startTime;
    console.log(chalk.green(`\n✓ Complete in ${totalTime}ms\n`));

    // Show debug info if requested
    if (options.debug) {
      showDebugInfo(result);
    }

    return result;

  } catch (error) {
    if (spinner) spinner.fail(chalk.red('Pipeline failed'));
    throw error;
  }
}

/**
 * Display recommendations in beautiful format
 */
function displayRecommendations(result: OrchestratorOutput) {
  const recommendations = result.finalRecommendations.recommendations;

  if (recommendations.length === 0) {
    console.log(chalk.yellow('No recommendations found. Try adjusting your query.\n'));
    return;
  }

  console.log(
    boxen(chalk.bold.cyan('🎁 Your Gift Recommendations'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'double',
      borderColor: 'cyan',
    })
  );

  // Show intro
  if (result.finalRecommendations.conversationalIntro) {
    console.log(chalk.gray(result.finalRecommendations.conversationalIntro));
    console.log('');
  }

  // Show each recommendation
  recommendations.forEach((rec, idx) => {
    const content = [
      chalk.bold(`${idx + 1}. ${rec.product.title}`) + chalk.cyan(` $${rec.product.price.toFixed(2)}`),
      '',
    ];

    // Tags
    if (rec.tags && rec.tags.length > 0) {
      content.push(chalk.yellow(`${rec.tags.join(' • ')} | ⭐ ${rec.confidence.toFixed(2)}`));
      content.push('');
    }

    // Reasoning
    content.push(chalk.white('Why this works:'));
    content.push(chalk.gray(wrapText(rec.reasoning, 60)));

    // URL
    if (rec.product.url) {
      content.push('');
      content.push(chalk.blue.underline(rec.product.url));
    }

    console.log(
      boxen(content.join('\n'), {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 2, right: 0 },
        borderColor: 'gray',
        borderStyle: 'round',
      })
    );
  });

  // Show outro
  if (result.finalRecommendations.conversationalOutro) {
    console.log(chalk.gray(result.finalRecommendations.conversationalOutro));
    console.log('');
  }

  // Show metadata
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.gray(`Total recommendations: ${recommendations.length}`));
  console.log(chalk.gray(`Average confidence: ${(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length).toFixed(2)}`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
}

/**
 * Handle interactive user actions
 */
async function handleUserActions(result: OrchestratorOutput, options: CLIOptions) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '👁️  View execution trace', value: 'trace' },
        { name: '🔍 View product details', value: 'details' },
        { name: '✨ New search', value: 'new' },
        { name: '🚪 Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'trace':
      showDebugInfo(result);
      await handleUserActions(result, options);
      break;

    case 'details':
      await viewProductDetails(result);
      await handleUserActions(result, options);
      break;

    case 'new':
      console.clear();
      await main();
      break;

    case 'exit':
      console.log(chalk.green('\nThanks for using Gift Recommendation CLI! 👋\n'));
      break;
  }
}

/**
 * View product details
 */
async function viewProductDetails(result: OrchestratorOutput) {
  const recommendations = result.finalRecommendations.recommendations;

  const { productIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'productIndex',
      message: 'Select a product:',
      choices: recommendations.map((rec, idx) => ({
        name: `${idx + 1}. ${rec.product.title} ($${rec.product.price})`,
        value: idx,
      })),
    },
  ]);

  const rec = recommendations[productIndex];
  const explorerCandidates = result.executionTrace.explorer.candidates;
  const candidate = explorerCandidates.find((c) => c.product.id === rec.product.id);

  console.log('');
  console.log(
    boxen(
      [
        chalk.bold.cyan(rec.product.title),
        '',
        chalk.gray(rec.product.description),
        '',
        chalk.yellow(`Price: $${rec.product.price}`),
        chalk.yellow(`Vendor: ${rec.product.vendor}`),
        '',
        chalk.white('Scores:'),
        candidate ? chalk.gray(`  Graph: ${candidate.scores.graphScore.toFixed(2)}`) : '',
        candidate ? chalk.gray(`  Vector: ${candidate.scores.vectorScore.toFixed(2)}`) : '',
        candidate ? chalk.gray(`  Hybrid: ${candidate.scores.hybridScore.toFixed(2)}`) : '',
        chalk.gray(`  Confidence: ${rec.confidence.toFixed(2)}`),
        '',
        chalk.white('Match Reasons:'),
        candidate && candidate.matchReasons.matchedInterests.length > 0
          ? chalk.gray(`  Interests: ${candidate.matchReasons.matchedInterests.join(', ')}`)
          : '',
        candidate && candidate.matchReasons.matchedValues.length > 0
          ? chalk.gray(`  Values: ${candidate.matchReasons.matchedValues.join(', ')}`)
          : '',
        candidate && candidate.matchReasons.socialProofCount > 0
          ? chalk.gray(`  Social proof: ${candidate.matchReasons.socialProofCount} users`)
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      {
        padding: 1,
        borderColor: 'cyan',
      }
    )
  );
  console.log('');
}

/**
 * Show debug information
 */
function showDebugInfo(result: OrchestratorOutput) {
  console.log('\n' + chalk.bold.yellow('🔍 Execution Trace\n'));

  // Performance
  console.log(chalk.bold('Performance:'));
  console.log(chalk.gray(`  Total: ${result.performance.totalExecutionTimeMs}ms`));
  Object.entries(result.performance.agentTimings).forEach(([agent, time]) => {
    const icon = getAgentIcon(agent.charAt(0).toUpperCase() + agent.slice(1));
    console.log(chalk.gray(`  ${icon} ${agent}: ${time}ms`));
  });
  console.log('');

  // Listener output
  console.log(chalk.bold('Listener:'));
  const listener = result.executionTrace.listener;
  if (listener.recipient) {
    console.log(chalk.gray(`  Recipient: ${listener.recipient.name || 'Unknown'} (${listener.recipient.relationshipType || 'Unknown'})`));
  }
  if (listener.occasion) {
    console.log(chalk.gray(`  Occasion: ${listener.occasion.name} (${listener.occasion.urgency})`));
  }
  if (listener.budget) {
    console.log(chalk.gray(`  Budget: $${listener.budget.min}-$${listener.budget.max} (${listener.budget.flexibility})`));
  }
  if (listener.interests.length > 0) {
    console.log(chalk.gray(`  Interests: ${listener.interests.join(', ')}`));
  }
  console.log(chalk.gray(`  Confidence: ${listener.confidence.toFixed(2)}`));
  console.log('');

  // Memory output
  console.log(chalk.bold('Memory:'));
  const memory = result.executionTrace.memory;
  console.log(chalk.gray(`  Past conversations: ${memory.pastConversations?.length || 0}`));
  console.log(chalk.gray(`  Past recipients: ${memory.pastRecipients?.length || 0}`));
  console.log(chalk.gray(`  Patterns recognized: ${memory.recognizedPatterns?.length || 0}`));
  if (memory.recognizedPatterns && memory.recognizedPatterns.length > 0) {
    memory.recognizedPatterns.slice(0, 3).forEach((pattern) => {
      console.log(chalk.gray(`    - ${pattern.pattern} (${pattern.confidence.toFixed(2)})`));
    });
  }
  console.log('');

  // Explorer output
  console.log(chalk.bold('Explorer:'));
  const explorer = result.executionTrace.explorer;
  console.log(chalk.gray(`  Candidates found: ${explorer.candidates.length}`));
  console.log(chalk.gray(`  Diversity score: ${explorer.searchMetadata.diversityScore.toFixed(2)}`));
  console.log(chalk.gray(`  Coverage score: ${explorer.searchMetadata.coverageScore.toFixed(2)}`));
  console.log(chalk.gray(`  Avg confidence: ${explorer.searchMetadata.avgConfidence.toFixed(2)}`));
  console.log(chalk.gray(`  Execution time: ${explorer.executionTimeMs}ms`));
  console.log('');

  // Validator output
  console.log(chalk.bold('Validator:'));
  const validator = result.executionTrace.validator;
  console.log(chalk.gray(`  Validated: ${validator.validatedCandidates.length}`));
  console.log(chalk.gray(`  Rejected: ${validator.rejectedCandidates.length}`));
  console.log('');

  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
}

/**
 * Get emoji icon for agent
 */
function getAgentIcon(agent: string): string {
  const icons: Record<string, string> = {
    Listener: '🎧',
    Memory: '🧠',
    Relationship: '👥',
    Constraints: '🔒',
    Meaning: '🎯',
    Explorer: '🔍',
    Validator: '✅',
    Storyteller: '📖',
    Presenter: '🎁',
    Learning: '📊',
  };
  return icons[agent] || '⚙️';
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

// Run CLI
main();
