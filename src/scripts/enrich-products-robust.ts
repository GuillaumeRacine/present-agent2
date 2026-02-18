#!/usr/bin/env tsx
/**
 * ROBUST Product Enrichment Script - Runs to Completion
 *
 * This script enriches ALL products with interests, occasions, and gift attributes
 * using a multi-provider strategy with automatic failover and retry logic.
 *
 * KEY IMPROVEMENTS over enrich-products-hybrid.ts:
 * - Multi-provider failover: Gemini (cheapest) → OpenAI → Anthropic
 * - Exponential backoff with jitter for rate limits (429 errors)
 * - Efficient checkpoint: uses database cursor, not 580KB JSON
 * - Continuous operation: runs until ALL products are enriched
 * - Automatic retry: failed batches retry with different provider
 * - Clear progress: real-time stats, ETA, and cost tracking
 *
 * USAGE:
 *   npx tsx scripts/enrich-products-robust.ts [options]
 *
 * OPTIONS:
 *   --live              Apply changes (default: dry-run)
 *   --batch-size N      Products per LLM call (default: 15)
 *   --concurrency N     Parallel batches (default: 3)
 *   --verbose           Show detailed LLM logs
 *
 * The script will run until all products are enriched. It automatically:
 * - Saves checkpoints every 100 products
 * - Retries on rate limits with exponential backoff
 * - Switches providers on persistent failures
 * - Resumes from where it left off
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { chatCompletion } from '../src/lib/llm.js';
import { normalizeInterest, expandInterests, INTEREST_TAXONOMY } from '../src/lib/interest-synonyms.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
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
  currentInterests: string[];
  currentOccasions: string[];
  hasAttributes: boolean;
}

interface EnrichmentResult {
  productId: string;
  interests: string[];
  occasions: string[];
  attributes: Record<string, boolean>;
}

interface ProviderConfig {
  name: string;
  available: boolean;
  costPer1kProducts: number;
  maxRetries: number;
  consecutiveFailures: number;
  cooldownUntil: number;
}

interface Stats {
  totalInDb: number;
  alreadyEnriched: number;
  processedThisRun: number;
  heuristicOnly: number;
  llmEnriched: number;
  interestsAdded: number;
  occasionsAdded: number;
  attributesSet: number;
  tokensUsed: number;
  estimatedCost: number;
  errors: number;
  startTime: number;
  lastCheckpoint: number;
  providerUsage: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHECKPOINT_FILE = path.join(process.cwd(), 'data', '.enrichment-robust-checkpoint.json');

const OCCASIONS = [
  'birthday', 'christmas', 'anniversary', 'wedding', 'valentines_day',
  'mothers_day', 'fathers_day', 'graduation', 'housewarming',
  'thank_you', 'get_well', 'congratulations', 'retirement',
] as const;

const GIFT_ATTRIBUTES = [
  'isExperiential', 'isMemoryMaking', 'isSentimental', 'isPersonalized',
  'isPractical', 'isLuxury', 'isConsumable', 'isArtistic', 'isMinimalist',
  'isShared', 'isConversationStarter', 'isEducational', 'isHandcrafted',
  'isLastingValue', 'isEcoFriendly',
] as const;

// Pricing per 1M tokens (input weighted 60%, output 40%)
const PROVIDER_COSTS = {
  gemini: 0.075,    // Cheapest - $0.075/1M input, $0.30/1M output
  openai: 0.15,     // Middle - $0.15/1M input, $0.60/1M output
  anthropic: 0.25,  // Most expensive - $0.25/1M input, $1.25/1M output (Haiku)
};

// ============================================================================
// PROVIDER MANAGEMENT
// ============================================================================

// Initialize providers
const geminiClient = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '')
  : null;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const providers: Record<string, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    available: !!geminiClient,
    costPer1kProducts: PROVIDER_COSTS.gemini * 500, // ~500 tokens per product
    maxRetries: 3,
    consecutiveFailures: 0,
    cooldownUntil: 0,
  },
  openai: {
    name: 'openai',
    available: !!process.env.OPENAI_API_KEY,
    costPer1kProducts: PROVIDER_COSTS.openai * 500,
    maxRetries: 3,
    consecutiveFailures: 0,
    cooldownUntil: 0,
  },
  anthropic: {
    name: 'anthropic',
    available: !!anthropicClient,
    costPer1kProducts: PROVIDER_COSTS.anthropic * 500,
    maxRetries: 3,
    consecutiveFailures: 0,
    cooldownUntil: 0,
  },
};

/**
 * Select the best available provider (cheapest that's not on cooldown)
 */
function selectProvider(): string | null {
  const now = Date.now();
  const available = Object.values(providers)
    .filter(p => p.available && p.cooldownUntil < now)
    .sort((a, b) => a.costPer1kProducts - b.costPer1kProducts);

  return available.length > 0 ? available[0].name : null;
}

/**
 * Mark provider as failed and put on cooldown if needed
 */
function markProviderFailed(providerName: string, error: any): void {
  const provider = providers[providerName];
  if (!provider) return;

  provider.consecutiveFailures++;

  // Check if rate limited (429)
  const isRateLimit = error?.status === 429 ||
    error?.message?.includes('429') ||
    error?.message?.toLowerCase().includes('rate limit') ||
    error?.message?.toLowerCase().includes('quota');

  if (isRateLimit || provider.consecutiveFailures >= provider.maxRetries) {
    // Exponential cooldown: 30s, 60s, 120s, 240s
    const cooldownMs = Math.min(30000 * Math.pow(2, provider.consecutiveFailures - 1), 300000);
    provider.cooldownUntil = Date.now() + cooldownMs;
    console.log(chalk.yellow(`\n⏸️  ${providerName} on cooldown for ${cooldownMs/1000}s (${isRateLimit ? 'rate limit' : 'failures'})`));
  }
}

/**
 * Mark provider as successful - reset failure count
 */
function markProviderSuccess(providerName: string): void {
  const provider = providers[providerName];
  if (provider) {
    provider.consecutiveFailures = 0;
  }
}

// ============================================================================
// LLM CALLS WITH RETRY
// ============================================================================

async function callGemini(prompt: string): Promise<string> {
  if (!geminiClient) throw new Error('Gemini not available');

  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.0-flash', // Fixed: correct model name (was gemini-1.5-flash-latest which doesn't exist)
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    }
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callOpenAI(prompt: string): Promise<string> {
  return await chatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    jsonMode: true,
  });
}

async function callAnthropic(prompt: string): Promise<string> {
  if (!anthropicClient) throw new Error('Anthropic not available');

  const response = await anthropicClient.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Call LLM with automatic retry and provider failover
 */
async function callLLMWithRetry(
  prompt: string,
  maxAttempts: number = 5,
  verbose: boolean = false
): Promise<{ response: string; provider: string; tokens: number }> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const providerName = selectProvider();

    if (!providerName) {
      // All providers on cooldown - wait for shortest cooldown
      const shortestCooldown = Math.min(
        ...Object.values(providers)
          .filter(p => p.available)
          .map(p => p.cooldownUntil - Date.now())
      );

      if (shortestCooldown > 0) {
        console.log(chalk.gray(`\n⏳ All providers cooling down. Waiting ${Math.ceil(shortestCooldown/1000)}s...`));
        await sleep(shortestCooldown + 1000);
        continue;
      }
    }

    if (!providerName) {
      throw new Error('No LLM providers available');
    }

    try {
      if (verbose) {
        console.log(chalk.gray(`  [Attempt ${attempt + 1}/${maxAttempts}] Using ${providerName}...`));
      }

      let response: string;
      switch (providerName) {
        case 'gemini':
          response = await callGemini(prompt);
          break;
        case 'anthropic':
          response = await callAnthropic(prompt);
          break;
        default:
          response = await callOpenAI(prompt);
      }

      markProviderSuccess(providerName);

      // Estimate tokens
      const tokens = Math.ceil((prompt.length + response.length) / 4);

      return { response, provider: providerName, tokens };

    } catch (error: any) {
      lastError = error;
      markProviderFailed(providerName, error);

      if (verbose) {
        console.log(chalk.red(`  [${providerName}] Error: ${error.message}`));
      }

      // Exponential backoff with jitter
      const baseDelay = 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      await sleep(baseDelay + jitter);
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CHECKPOINT MANAGEMENT (Efficient - uses DB cursor)
// ============================================================================

interface Checkpoint {
  lastProcessedId: string | null;
  processedCount: number;
  stats: Stats;
  timestamp: string;
}

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

// ============================================================================
// HEURISTIC ENRICHMENT (Fast, Zero-Cost)
// ============================================================================

function extractInterestsHeuristic(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();

  for (const [canonical, terms] of Object.entries(INTEREST_TAXONOMY)) {
    for (const term of terms) {
      const regex = new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        found.add(canonical);
        break;
      }
    }
  }

  return Array.from(found);
}

function extractOccasionsHeuristic(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();

  if (/\b(birthday|b-day|bday|turning\s+\d+)\b/.test(text)) found.add('birthday');
  if (/\b(christmas|xmas|holiday|holidays)\b/.test(text)) found.add('christmas');
  if (/\b(anniversary|years together|romantic)\b/.test(text)) found.add('anniversary');
  if (/\b(wedding|bride|groom|bridal)\b/.test(text)) found.add('wedding');
  if (/\b(valentine|valentine's|love\s+gift)\b/.test(text)) found.add('valentines_day');
  if (/\b(mother'?s\s+day|mom|mum)\b/.test(text)) found.add('mothers_day');
  if (/\b(father'?s\s+day|dad)\b/.test(text)) found.add('fathers_day');
  if (/\b(graduation|graduate|class of)\b/.test(text)) found.add('graduation');
  if (/\b(housewarming|new home|moving in)\b/.test(text)) found.add('housewarming');
  if (/\b(thank you|appreciation|gratitude)\b/.test(text)) found.add('thank_you');
  if (/\b(get well|recovery|feel better)\b/.test(text)) found.add('get_well');
  if (/\b(congratulations|congrats)\b/.test(text)) found.add('congratulations');
  if (/\b(retirement|retiree|retiring)\b/.test(text)) found.add('retirement');

  return Array.from(found);
}

function extractAttributesHeuristic(title: string, description: string, price?: number): Record<string, boolean> {
  const text = `${title} ${description}`.toLowerCase();
  const attrs: Record<string, boolean> = {};

  if (/(class|workshop|lesson|course|experience|ticket|event|subscription)/i.test(text)) attrs.isExperiential = true;
  if (/(photo|album|memory|keepsake|scrapbook|commemorative)/i.test(text)) attrs.isMemoryMaking = true;
  if (/(sentimental|meaningful|heartfelt|touching|emotional)/i.test(text)) attrs.isSentimental = true;
  if (/(personalized|personalised|custom|customized|monogram|engraved|bespoke)/i.test(text)) {
    attrs.isPersonalized = true;
    attrs.isSentimental = true;
  }
  if (/(practical|useful|everyday|utility|functional|tool|organizer)/i.test(text)) attrs.isPractical = true;
  if (/(luxury|premium|high-end|deluxe|exclusive|artisan|designer)/i.test(text)) attrs.isLuxury = true;
  if (/(food|wine|chocolate|coffee|tea|candle|beauty|cosmetic|bath|soap)/i.test(text)) attrs.isConsumable = true;
  if (/(art|artistic|sculpture|painting|print|canvas|gallery|creative)/i.test(text)) attrs.isArtistic = true;
  if (/(minimalist|minimal|simple|clean|understated)/i.test(text)) attrs.isMinimalist = true;
  if (/(share|shared|together|group|party|social|gathering)/i.test(text)) attrs.isShared = true;
  if (/(unique|unusual|quirky|interesting|conversation|distinctive)/i.test(text)) attrs.isConversationStarter = true;
  if (/(learn|educational|course|book|tutorial|teach|instruction)/i.test(text)) attrs.isEducational = true;
  if (/(handmade|hand-made|handcrafted|hand-crafted|artisan|craft)/i.test(text)) attrs.isHandcrafted = true;
  if (/(heirloom|timeless|durable|investment|quality|lifetime)/i.test(text)) attrs.isLastingValue = true;
  if (/(eco|sustainable|green|organic|recycled|ethical|bamboo|natural)/i.test(text)) attrs.isEcoFriendly = true;
  if (price !== undefined && price >= 100) attrs.isLuxury = true;

  return attrs;
}

function enrichProductHeuristic(product: Product): EnrichmentResult {
  return {
    productId: product.id,
    interests: extractInterestsHeuristic(product.title, product.description),
    occasions: extractOccasionsHeuristic(product.title, product.description),
    attributes: extractAttributesHeuristic(product.title, product.description, product.price),
  };
}

// ============================================================================
// LLM ENRICHMENT (Batched)
// ============================================================================

/**
 * Check if enrichment result has actual data (not empty)
 */
function hasValidEnrichment(result: EnrichmentResult): boolean {
  return result.interests.length > 0 ||
         result.occasions.length > 0 ||
         Object.keys(result.attributes).length > 0;
}

/**
 * Count products with valid enrichment in results array
 */
function countValidEnrichments(results: EnrichmentResult[]): number {
  return results.filter(hasValidEnrichment).length;
}

function generateBatchPrompt(products: Product[]): string {
  const productList = products.map((p, idx) =>
    `${idx + 1}. "${p.title}" - ${(p.description || '').substring(0, 250)}`
  ).join('\n\n');

  return `Analyze these ${products.length} products for gift-giving enrichment.

PRODUCTS:
${productList}

For EACH product, extract:
1. INTERESTS (3-8 terms): lowercase, singular (e.g., "coffee", "hiking", "photography")
2. OCCASIONS (1-3): ${OCCASIONS.join(', ')}
3. ATTRIBUTES: ${GIFT_ATTRIBUTES.join(', ')}

Return JSON array (same order as products):
[{"productIndex":1,"interests":["term1","term2"],"occasions":["birthday"],"attributes":{"isPractical":true}}]

Return exactly ${products.length} objects.`;
}

async function enrichProductsBatchLLM(
  products: Product[],
  verbose: boolean,
  stats: Stats
): Promise<EnrichmentResult[]> {
  const prompt = generateBatchPrompt(products);

  try {
    const { response, provider, tokens } = await callLLMWithRetry(prompt, 5, verbose);

    stats.tokensUsed += tokens;
    stats.providerUsage[provider] = (stats.providerUsage[provider] || 0) + products.length;

    // Calculate cost
    const costPerToken = PROVIDER_COSTS[provider as keyof typeof PROVIDER_COSTS] || 0.15;
    stats.estimatedCost += tokens * costPerToken / 1_000_000;

    const parsed = JSON.parse(response);
    const results: EnrichmentResult[] = [];

    for (let i = 0; i < products.length; i++) {
      const llmResult = parsed[i] || {};
      const rawInterests = llmResult.interests || [];
      const normalizedInterests = expandInterests(rawInterests);
      const occasions = (llmResult.occasions || []).filter((o: string) =>
        OCCASIONS.includes(o as typeof OCCASIONS[number])
      );

      const attributes: Record<string, boolean> = {};
      if (llmResult.attributes && typeof llmResult.attributes === 'object') {
        for (const attr of GIFT_ATTRIBUTES) {
          if (llmResult.attributes[attr] === true) {
            attributes[attr] = true;
          }
        }
      }

      results.push({
        productId: products[i].id,
        interests: normalizedInterests,
        occasions,
        attributes,
      });
    }

    return results;

  } catch (error: any) {
    stats.errors++;
    console.error(chalk.red(`\n❌ Batch enrichment failed: ${error.message}`));

    // BUG FIX #1: Don't return empty results - throw error to trigger retry at higher level
    // This prevents silent failures from being counted as "processed"
    throw error;
  }
}

/**
 * BUG FIX #1: Enrichment with automatic retry and provider failover
 * Will retry up to 3 times with different providers before giving up
 */
async function enrichProductsBatchWithRetry(
  products: Product[],
  verbose: boolean,
  stats: Stats,
  maxRetries: number = 3
): Promise<EnrichmentResult[]> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const results = await enrichProductsBatchLLM(products, verbose, stats);

      // Validate results - must have enriched at least 50% of products
      const validCount = countValidEnrichments(results);
      const successRate = validCount / products.length;

      if (successRate < 0.5) {
        throw new Error(`Low enrichment success rate: ${(successRate * 100).toFixed(1)}% (${validCount}/${products.length})`);
      }

      if (verbose || validCount < products.length) {
        console.log(chalk.gray(`  ✓ Enriched ${validCount}/${products.length} products`));
      }

      return results;

    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        console.log(chalk.yellow(`  ⚠️  Retry ${attempt + 1}/${maxRetries - 1}: ${error.message}`));
        // Wait before retry (exponential backoff)
        await sleep(2000 * Math.pow(2, attempt));
      } else {
        console.error(chalk.red(`  ❌ Failed after ${maxRetries} attempts`));
      }
    }
  }

  // After all retries failed, fall back to heuristic enrichment
  console.log(chalk.yellow(`  ⚠️  Falling back to heuristic enrichment for ${products.length} products`));
  return products.map(p => enrichProductHeuristic(p));
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function saveEnrichmentToNeo4j(
  productId: string,
  result: EnrichmentResult,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  const driver = getDriver();
  const session = driver.session();

  try {
    // Save interests
    if (result.interests.length > 0) {
      await session.run(
        `UNWIND $interests AS interestName
         MERGE (i:Interest {name: interestName})
         ON CREATE SET i.created_at = datetime()
         WITH i
         MATCH (p:Product {id: $productId})
         MERGE (p)-[r:MATCHES_INTEREST]->(i)
         SET r.extraction_method = 'robust_enrichment',
             r.updated_at = datetime()`,
        { productId, interests: result.interests }
      );
    }

    // Save occasions
    if (result.occasions.length > 0) {
      await session.run(
        `UNWIND $occasions AS occasionName
         MERGE (o:Occasion {name: occasionName})
         ON CREATE SET o.created_at = datetime()
         WITH o
         MATCH (p:Product {id: $productId})
         MERGE (p)-[:SUITABLE_FOR]->(o)`,
        { productId, occasions: result.occasions }
      );
    }

    // Save attributes
    if (Object.keys(result.attributes).length > 0) {
      await session.run(
        `MATCH (p:Product {id: $productId})
         SET p += $attributes,
             p.attributes_updated_at = datetime()`,
        { productId, attributes: result.attributes }
      );
    }
  } finally {
    await session.close();
  }
}

async function countProductsNeedingEnrichment(): Promise<{ total: number; needsEnrichment: number }> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (p2:Product)
      WHERE NOT (p2)-[:MATCHES_INTEREST]->(:Interest)
         OR size([(p2)-[:MATCHES_INTEREST]->() | 1]) < 2
      RETURN total, count(p2) as needsEnrichment
    `);

    const record = result.records[0];
    const total = record.get('total');
    const needsEnrichment = record.get('needsEnrichment');
    return {
      total: typeof total === 'object' && total.toNumber ? total.toNumber() : Number(total),
      needsEnrichment: typeof needsEnrichment === 'object' && needsEnrichment.toNumber ? needsEnrichment.toNumber() : Number(needsEnrichment),
    };
  } finally {
    await session.close();
  }
}

/**
 * BUG FIX #3: Verify actual enrichment coverage in Neo4j
 */
async function verifyEnrichmentCoverage(): Promise<{
  total: number;
  withInterests: number;
  withOccasions: number;
  withAttributes: number;
  interestsCoverage: number;
  occasionsCoverage: number;
  attributesCoverage: number;
}> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Product)
      WITH count(p) as total
      MATCH (all:Product)
      OPTIONAL MATCH (all)-[:MATCHES_INTEREST]->(:Interest)
      WITH total,
           all,
           count(DISTINCT all) as allProducts,
           size([(all)-[:MATCHES_INTEREST]->() | 1]) as interestCount
      WITH total,
           sum(CASE WHEN interestCount > 0 THEN 1 ELSE 0 END) as withInterests,
           sum(CASE WHEN size([(all)-[:SUITABLE_FOR]->() | 1]) > 0 THEN 1 ELSE 0 END) as withOccasions,
           sum(CASE WHEN all.isPractical IS NOT NULL THEN 1 ELSE 0 END) as withAttributes
      RETURN total,
             withInterests,
             withOccasions,
             withAttributes
    `);

    const record = result.records[0];
    const total = typeof record.get('total') === 'object'
      ? record.get('total').toNumber()
      : Number(record.get('total'));
    const withInterests = typeof record.get('withInterests') === 'object'
      ? record.get('withInterests').toNumber()
      : Number(record.get('withInterests'));
    const withOccasions = typeof record.get('withOccasions') === 'object'
      ? record.get('withOccasions').toNumber()
      : Number(record.get('withOccasions'));
    const withAttributes = typeof record.get('withAttributes') === 'object'
      ? record.get('withAttributes').toNumber()
      : Number(record.get('withAttributes'));

    return {
      total,
      withInterests,
      withOccasions,
      withAttributes,
      interestsCoverage: total > 0 ? (withInterests / total) * 100 : 0,
      occasionsCoverage: total > 0 ? (withOccasions / total) * 100 : 0,
      attributesCoverage: total > 0 ? (withAttributes / total) * 100 : 0,
    };
  } finally {
    await session.close();
  }
}

async function fetchProductsNeedingEnrichment(
  limit: number,
  afterId?: string | null
): Promise<Product[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Fetch products that need enrichment (< 2 interests OR no attributes)
    // Use neo4j.int() to ensure limit is treated as integer
    const query = `
      MATCH (p:Product)
      WHERE ${afterId ? 'p.id > $afterId AND' : ''}
            ((NOT (p)-[:MATCHES_INTEREST]->(:Interest)
             OR size([(p)-[:MATCHES_INTEREST]->() | 1]) < 2)
             OR p.isPractical IS NULL)
      WITH p ORDER BY p.id
      LIMIT toInteger($limit)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
      RETURN p.id AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             p.vendor AS vendor,
             COLLECT(DISTINCT i.name) AS interests,
             COLLECT(DISTINCT o.name) AS occasions,
             p.isPractical IS NOT NULL AS hasAttributes
    `;

    const result = await session.run(query, { limit: Math.floor(limit), afterId: afterId || '' });

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
      price: r.get('price'),
      vendor: r.get('vendor'),
      currentInterests: r.get('interests') || [],
      currentOccasions: r.get('occasions') || [],
      hasAttributes: r.get('hasAttributes'),
    }));
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
  concurrency: number;
  verbose: boolean;
}) {
  const spinner = ora('Initializing...').start();

  // Check available providers
  const availableProviders = Object.values(providers).filter(p => p.available);
  if (availableProviders.length === 0) {
    spinner.fail('No LLM providers available. Set GOOGLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.');
    return;
  }

  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  ROBUST PRODUCT ENRICHMENT - Runs to Completion'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

  console.log(`Mode: ${options.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`Providers: ${availableProviders.map(p => chalk.cyan(p.name)).join(', ')}`);
  console.log(`Batch size: ${chalk.white(options.batchSize)} | Concurrency: ${chalk.white(options.concurrency)}\n`);

  // Load checkpoint
  let checkpoint = loadCheckpoint();
  if (checkpoint) {
    spinner.succeed(`Resumed from checkpoint (${checkpoint.processedCount} products already processed)`);
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
  const counts = await countProductsNeedingEnrichment();

  // Initialize stats
  const stats: Stats = checkpoint?.stats || {
    totalInDb: counts.total,
    alreadyEnriched: counts.total - counts.needsEnrichment,
    processedThisRun: 0,
    heuristicOnly: 0,
    llmEnriched: 0,
    interestsAdded: 0,
    occasionsAdded: 0,
    attributesSet: 0,
    tokensUsed: 0,
    estimatedCost: 0,
    errors: 0,
    startTime: Date.now(),
    lastCheckpoint: Date.now(),
    providerUsage: {},
  };

  console.log(chalk.bold('\nDatabase Status:'));
  console.log(`  Total products: ${chalk.white(counts.total.toLocaleString())}`);
  console.log(`  Already enriched: ${chalk.green((counts.total - counts.needsEnrichment).toLocaleString())}`);
  console.log(`  Needs enrichment: ${chalk.yellow(counts.needsEnrichment.toLocaleString())}`);

  if (counts.needsEnrichment === 0) {
    spinner.succeed(chalk.green('All products are already enriched!'));
    await closeNeo4j();
    return;
  }

  console.log(chalk.bold('\n🚀 Starting enrichment...\n'));

  let lastProcessedId = checkpoint?.lastProcessedId || null;
  let totalProcessed = checkpoint?.processedCount || 0;
  const totalToProcess = counts.needsEnrichment;

  try {
    // Main loop - runs until all products are processed
    while (true) {
      // Fetch next batch of products
      spinner.text = `Fetching products (processed ${totalProcessed}/${totalToProcess})...`;
      const products = await fetchProductsNeedingEnrichment(
        options.batchSize * options.concurrency * 2, // Fetch 2x for buffer
        lastProcessedId
      );

      if (products.length === 0) {
        spinner.succeed(chalk.green('No more products to process!'));
        break;
      }

      // Process in batches with concurrency
      for (let i = 0; i < products.length; i += options.batchSize * options.concurrency) {
        const concurrentBatches: Product[][] = [];

        for (let j = 0; j < options.concurrency; j++) {
          const start = i + (j * options.batchSize);
          const end = Math.min(start + options.batchSize, products.length);
          if (start < products.length) {
            concurrentBatches.push(products.slice(start, end));
          }
        }

        // First, try heuristic enrichment
        const heuristicResults: EnrichmentResult[] = [];
        const needsLLM: Product[] = [];

        for (const batch of concurrentBatches) {
          for (const product of batch) {
            const result = enrichProductHeuristic(product);
            const totalInterests = new Set([...product.currentInterests, ...result.interests]);

            if (totalInterests.size >= 2 && Object.keys(result.attributes).length >= 3) {
              // Sufficient from heuristics
              heuristicResults.push(result);
              stats.heuristicOnly++;
            } else {
              needsLLM.push(product);
            }
          }
        }

        // Save heuristic results
        for (const result of heuristicResults) {
          await saveEnrichmentToNeo4j(result.productId, result, options.dryRun);
          stats.interestsAdded += result.interests.length;
          stats.occasionsAdded += result.occasions.length;
          stats.attributesSet += Object.keys(result.attributes).length;
        }

        // Process remaining with LLM
        let llmEnrichedCount = 0;
        if (needsLLM.length > 0) {
          // Split into batches for LLM
          const llmBatches: Product[][] = [];
          for (let k = 0; k < needsLLM.length; k += options.batchSize) {
            llmBatches.push(needsLLM.slice(k, k + options.batchSize));
          }

          // Process LLM batches with concurrency (with retry)
          const llmResults = await Promise.all(
            llmBatches.map(batch => enrichProductsBatchWithRetry(batch, options.verbose, stats))
          );

          // Save LLM results
          for (const results of llmResults) {
            for (const result of results) {
              await saveEnrichmentToNeo4j(result.productId, result, options.dryRun);
              stats.interestsAdded += result.interests.length;
              stats.occasionsAdded += result.occasions.length;
              stats.attributesSet += Object.keys(result.attributes).length;

              // BUG FIX #2: Only count if actual enrichment was added
              if (hasValidEnrichment(result)) {
                llmEnrichedCount++;
                if (result.interests.length > 0) {
                  stats.llmEnriched++;
                }
              }
            }
          }
        }

        // BUG FIX #2: Update progress with ONLY successfully enriched products
        const batchProcessed = concurrentBatches.reduce((sum, b) => sum + b.length, 0);
        const actuallyEnrichedTotal = heuristicResults.length + llmEnrichedCount;

        totalProcessed += batchProcessed;
        stats.processedThisRun += actuallyEnrichedTotal; // Only count successfully enriched

        // Update last processed ID
        const lastBatch = concurrentBatches[concurrentBatches.length - 1];
        if (lastBatch && lastBatch.length > 0) {
          lastProcessedId = lastBatch[lastBatch.length - 1].id;
        }

        // Enhanced progress display with enrichment quality metrics
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.processedThisRun / elapsed;
        const remaining = totalToProcess - totalProcessed;
        const eta = remaining > 0 ? Math.ceil(remaining / rate) : 0;
        const etaStr = eta > 3600
          ? `${Math.floor(eta/3600)}h ${Math.floor((eta%3600)/60)}m`
          : eta > 60
            ? `${Math.floor(eta/60)}m ${eta%60}s`
            : `${eta}s`;

        // Calculate enrichment success rate
        const enrichmentRate = batchProcessed > 0
          ? (actuallyEnrichedTotal / batchProcessed * 100).toFixed(1)
          : '100.0';

        spinner.succeed(
          `Progress: ${chalk.green(totalProcessed.toLocaleString())}/${totalToProcess.toLocaleString()} ` +
          `(${chalk.cyan((totalProcessed/totalToProcess*100).toFixed(1))}%) | ` +
          `Success: ${chalk.white(enrichmentRate)}% | ` +
          `Rate: ${chalk.white(rate.toFixed(1))}/s | ` +
          `Cost: ${chalk.yellow('$' + stats.estimatedCost.toFixed(3))} | ` +
          `ETA: ${chalk.cyan(etaStr)}`
        );

        // Show enrichment breakdown every 10 batches
        if (options.verbose || totalProcessed % 500 < batchProcessed) {
          console.log(chalk.gray(
            `  Enriched: ${heuristicResults.length} heuristic + ${llmEnrichedCount} LLM | ` +
            `Added: ${stats.interestsAdded} interests, ${stats.occasionsAdded} occasions, ${stats.attributesSet} attrs`
          ));
        }

        // Save checkpoint every 100 products
        if (stats.processedThisRun % 100 < batchProcessed && !options.dryRun) {
          saveCheckpoint({
            lastProcessedId,
            processedCount: totalProcessed,
            stats,
            timestamp: new Date().toISOString(),
          });
          stats.lastCheckpoint = Date.now();
        }

        // Small delay between batches
        await sleep(200);
      }
    }

    // BUG FIX #3: Verify actual enrichment coverage before declaring completion
    spinner.start('Verifying enrichment coverage in database...');
    const coverage = await verifyEnrichmentCoverage();
    spinner.succeed('Coverage verification complete');

    // Final summary
    const totalDuration = (Date.now() - stats.startTime) / 1000;

    console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  ENRICHMENT COMPLETE'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════════════\n'));

    // Show actual coverage from database
    console.log(chalk.bold.white('Actual Coverage in Database:'));
    console.log(`  Products with interests: ${chalk.green(coverage.withInterests.toLocaleString())} / ${coverage.total.toLocaleString()} (${chalk.cyan(coverage.interestsCoverage.toFixed(1))}%)`);
    console.log(`  Products with occasions: ${chalk.green(coverage.withOccasions.toLocaleString())} / ${coverage.total.toLocaleString()} (${chalk.cyan(coverage.occasionsCoverage.toFixed(1))}%)`);
    console.log(`  Products with attributes: ${chalk.green(coverage.withAttributes.toLocaleString())} / ${coverage.total.toLocaleString()} (${chalk.cyan(coverage.attributesCoverage.toFixed(1))}%)`);
    console.log();

    console.log(chalk.white('Products:'));
    console.log(`  Total processed: ${chalk.green(stats.processedThisRun.toLocaleString())}`);
    console.log(`  Heuristic only: ${chalk.green(stats.heuristicOnly.toLocaleString())}`);
    console.log(`  LLM enriched: ${chalk.green(stats.llmEnriched.toLocaleString())}`);

    console.log(chalk.white('\nEnrichments:'));
    console.log(`  Interests added: ${chalk.green(stats.interestsAdded.toLocaleString())}`);
    console.log(`  Occasions added: ${chalk.green(stats.occasionsAdded.toLocaleString())}`);
    console.log(`  Attributes set: ${chalk.green(stats.attributesSet.toLocaleString())}`);

    console.log(chalk.white('\nLLM Usage:'));
    console.log(`  Tokens: ${chalk.green(stats.tokensUsed.toLocaleString())}`);
    console.log(`  Estimated cost: ${chalk.green('$' + stats.estimatedCost.toFixed(3))}`);
    console.log(`  Errors: ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green(stats.errors)}`);

    if (Object.keys(stats.providerUsage).length > 0) {
      console.log(chalk.white('\nProvider Usage:'));
      for (const [provider, count] of Object.entries(stats.providerUsage)) {
        console.log(`  ${provider}: ${chalk.white(count.toLocaleString())} products`);
      }
    }

    console.log(chalk.white('\nPerformance:'));
    console.log(`  Total time: ${chalk.green(formatDuration(totalDuration))}`);
    console.log(`  Rate: ${chalk.green((stats.processedThisRun / totalDuration).toFixed(1))} products/s`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes saved'));
    } else {
      console.log(chalk.green('\n✅ All changes saved to database'));
      clearCheckpoint();
    }

  } catch (error) {
    spinner.fail('Enrichment failed');
    console.error(chalk.red('\n❌ Error:'), error);

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
  batchSize: args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 15,
  concurrency: args.includes('--concurrency') ? parseInt(args[args.indexOf('--concurrency') + 1]) : 3,
  verbose: args.includes('--verbose'),
};

runEnrichment(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
