#!/usr/bin/env tsx
/**
 * Interactive CLI Chat Interface
 *
 * Usage:
 *   npm run chat
 *   npm run chat -- "your query here"
 *   npm run chat -- --user "custom-user-id" "your query"
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set quiet mode - only show errors in logs
process.env.LOG_LEVEL = 'error';
process.env.QUIET_MODE = 'true';

import { createOrchestrator } from '../src/services/orchestrator.js';
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { persistConversation } from '../src/services/conversation-persister.js';
import readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';

// Default user ID (you can override with --user flag or set your email)
const DEFAULT_USER_ID = 'guillaume.racine.gr@gmail.com';

interface ChatConfig {
  userId: string;
  sessionId: string;
  interactive: boolean;
}

async function displayRecommendations(result: any): Promise<void> {
  const { finalRecommendations, performance } = result;

  console.log('\n' + '='.repeat(80));
  console.log(chalk.bold.cyan(`\n🎁 GIFT RECOMMENDATIONS\n`));

  if (finalRecommendations.recommendations.length === 0) {
    console.log(chalk.yellow('No recommendations found. Try a different query.'));
    return;
  }

  finalRecommendations.recommendations.forEach((rec: any, idx: number) => {
    console.log(chalk.bold.green(`\n${idx + 1}. ${rec.product.title}`));
    console.log(chalk.gray(`   $${rec.product.price} - ${rec.product.vendor || 'Unknown'}`));

    // Scores
    console.log(chalk.blue(`   Scores: Hybrid ${rec.scores.hybridScore.toFixed(3)} | `
      + `Graph ${rec.scores.graphScore.toFixed(3)} | `
      + `Vector ${rec.scores.vectorScore.toFixed(3)}`));

    // Matched interests
    if (rec.matchReasons.matchedInterests.length > 0) {
      console.log(chalk.cyan(`   Interests: ${rec.matchReasons.matchedInterests.join(', ')}`));
    }

    // Reasoning
    if (rec.reasoning) {
      const shortReasoning = rec.reasoning.substring(0, 200);
      console.log(chalk.gray(`   ${shortReasoning}${rec.reasoning.length > 200 ? '...' : ''}`));
    }

    console.log(chalk.gray(`   ID: ${rec.product.id}`));
  });

  // Performance stats
  console.log(chalk.bold.white(`\n⚡ Performance:`));
  console.log(chalk.gray(`   Total time: ${(performance.totalExecutionTimeMs / 1000).toFixed(1)}s`));
  console.log(chalk.gray(`   Listener: ${(performance.agentExecutionTimes.listener / 1000).toFixed(1)}s`));
  console.log(chalk.gray(`   Explorer: ${(performance.agentExecutionTimes.explorer / 1000).toFixed(1)}s`));

  console.log('\n' + '='.repeat(80) + '\n');
}

async function processQuery(query: string, config: ChatConfig): Promise<void> {
  console.log(chalk.dim(`\n[User: ${config.userId}] [Session: ${config.sessionId}]`));
  console.log(chalk.yellow(`\n🤔 Processing: "${query}"\n`));

  const orchestrator = await createOrchestrator();

  const startTime = Date.now();
  const result = await orchestrator.execute({
    userQuery: query,
    userId: config.userId,
    sessionId: config.sessionId,
  });
  const duration = Date.now() - startTime;

  // Persist conversation (async, non-blocking)
  persistConversation(result, query, config.userId, config.sessionId).catch(
    (err) => console.error(chalk.red('Failed to persist conversation:'), err)
  );

  await displayRecommendations(result);

  console.log(chalk.dim(`\n✓ Conversation saved to history (Total time: ${(duration / 1000).toFixed(1)}s)\n`));
}

async function interactiveMode(config: ChatConfig): Promise<void> {
  console.log(boxen(
    chalk.bold.cyan('🎁 Present Agent 2 - Interactive Chat\n\n') +
    chalk.white(`User ID: ${chalk.bold(config.userId)}\n`) +
    chalk.white(`Session: ${chalk.bold(config.sessionId)}\n\n`) +
    chalk.gray('Type your gift search queries below.\n') +
    chalk.gray('Type "exit" or "quit" to end the session.'),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
  ));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.cyan('\n🎁 > ')
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const query = line.trim();

    if (!query) {
      rl.prompt();
      return;
    }

    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      console.log(chalk.green('\n👋 Thanks for using Present Agent 2!\n'));
      rl.close();
      await closeNeo4j();
      process.exit(0);
    }

    try {
      await processQuery(query, config);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log(chalk.green('\n👋 Thanks for using Present Agent 2!\n'));
    await closeNeo4j();
    process.exit(0);
  });
}

async function singleQueryMode(query: string, config: ChatConfig): Promise<void> {
  try {
    await processQuery(query, config);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  let userId = DEFAULT_USER_ID;
  let query = '';
  let interactive = true;

  // Parse --user flag
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user' && i + 1 < args.length) {
      userId = args[i + 1];
      i++; // Skip next arg
    } else {
      query = args[i];
      interactive = false;
    }
  }

  const sessionId = `session-${Date.now()}`;

  const config: ChatConfig = {
    userId,
    sessionId,
    interactive
  };

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  if (interactive) {
    await interactiveMode(config);
  } else {
    await singleQueryMode(query, config);
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
