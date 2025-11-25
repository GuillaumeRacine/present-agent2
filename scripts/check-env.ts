#!/usr/bin/env tsx
/**
 * Environment Health Check
 *
 * Verifies required env vars are present and attempts live connectivity to
 * Neo4j and optionally LLM providers (OpenAI/Anthropic). Safe to run locally.
 *
 * Usage: npm run env:check
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Load backend env
dotenv.config({ path: '.env.local' });

function loadFrontendEnv(): Record<string, string> {
  const frontendEnvPath = path.join(process.cwd(), 'frontend', '.env.local');
  if (fs.existsSync(frontendEnvPath)) {
    const content = fs.readFileSync(frontendEnvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const env: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
    return env;
  }
  return {};
}

async function checkNeo4j(): Promise<boolean> {
  const { initNeo4j, closeNeo4j } = await import('../src/lib/neo4j.js');

  const uri = process.env.NEO4J_URL || '';
  const username = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || '';
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  const missing: string[] = [];
  if (!uri) missing.push('NEO4J_URL');
  if (!password) missing.push('NEO4J_PASSWORD');

  console.log(chalk.bold('\nNeo4j configuration:'));
  console.log(`  NEO4J_URL:       ${uri || chalk.red('missing')}`);
  console.log(`  NEO4J_USERNAME:  ${username}`);
  console.log(`  NEO4J_PASSWORD:  ${password ? 'set' : chalk.red('missing')}`);
  console.log(`  NEO4J_DATABASE:  ${database}`);

  if (missing.length) {
    console.log(chalk.red(`✗ Missing required: ${missing.join(', ')}`));
    return false;
  }

  try {
    await initNeo4j({ uri, username, password, database });
    console.log(chalk.green('✓ Neo4j connectivity verified'));
    await closeNeo4j();
    return true;
  } catch (err: any) {
    console.log(chalk.red(`✗ Neo4j connectivity failed: ${err?.message || err}`));
    return false;
  }
}

async function checkLLM(): Promise<boolean> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  console.log(chalk.bold('\nLLM providers:'));
  console.log(`  OPENAI_API_KEY:      ${hasOpenAI ? 'set' : chalk.yellow('missing')}`);
  console.log(`  ANTHROPIC_API_KEY:   ${hasAnthropic ? 'set' : chalk.yellow('missing')}`);

  if (!hasOpenAI && !hasAnthropic) {
    console.log(chalk.yellow('! At least one LLM key is recommended (OpenAI or Anthropic)'));
    return false;
  }

  // Optional live checks
  try {
    if (hasOpenAI) {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      // Lightweight call: list models (no tokens used)
      await client.models.list({});
      console.log(chalk.green('✓ OpenAI key appears valid'));
    }
  } catch (err: any) {
    console.log(chalk.red(`✗ OpenAI check failed: ${err?.message || err}`));
  }

  try {
    if (hasAnthropic) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      // Lightweight call: get API key info by creating a tiny message with 1 token max
      await client.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
      console.log(chalk.green('✓ Anthropic key appears valid'));
    }
  } catch (err: any) {
    console.log(chalk.red(`✗ Anthropic check failed: ${err?.message || err}`));
  }

  return hasOpenAI || hasAnthropic;
}

function checkBackendFrontendEnv(): boolean {
  console.log(chalk.bold('\nBackend/Frontend URLs:'));
  const backendPort = process.env.BACKEND_PORT || '3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  console.log(`  BACKEND_PORT:   ${backendPort}`);
  console.log(`  FRONTEND_URL:   ${frontendUrl}`);

  const feEnv = loadFrontendEnv();
  const feBackendUrl = feEnv.BACKEND_URL || 'http://localhost:3000';
  console.log(`  frontend/.env BACKEND_URL: ${feBackendUrl}`);

  let ok = true;
  if (!feEnv.BACKEND_URL) {
    console.log(chalk.yellow('! frontend/.env.local missing BACKEND_URL (defaulting to http://localhost:3000)'));
  }
  if (!frontendUrl.includes('3001')) {
    console.log(chalk.yellow('! FRONTEND_URL should usually be http://localhost:3001 for local dev'));
  }
  if (!feBackendUrl.includes('3000')) {
    console.log(chalk.yellow('! Frontend BACKEND_URL should usually be http://localhost:3000 for local dev'));
    ok = false;
  }
  return ok;
}

async function main() {
  console.log(chalk.bold.cyan('\nPresent-Agent2 - Environment Check'));

  const neo4jOk = await checkNeo4j();
  const llmOk = await checkLLM();
  const urlsOk = checkBackendFrontendEnv();

  const ok = neo4jOk && urlsOk; // LLM is recommended but not strictly required for some flows

  console.log('\n');
  if (ok) {
    console.log(chalk.green('✅ Environment looks good.'));
    process.exit(0);
  } else {
    console.log(chalk.red('❌ Environment has issues. See messages above.'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red('Unexpected error in env check:'), err);
  process.exit(1);
});

