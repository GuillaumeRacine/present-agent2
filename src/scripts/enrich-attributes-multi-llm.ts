#!/usr/bin/env tsx
/**
 * Multi-LLM Fallback Attribute Enrichment Script
 *
 * This script enriches products with gift attributes using a multi-provider
 * failover strategy: OpenAI → Anthropic → Gemini
 *
 * KEY FEATURES:
 * - Three-tier fallback: OpenAI → Anthropic → Gemini
 * - No retries with same LLM on validation failure
 * - Immediate failover to next LLM if batch fails validation
 * - Tracks which LLM succeeded for each batch
 * - Separate failure tracking for products that failed all 3 LLMs
 * - Checkpoint system includes LLM provider info
 * - Cost tracking per LLM provider
 * - Support for testing on small batches (--limit flag)
 * - Minimum 80% success rate per batch required
 *
 * USAGE:
 *   npx tsx scripts/enrich-attributes-multi-llm.ts [options]
 *
 * OPTIONS:
 *   --live              Apply changes (default: dry-run)
 *   --batch-size N      Products per LLM call (default: 20)
 *   --limit N           Maximum products to process
 *   --verbose           Show detailed LLM logs
 *
 * The script will automatically:
 * - Try OpenAI first for each batch
 * - Fallback to Anthropic if OpenAI fails validation
 * - Fallback to Gemini if Anthropic also fails
 * - Track complete failures (all 3 LLMs failed) for end-of-run review
 * - Save checkpoints every 100 products with provider info
 * - Resume from where it left off
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
}

interface AttributeResult {
  productId: string;
  attributes: Record<string, boolean>;
}

interface BatchResult {
  results: AttributeResult[];
  provider: 'openai' | 'anthropic' | 'gemini';
  tokens: number;
  success: boolean;
}

interface FailedBatch {
  batchNumber: number;
  productIds: string[];
  attempts: {
    provider: 'openai' | 'anthropic' | 'gemini';
    error: string;
    successRate: number;
  }[];
  timestamp: string;
}

interface ProviderStats {
  batches: number;
  products: number;
  tokens: number;
  cost: number;
  failures: number;
}

interface Stats {
  totalInDb: number;
  needsAttributes: number;
  processedThisRun: number;
  attributesSet: number;
  tokensUsed: number;
  estimatedCost: number;
  errors: number;
  startTime: number;
  lastCheckpoint: number;
  providerStats: Record<'openai' | 'anthropic' | 'gemini', ProviderStats>;
  batchesByProvider: Record<'openai' | 'anthropic' | 'gemini', number>;
  completeFailures: number;
}

interface Checkpoint {
  lastProcessedId: string | null;
  processedCount: number;
  stats: Stats;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHECKPOINT_FILE = path.join(process.cwd(), 'data', '.enrich-attributes-multi-llm-checkpoint.json');
const FAILURES_FILE = path.join(process.cwd(), 'data', '.enrich-attributes-multi-llm-failures.json');

const GIFT_ATTRIBUTES = [
  'isExperiential', 'isMemoryMaking', 'isSentimental', 'isPersonalized',
  'isPractical', 'isLuxury', 'isConsumable', 'isArtistic', 'isMinimalist',
  'isShared', 'isConversationStarter', 'isEducational', 'isHandcrafted',
  'isLastingValue', 'isEcoFriendly',
] as const;

// Pricing per 1M tokens
const PROVIDER_COSTS = {
  openai: { input: 0.15, output: 0.60 },      // GPT-4o-mini
  anthropic: { input: 0.25, output: 1.25 },   // Claude Haiku
  gemini: { input: 0.075, output: 0.30 },     // Gemini 2.0 Flash
};

// Minimum success rate for batch validation
const MIN_BATCH_SUCCESS_RATE = 0.80; // 80%

// ============================================================================
// LLM CLIENT INITIALIZATION
// ============================================================================

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function initClients() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  if (!geminiClient && (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)) {
    geminiClient = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ''
    );
  }
}

// ============================================================================
// CHECKPOINT & FAILURE TRACKING
// ============================================================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load checkpoint, starting fresh'));
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  try {
    const dir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to save checkpoint'));
  }
}

function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    // Ignore
  }
}

let failedBatches: FailedBatch[] = [];

function loadFailures(): FailedBatch[] {
  try {
    if (fs.existsSync(FAILURES_FILE)) {
      return JSON.parse(fs.readFileSync(FAILURES_FILE, 'utf-8'));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load failures file'));
  }
  return [];
}

function saveFailures(): void {
  try {
    const dir = path.dirname(FAILURES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FAILURES_FILE, JSON.stringify(failedBatches, null, 2));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to save failures file'));
  }
}

function recordFailedBatch(
  batchNumber: number,
  products: Product[],
  attempts: FailedBatch['attempts']
): void {
  failedBatches.push({
    batchNumber,
    productIds: products.map(p => p.id),
    attempts,
    timestamp: new Date().toISOString(),
  });
  saveFailures();
}

// ============================================================================
// LLM ENRICHMENT
// ============================================================================

function generateBatchPrompt(products: Product[]): string {
  const productList = products.map((p, idx) => {
    const desc = (p.description || '').substring(0, 300);
    const priceInfo = p.price ? ` ($${p.price})` : '';
    return `${idx + 1}. "${p.title}"${priceInfo} - ${desc}`;
  }).join('\n\n');

  return `Analyze these ${products.length} products and identify their gift attributes.

PRODUCTS:
${productList}

For EACH product, identify which attributes apply (set to true only if clearly applicable):

ATTRIBUTES:
- isExperiential: Experiences, events, classes, tickets, subscriptions
- isMemoryMaking: Photo albums, memory books, keepsakes, commemorative items
- isSentimental: Meaningful, heartfelt, touching, emotional gifts
- isPersonalized: Custom, engraved, monogrammed, bespoke items
- isPractical: Useful, everyday, functional, utility items
- isLuxury: Premium, high-end, deluxe, exclusive items (or price >= $100)
- isConsumable: Food, drinks, candles, beauty products, bath items
- isArtistic: Art, sculptures, paintings, creative items
- isMinimalist: Simple, clean, understated design
- isShared: Items for sharing, group activities, social gatherings
- isConversationStarter: Unique, unusual, quirky, interesting
- isEducational: Books, courses, tutorials, learning materials
- isHandcrafted: Handmade, artisan, crafted items
- isLastingValue: Heirloom quality, timeless, durable, investment pieces
- isEcoFriendly: Sustainable, organic, recycled, ethical, eco materials

Return JSON array (same order as products):
[{"productIndex":1,"attributes":{"isPractical":true,"isLuxury":false}}]

Return exactly ${products.length} objects. Only include attributes that are true.`;
}

/**
 * Call OpenAI for batch enrichment
 */
async function callOpenAI(
  prompt: string,
  verbose: boolean
): Promise<{ response: string; tokens: number }> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  if (verbose) {
    console.log(chalk.gray(`  [OpenAI] Calling GPT-4o-mini...`));
  }

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Calculate actual tokens from usage
  const tokens = response.usage
    ? response.usage.prompt_tokens + response.usage.completion_tokens
    : Math.ceil((prompt.length + content.length) / 4);

  return { response: content, tokens };
}

/**
 * Call Anthropic for batch enrichment
 */
async function callAnthropic(
  prompt: string,
  verbose: boolean
): Promise<{ response: string; tokens: number }> {
  if (!anthropicClient) {
    throw new Error('Anthropic client not initialized');
  }

  if (verbose) {
    console.log(chalk.gray(`  [Anthropic] Calling Claude Haiku...`));
  }

  const response = await anthropicClient.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Anthropic');
  }

  // Calculate tokens from usage
  const tokens = response.usage
    ? response.usage.input_tokens + response.usage.output_tokens
    : Math.ceil((prompt.length + textBlock.text.length) / 4);

  return { response: textBlock.text, tokens };
}

/**
 * Call Gemini for batch enrichment
 */
async function callGemini(
  prompt: string,
  verbose: boolean
): Promise<{ response: string; tokens: number }> {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized');
  }

  if (verbose) {
    console.log(chalk.gray(`  [Gemini] Calling Gemini 2.0 Flash...`));
  }

  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const content = result.response.text();

  if (!content) {
    throw new Error('No response from Gemini');
  }

  // Estimate tokens (Gemini doesn't provide usage in free tier)
  const tokens = Math.ceil((prompt.length + content.length) / 4);

  return { response: content, tokens };
}

/**
 * Parse LLM response into AttributeResult array
 */
function parseLLMResponse(
  response: string,
  products: Product[],
  verbose: boolean
): AttributeResult[] {
  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch (parseError) {
    if (verbose) {
      console.error(chalk.red(`  [Parse] JSON parse error: ${parseError}`));
      console.error(chalk.gray(`  [Parse] Raw response: ${response.substring(0, 500)}`));
    }
    throw new Error(`Failed to parse LLM response: ${parseError}`);
  }

  if (verbose) {
    console.log(chalk.gray(`  [Parse] Response type: ${Array.isArray(parsed) ? 'array' : 'object'}`));
  }

  // Handle different response formats from LLM
  let responseArray: any[];
  if (Array.isArray(parsed)) {
    responseArray = parsed;
  } else if (parsed.products && Array.isArray(parsed.products)) {
    responseArray = parsed.products;
  } else if (parsed.results && Array.isArray(parsed.results)) {
    responseArray = parsed.results;
  } else if (parsed.productIndex !== undefined && parsed.attributes !== undefined) {
    // Handle single product object response - wrap it in an array
    if (verbose) {
      console.log(chalk.yellow(`  [Parse] Received single product object, wrapping in array`));
    }
    responseArray = [parsed];
  } else {
    // If we got an object with keys, try to extract an array
    const keys = Object.keys(parsed);
    if (keys.length > 0 && Array.isArray(parsed[keys[0]])) {
      responseArray = parsed[keys[0]];
    } else {
      throw new Error(`Unexpected LLM response format: ${JSON.stringify(parsed).substring(0, 200)}`);
    }
  }

  if (verbose) {
    console.log(chalk.gray(`  [Parse] Received ${responseArray.length} results (expected ${products.length})`));
  }

  const results: AttributeResult[] = [];

  for (let i = 0; i < products.length; i++) {
    const llmResult = responseArray[i] || {};
    const attributes: Record<string, boolean> = {};

    // Handle both direct attributes and nested attributes structure
    const attrSource = llmResult.attributes || llmResult;

    if (attrSource && typeof attrSource === 'object') {
      for (const attr of GIFT_ATTRIBUTES) {
        if (attrSource[attr] === true) {
          attributes[attr] = true;
        }
      }
    }

    results.push({
      productId: products[i].id,
      attributes,
    });
  }

  return results;
}

/**
 * Check if attribute result has actual data (not empty)
 */
function hasValidAttributes(result: AttributeResult): boolean {
  return Object.keys(result.attributes).length > 0;
}

/**
 * Validate batch success rate
 */
function validateBatchSuccess(
  results: AttributeResult[],
  minRate: number = MIN_BATCH_SUCCESS_RATE
): { valid: boolean; successRate: number; validCount: number } {
  const validCount = results.filter(hasValidAttributes).length;
  const successRate = validCount / results.length;
  const valid = successRate >= minRate;

  return { valid, successRate, validCount };
}

/**
 * Enrich batch with multi-LLM fallback
 * Tries: OpenAI → Anthropic → Gemini
 * Moves to next LLM immediately on validation failure
 */
async function enrichAttributesBatchWithFallback(
  products: Product[],
  verbose: boolean,
  stats: Stats,
  batchNum: number
): Promise<BatchResult> {
  const prompt = generateBatchPrompt(products);
  const providers: Array<'openai' | 'anthropic' | 'gemini'> = ['openai', 'anthropic', 'gemini'];
  const attemptLog: FailedBatch['attempts'] = [];

  for (const provider of providers) {
    // Check if provider is available
    if (provider === 'openai' && !openaiClient) continue;
    if (provider === 'anthropic' && !anthropicClient) continue;
    if (provider === 'gemini' && !geminiClient) continue;

    try {
      if (verbose) {
        console.log(chalk.gray(`  [Batch ${batchNum}] Trying ${provider}...`));
      }

      // Call the LLM
      let llmResponse: { response: string; tokens: number };
      switch (provider) {
        case 'openai':
          llmResponse = await callOpenAI(prompt, verbose);
          break;
        case 'anthropic':
          llmResponse = await callAnthropic(prompt, verbose);
          break;
        case 'gemini':
          llmResponse = await callGemini(prompt, verbose);
          break;
      }

      // Parse response
      const results = parseLLMResponse(llmResponse.response, products, verbose);

      // Validate batch success
      const validation = validateBatchSuccess(results, MIN_BATCH_SUCCESS_RATE);

      if (!validation.valid) {
        attemptLog.push({
          provider,
          error: 'Batch validation failed',
          successRate: validation.successRate,
        });

        if (verbose) {
          console.log(
            chalk.yellow(
              `  [${provider}] Validation failed: ${(validation.successRate * 100).toFixed(1)}% ` +
              `(required: ${MIN_BATCH_SUCCESS_RATE * 100}%) - ${validation.validCount}/${results.length} valid`
            )
          );
        }

        // Update provider failure stats
        stats.providerStats[provider].failures++;

        // Try next provider
        continue;
      }

      // Success! Update stats
      stats.tokensUsed += llmResponse.tokens;
      stats.providerStats[provider].batches++;
      stats.providerStats[provider].products += products.length;
      stats.providerStats[provider].tokens += llmResponse.tokens;
      stats.batchesByProvider[provider]++;

      // Calculate cost (estimate input/output split: 60/40)
      const inputTokens = Math.ceil(llmResponse.tokens * 0.6);
      const outputTokens = Math.ceil(llmResponse.tokens * 0.4);
      const cost = (
        (inputTokens * PROVIDER_COSTS[provider].input +
        outputTokens * PROVIDER_COSTS[provider].output) / 1_000_000
      );
      stats.providerStats[provider].cost += cost;
      stats.estimatedCost += cost;

      if (verbose) {
        console.log(
          chalk.green(
            `  [${provider}] Success: ${validation.validCount}/${results.length} valid ` +
            `(${(validation.successRate * 100).toFixed(1)}%)`
          )
        );
      }

      return {
        results,
        provider,
        tokens: llmResponse.tokens,
        success: true,
      };

    } catch (error: any) {
      attemptLog.push({
        provider,
        error: error.message || 'Unknown error',
        successRate: 0,
      });

      stats.providerStats[provider].failures++;

      if (verbose) {
        console.log(chalk.red(`  [${provider}] Error: ${error.message}`));
      }

      // Try next provider
      continue;
    }
  }

  // All providers failed - record as complete failure
  stats.errors++;
  stats.completeFailures++;
  recordFailedBatch(batchNum, products, attemptLog);

  console.error(
    chalk.red(
      `\n❌ Batch #${batchNum} failed with ALL providers (${providers.join(', ')})`
    )
  );

  // Return empty results to continue processing
  return {
    results: products.map(p => ({ productId: p.id, attributes: {} })),
    provider: 'openai', // Doesn't matter
    tokens: 0,
    success: false,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Convert camelCase attribute names to snake_case for Neo4j
 */
function convertToSnakeCase(attributes: Record<string, boolean>): Record<string, boolean> {
  const snakeCased: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCased[snakeKey] = value;
  }
  return snakeCased;
}

async function saveAttributesToNeo4j(
  productId: string,
  attributes: Record<string, boolean>,
  dryRun: boolean
): Promise<void> {
  if (dryRun || Object.keys(attributes).length === 0) return;

  const driver = getDriver();
  const session = driver.session();

  try {
    const snakeCasedAttributes = convertToSnakeCase(attributes);

    await session.run(
      `MATCH (p:Product {id: $productId})
       SET p += $attributes,
           p.attributes_updated_at = datetime()`,
      { productId, attributes: snakeCasedAttributes }
    );
  } finally {
    await session.close();
  }
}

async function countProductsNeedingAttributes(): Promise<{ total: number; needsAttributes: number }> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (p2:Product)
      WHERE p2.is_practical IS NULL
      RETURN total, count(p2) as needsAttributes
    `);

    const record = result.records[0];
    const total = record.get('total');
    const needsAttributes = record.get('needsAttributes');
    return {
      total: typeof total === 'object' && total.toNumber ? total.toNumber() : Number(total),
      needsAttributes: typeof needsAttributes === 'object' && needsAttributes.toNumber ? needsAttributes.toNumber() : Number(needsAttributes),
    };
  } finally {
    await session.close();
  }
}

async function fetchProductsNeedingAttributes(
  limit: number,
  afterId?: string | null
): Promise<Product[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const query = `
      MATCH (p:Product)
      WHERE ${afterId ? 'p.id > $afterId AND' : ''}
            p.is_practical IS NULL
      WITH p ORDER BY p.id
      LIMIT toInteger($limit)
      RETURN p.id AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             p.vendor AS vendor
    `;

    const result = await session.run(query, { limit: Math.floor(limit), afterId: afterId || '' });

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
      price: r.get('price'),
      vendor: r.get('vendor'),
    }));
  } finally {
    await session.close();
  }
}

async function verifyAttributeCoverage(): Promise<{
  total: number;
  withAttributes: number;
  coverage: number;
}> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (all:Product)
      WITH total,
           sum(CASE WHEN all.is_practical IS NOT NULL THEN 1 ELSE 0 END) as withAttributes
      RETURN total, withAttributes
    `);

    const record = result.records[0];
    const total = typeof record.get('total') === 'object'
      ? record.get('total').toNumber()
      : Number(record.get('total'));
    const withAttributes = typeof record.get('withAttributes') === 'object'
      ? record.get('withAttributes').toNumber()
      : Number(record.get('withAttributes'));

    return {
      total,
      withAttributes,
      coverage: total > 0 ? (withAttributes / total) * 100 : 0,
    };
  } finally {
    await session.close();
  }
}

// ============================================================================
// MAIN ENRICHMENT LOOP
// ============================================================================

async function runEnrichment(options: {
  dryRun: boolean;
  batchSize: number;
  limit?: number;
  verbose: boolean;
}) {
  const spinner = ora('Initializing...').start();

  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  MULTI-LLM ATTRIBUTE ENRICHMENT'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

  console.log(`Mode: ${options.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`Fallback strategy: ${chalk.cyan('OpenAI → Anthropic → Gemini')}`);
  console.log(`Batch size: ${chalk.white(options.batchSize)}`);
  console.log(`Min success rate: ${chalk.white((MIN_BATCH_SUCCESS_RATE * 100) + '%')}`);
  if (options.limit) {
    console.log(`Limit: ${chalk.white(options.limit)} products`);
  }

  // Initialize clients
  initClients();

  // Show available providers
  const availableProviders = [];
  if (openaiClient) availableProviders.push(chalk.green('OpenAI ✓'));
  else availableProviders.push(chalk.red('OpenAI ✗'));
  if (anthropicClient) availableProviders.push(chalk.green('Anthropic ✓'));
  else availableProviders.push(chalk.red('Anthropic ✗'));
  if (geminiClient) availableProviders.push(chalk.green('Gemini ✓'));
  else availableProviders.push(chalk.red('Gemini ✗'));

  console.log(`Providers: ${availableProviders.join(' | ')}`);
  console.log();

  // Load checkpoint
  let checkpoint = loadCheckpoint();
  if (checkpoint) {
    spinner.succeed(`Resumed from checkpoint (${checkpoint.processedCount} products already processed)`);
  }

  // Load previous failures
  failedBatches = loadFailures();
  if (failedBatches.length > 0) {
    console.log(chalk.yellow(`⚠️  Loaded ${failedBatches.length} previously failed batches`));
  }

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  // Get counts
  spinner.text = 'Counting products...';
  const counts = await countProductsNeedingAttributes();

  // Initialize stats
  const stats: Stats = checkpoint?.stats || {
    totalInDb: counts.total,
    needsAttributes: counts.needsAttributes,
    processedThisRun: 0,
    attributesSet: 0,
    tokensUsed: 0,
    estimatedCost: 0,
    errors: 0,
    startTime: Date.now(),
    lastCheckpoint: Date.now(),
    providerStats: {
      openai: { batches: 0, products: 0, tokens: 0, cost: 0, failures: 0 },
      anthropic: { batches: 0, products: 0, tokens: 0, cost: 0, failures: 0 },
      gemini: { batches: 0, products: 0, tokens: 0, cost: 0, failures: 0 },
    },
    batchesByProvider: {
      openai: 0,
      anthropic: 0,
      gemini: 0,
    },
    completeFailures: 0,
  };

  console.log(chalk.bold('\nDatabase Status:'));
  console.log(`  Total products: ${chalk.white(counts.total.toLocaleString())}`);
  console.log(`  With attributes: ${chalk.green((counts.total - counts.needsAttributes).toLocaleString())}`);
  console.log(`  Needs attributes: ${chalk.yellow(counts.needsAttributes.toLocaleString())}`);

  if (counts.needsAttributes === 0) {
    spinner.succeed(chalk.green('All products already have attributes!'));
    await closeNeo4j();
    return;
  }

  console.log(chalk.bold('\n🚀 Starting attribute enrichment with multi-LLM fallback...\n'));

  let lastProcessedId = checkpoint?.lastProcessedId || null;
  let totalProcessed = checkpoint?.processedCount || 0;
  const maxToProcess = options.limit || counts.needsAttributes;

  try {
    // Main loop
    while (totalProcessed < maxToProcess) {
      // Fetch next batch
      const remaining = maxToProcess - totalProcessed;
      const fetchLimit = Math.min(options.batchSize * 2, remaining);

      spinner.text = `Fetching products (${totalProcessed}/${maxToProcess})...`;
      const products = await fetchProductsNeedingAttributes(fetchLimit, lastProcessedId);

      if (products.length === 0) {
        spinner.succeed(chalk.green('No more products to process!'));
        break;
      }

      // Process in batches
      for (let i = 0; i < products.length; i += options.batchSize) {
        const batch = products.slice(i, Math.min(i + options.batchSize, products.length));
        const batchNum = Math.floor(totalProcessed / options.batchSize) + 1;

        spinner.start(`Processing batch #${batchNum} (${batch.length} products)...`);

        try {
          // Call LLM with multi-provider fallback
          const batchResult = await enrichAttributesBatchWithFallback(
            batch,
            options.verbose,
            stats,
            batchNum
          );

          // Save results (even if batch failed - may have partial data)
          let attributesInBatch = 0;
          for (const result of batchResult.results) {
            await saveAttributesToNeo4j(result.productId, result.attributes, options.dryRun);
            const attrCount = Object.keys(result.attributes).length;
            stats.attributesSet += attrCount;
            if (attrCount > 0) {
              attributesInBatch++;
            }
          }

          totalProcessed += batch.length;
          stats.processedThisRun += batch.length;

          // Update last processed ID
          lastProcessedId = batch[batch.length - 1].id;

          // Calculate stats
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.processedThisRun / elapsed;
          const validation = validateBatchSuccess(batchResult.results);

          const statusIcon = batchResult.success ? '✓' : '✗';
          const statusColor = batchResult.success ? chalk.green : chalk.red;

          spinner.succeed(
            `Batch #${batchNum} ${statusIcon}: ${statusColor(validation.validCount)}/${batch.length} products ` +
            `(${chalk.cyan((validation.successRate * 100).toFixed(1))}%) via ${chalk.magenta(batchResult.provider)} | ` +
            `Total: ${chalk.white(totalProcessed)}/${maxToProcess} | ` +
            `Rate: ${chalk.white(rate.toFixed(1))}/s | ` +
            `Cost: ${chalk.yellow('$' + stats.estimatedCost.toFixed(4))}`
          );

          if (options.verbose) {
            console.log(chalk.gray(`  Attributes added: ${attributesInBatch} products`));
          }

          // Save checkpoint every 100 products
          if (totalProcessed % 100 < batch.length && !options.dryRun) {
            saveCheckpoint({
              lastProcessedId,
              processedCount: totalProcessed,
              stats,
              timestamp: new Date().toISOString(),
            });
            console.log(chalk.gray(`  💾 Checkpoint saved`));
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
          spinner.fail(`Batch #${batchNum} failed: ${error.message}`);

          // Save checkpoint on error
          if (!options.dryRun) {
            saveCheckpoint({
              lastProcessedId,
              processedCount: totalProcessed,
              stats,
              timestamp: new Date().toISOString(),
            });
            console.log(chalk.yellow('\n💾 Progress saved. Re-run to continue from checkpoint.'));
          }

          throw error;
        }
      }
    }

    // Verify coverage
    spinner.start('Verifying attribute coverage...');
    const coverage = await verifyAttributeCoverage();
    spinner.succeed('Coverage verification complete');

    // Final summary
    const totalDuration = (Date.now() - stats.startTime) / 1000;

    console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  ENRICHMENT COMPLETE'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

    console.log(chalk.bold.white('Coverage in Database:'));
    console.log(`  Products with attributes: ${chalk.green(coverage.withAttributes.toLocaleString())} / ${coverage.total.toLocaleString()} (${chalk.cyan(coverage.coverage.toFixed(1))}%)`);
    console.log();

    console.log(chalk.white('Processing:'));
    console.log(`  Products processed: ${chalk.green(stats.processedThisRun.toLocaleString())}`);
    console.log(`  Attributes added: ${chalk.green(stats.attributesSet.toLocaleString())}`);
    console.log(`  Complete failures: ${stats.completeFailures > 0 ? chalk.red(stats.completeFailures) : chalk.green(stats.completeFailures)}`);
    console.log(`  Errors: ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green(stats.errors)}`);

    console.log(chalk.white('\nProvider Usage:'));
    const providers: Array<'openai' | 'anthropic' | 'gemini'> = ['openai', 'anthropic', 'gemini'];
    for (const provider of providers) {
      const pStats = stats.providerStats[provider];
      if (pStats.batches > 0 || pStats.failures > 0) {
        console.log(`  ${provider.toUpperCase()}:`);
        console.log(`    Batches: ${chalk.green(pStats.batches)} (failures: ${pStats.failures > 0 ? chalk.red(pStats.failures) : chalk.green(pStats.failures)})`);
        console.log(`    Products: ${chalk.green(pStats.products.toLocaleString())}`);
        console.log(`    Tokens: ${chalk.cyan(pStats.tokens.toLocaleString())}`);
        console.log(`    Cost: ${chalk.yellow('$' + pStats.cost.toFixed(4))}`);
      }
    }

    console.log(chalk.white('\nTotal:'));
    console.log(`  Tokens: ${chalk.green(stats.tokensUsed.toLocaleString())}`);
    console.log(`  Estimated cost: ${chalk.green('$' + stats.estimatedCost.toFixed(4))}`);

    console.log(chalk.white('\nPerformance:'));
    console.log(`  Total time: ${chalk.green(formatDuration(totalDuration))}`);
    console.log(`  Rate: ${chalk.green((stats.processedThisRun / totalDuration).toFixed(1))} products/s`);

    if (stats.completeFailures > 0) {
      console.log(chalk.yellow(`\n⚠️  ${stats.completeFailures} batches failed with all providers`));
      console.log(chalk.yellow(`   See ${FAILURES_FILE} for details`));
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes saved'));
    } else {
      console.log(chalk.green('\n✅ All changes saved to database'));
      clearCheckpoint();
    }

  } catch (error) {
    spinner.fail('Enrichment failed');
    console.error(chalk.red('\n❌ Error:'), error);
  } finally {
    await closeNeo4j();
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ${Math.floor(seconds%60)}s`;
  return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`;
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

const options = {
  dryRun: !args.includes('--live'),
  batchSize: args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 20,
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  verbose: args.includes('--verbose'),
};

runEnrichment(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
