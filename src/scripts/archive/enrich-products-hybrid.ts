#!/usr/bin/env tsx
/**
 * Hybrid Product Enrichment Script (Two-Pass Strategy)
 *
 * Enriches products with interests, occasions, and gift attributes using
 * a two-pass approach for maximum speed and cost-efficiency.
 *
 * ARCHITECTURE:
 * - Pass 1 (Heuristic): Fast keyword/regex matching - no LLM costs
 * - Pass 2 (LLM Gap-Fill): Batched LLM calls only for under-enriched products
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Batched LLM calls (10-20 products per API request)
 * - Parallel batch processing (3-5 concurrent batches)
 * - Checkpointing for resume capability
 * - Progress reporting with ETA
 * - Cost tracking with token estimation
 *
 * ENRICHMENT SCOPE:
 * - Interests (using interest-synonyms.ts taxonomy)
 * - Occasions (birthday, christmas, anniversary, etc.)
 * - Gift attributes (experiential, sentimental, practical, etc.)
 *
 * USAGE:
 *   tsx scripts/enrich-products-hybrid.ts [options]
 *
 * OPTIONS:
 *   --live              Apply changes (default: dry-run)
 *   --limit N           Process only first N products
 *   --skip-heuristic    Skip heuristic pass (LLM only)
 *   --skip-llm          Skip LLM pass (heuristic only)
 *   --resume            Resume from checkpoint
 *   --concurrency N     Parallel batch count (default: 3)
 *   --batch-size N      Products per LLM call (default: 15)
 *
 * EXAMPLES:
 *   # Dry run on 100 products
 *   tsx scripts/enrich-products-hybrid.ts --limit 100
 *
 *   # Live run with full enrichment
 *   tsx scripts/enrich-products-hybrid.ts --live
 *
 *   # Only heuristic pass (no LLM costs)
 *   tsx scripts/enrich-products-hybrid.ts --skip-llm --live
 *
 *   # Resume interrupted run
 *   tsx scripts/enrich-products-hybrid.ts --resume --live
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { chatCompletion } from '../src/lib/llm.js';
import { normalizeInterest, expandInterests, INTEREST_TAXONOMY } from '../src/lib/interest-synonyms.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

// ============================================================================
// MODEL PROVIDERS
// ============================================================================

type ModelProvider = 'openai' | 'gemini';

// Initialize Gemini client if API key is available
const geminiClient = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

/**
 * Call Gemini Flash for batched enrichment
 */
async function callGemini(prompt: string): Promise<string> {
  if (!geminiClient) {
    throw new Error('GOOGLE_API_KEY not set in environment');
  }

  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.0-flash', // Fixed: correct model name (was gemini-1.5-flash which doesn't exist)
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    }
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Call OpenAI for batched enrichment
 */
async function callOpenAI(prompt: string): Promise<string> {
  return await chatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    jsonMode: true,
  });
}

/**
 * Unified LLM call that routes to the selected provider
 */
async function callLLM(prompt: string, provider: ModelProvider): Promise<string> {
  if (provider === 'gemini') {
    return callGemini(prompt);
  }
  return callOpenAI(prompt);
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  currentInterests: string[];
  currentOccasions: string[];
}

interface EnrichmentResult {
  productId: string;
  interests: string[];
  occasions: string[];
  attributes: Record<string, boolean>;
}

interface CheckpointData {
  processedIds: Set<string>;
  stats: Stats;
  timestamp: string;
}

interface Stats {
  totalProducts: number;
  heuristicProcessed: number;
  heuristicEnriched: number;
  llmProcessed: number;
  llmEnriched: number;
  totalInterestsAdded: number;
  totalOccasionsAdded: number;
  totalAttributesSet: number;
  tokensUsed: number;
  estimatedCost: number;
  startTime: number;
  lastCheckpoint: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHECKPOINT_FILE = path.join(process.cwd(), 'data', '.enrichment-checkpoint.json');

// Occasion definitions
type OccasionName =
  | 'birthday'
  | 'christmas'
  | 'anniversary'
  | 'wedding'
  | 'valentines_day'
  | 'mothers_day'
  | 'fathers_day'
  | 'graduation'
  | 'housewarming'
  | 'thank_you'
  | 'get_well'
  | 'congratulations'
  | 'retirement';

const OCCASIONS: OccasionName[] = [
  'birthday',
  'christmas',
  'anniversary',
  'wedding',
  'valentines_day',
  'mothers_day',
  'fathers_day',
  'graduation',
  'housewarming',
  'thank_you',
  'get_well',
  'congratulations',
  'retirement',
];

// Top gift attributes to extract (most discriminative)
const GIFT_ATTRIBUTES = [
  'isExperiential',
  'isMemoryMaking',
  'isSentimental',
  'isPersonalized',
  'isPractical',
  'isLuxury',
  'isConsumable',
  'isArtistic',
  'isMinimalist',
  'isShared',
  'isConversationStarter',
  'isEducational',
  'isHandcrafted',
  'isLastingValue',
  'isEcoFriendly',
] as const;

// GPT-4o-mini pricing (per 1M tokens)
const INPUT_TOKEN_COST = 0.15 / 1_000_000;
const OUTPUT_TOKEN_COST = 0.60 / 1_000_000;

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

function loadCheckpoint(): CheckpointData | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
      // Convert processed IDs array back to Set
      return {
        ...data,
        processedIds: new Set(data.processedIds || []),
      };
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load checkpoint, starting fresh'));
  }
  return null;
}

function saveCheckpoint(data: CheckpointData): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Convert Set to Array for JSON serialization
    const serializable = {
      ...data,
      processedIds: Array.from(data.processedIds),
    };
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(serializable, null, 2));
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
    console.warn(chalk.yellow('⚠️  Failed to clear checkpoint'));
  }
}

// ============================================================================
// HEURISTIC ENRICHMENT (PASS 1)
// ============================================================================

/**
 * Extract interests using keyword matching and interest taxonomy
 */
function extractInterestsHeuristic(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const foundInterests = new Set<string>();

  // Search through taxonomy for keyword matches
  for (const [canonical, terms] of Object.entries(INTEREST_TAXONOMY)) {
    for (const term of terms) {
      // Create word boundary regex for exact term matching
      const regex = new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        foundInterests.add(canonical);
        break; // Found this canonical interest, move to next
      }
    }
  }

  return Array.from(foundInterests);
}

/**
 * Extract occasions using keyword matching
 */
function extractOccasionsHeuristic(title: string, description: string): OccasionName[] {
  const text = `${title} ${description}`.toLowerCase();
  const foundOccasions = new Set<OccasionName>();

  if (/\b(birthday|b-day|bday|turning\s+\d+)\b/.test(text)) foundOccasions.add('birthday');
  if (/\b(christmas|xmas|holiday|holidays)\b/.test(text)) foundOccasions.add('christmas');
  if (/\b(anniversary|years together|romantic)\b/.test(text)) foundOccasions.add('anniversary');
  if (/\b(wedding|bride|groom|bridal)\b/.test(text)) foundOccasions.add('wedding');
  if (/\b(valentine|valentine's|love\s+gift)\b/.test(text)) foundOccasions.add('valentines_day');
  if (/\b(mother'?s\s+day|mom|mum)\b/.test(text)) foundOccasions.add('mothers_day');
  if (/\b(father'?s\s+day|dad)\b/.test(text)) foundOccasions.add('fathers_day');
  if (/\b(graduation|graduate|class of)\b/.test(text)) foundOccasions.add('graduation');
  if (/\b(housewarming|new home|moving in)\b/.test(text)) foundOccasions.add('housewarming');
  if (/\b(thank you|appreciation|gratitude)\b/.test(text)) foundOccasions.add('thank_you');
  if (/\b(get well|recovery|feel better)\b/.test(text)) foundOccasions.add('get_well');
  if (/\b(congratulations|congrats)\b/.test(text)) foundOccasions.add('congratulations');
  if (/\b(retirement|retiree|retiring)\b/.test(text)) foundOccasions.add('retirement');

  // Generic fallbacks
  if (/\b(jewelry|necklace|ring|bracelet|romantic|love)\b/.test(text)) foundOccasions.add('anniversary');
  if (/\b(luxury|premium|experience|spa|massage)\b/.test(text)) foundOccasions.add('birthday');

  return Array.from(foundOccasions);
}

/**
 * Extract gift attributes using keyword matching
 */
function extractAttributesHeuristic(title: string, description: string, price?: number): Record<string, boolean> {
  const text = `${title} ${description}`.toLowerCase();
  const attributes: Record<string, boolean> = {};

  // Experiential
  if (/(class|workshop|lesson|course|experience|ticket|event|subscription)/i.test(text)) {
    attributes.isExperiential = true;
  }

  // Memory-making
  if (/(photo|album|memory|keepsake|scrapbook|commemorative)/i.test(text)) {
    attributes.isMemoryMaking = true;
  }

  // Sentimental
  if (/(sentimental|meaningful|heartfelt|touching|emotional)/i.test(text)) {
    attributes.isSentimental = true;
  }

  // Personalized
  if (/(personalized|personalised|custom|customized|monogram|engraved|bespoke)/i.test(text)) {
    attributes.isPersonalized = true;
    attributes.isSentimental = true; // Personalized is usually sentimental
  }

  // Practical
  if (/(practical|useful|everyday|utility|functional|tool|organizer)/i.test(text)) {
    attributes.isPractical = true;
  }

  // Luxury
  if (/(luxury|premium|high-end|deluxe|exclusive|artisan|designer)/i.test(text)) {
    attributes.isLuxury = true;
  }

  // Consumable
  if (/(food|wine|chocolate|coffee|tea|candle|beauty|cosmetic|bath|soap)/i.test(text)) {
    attributes.isConsumable = true;
  }

  // Artistic
  if (/(art|artistic|sculpture|painting|print|canvas|gallery|creative)/i.test(text)) {
    attributes.isArtistic = true;
  }

  // Minimalist
  if (/(minimalist|minimal|simple|clean|understated)/i.test(text)) {
    attributes.isMinimalist = true;
  }

  // Shared
  if (/(share|shared|together|group|party|social|gathering)/i.test(text)) {
    attributes.isShared = true;
  }

  // Conversation starter
  if (/(unique|unusual|quirky|interesting|conversation|distinctive)/i.test(text)) {
    attributes.isConversationStarter = true;
  }

  // Educational
  if (/(learn|educational|course|book|tutorial|teach|instruction)/i.test(text)) {
    attributes.isEducational = true;
  }

  // Handcrafted
  if (/(handmade|hand-made|handcrafted|hand-crafted|artisan|craft)/i.test(text)) {
    attributes.isHandcrafted = true;
  }

  // Lasting value
  if (/(heirloom|timeless|durable|investment|quality|lifetime)/i.test(text)) {
    attributes.isLastingValue = true;
  }

  // Eco-friendly
  if (/(eco|sustainable|green|organic|recycled|ethical|bamboo|natural)/i.test(text)) {
    attributes.isEcoFriendly = true;
  }

  // Price-based attributes
  if (price !== undefined && price !== null) {
    if (price >= 100) {
      attributes.isLuxury = true;
    }
  }

  return attributes;
}

/**
 * Perform heuristic enrichment on a product
 */
function enrichProductHeuristic(product: Product): EnrichmentResult {
  const interests = extractInterestsHeuristic(product.title, product.description);
  const occasions = extractOccasionsHeuristic(product.title, product.description);
  const attributes = extractAttributesHeuristic(product.title, product.description, product.price);

  return {
    productId: product.id,
    interests,
    occasions,
    attributes,
  };
}

// ============================================================================
// LLM ENRICHMENT (PASS 2 - BATCHED)
// ============================================================================

/**
 * Generate batched LLM prompt for enriching multiple products at once
 */
function generateBatchEnrichmentPrompt(products: Product[]): string {
  const productList = products.map((p, idx) =>
    `${idx + 1}. "${p.title}" - ${p.description.substring(0, 300)}`
  ).join('\n\n');

  return `You are an expert at analyzing products for gift-giving. Analyze these ${products.length} products and return enrichment data.

PRODUCTS:
${productList}

For EACH product, extract:
1. INTERESTS (3-8 specific interests): Who would love this? What hobbies/passions does it appeal to?
   - Use lowercase, singular terms: "coffee", "hiking", "photography"
   - Be specific: prefer "wine" over "beverages", "yoga" over "fitness"
   - Consider: hobby, lifestyle, passion, activity, interest area

2. OCCASIONS (1-3 suitable gift occasions):
   - Valid occasions: ${OCCASIONS.join(', ')}
   - Think: When would someone give this as a gift?

3. GIFT ATTRIBUTES (5-10 true attributes):
   - Available attributes: ${GIFT_ATTRIBUTES.join(', ')}
   - Only set to true if CLEARLY applicable
   - Be selective - quality over quantity

Return a JSON array with one object per product IN THE SAME ORDER:

[
  {
    "productIndex": 1,
    "interests": ["coffee", "espresso", "barista", "brewing"],
    "occasions": ["birthday", "christmas", "thank_you"],
    "attributes": {
      "isConsumable": true,
      "isPractical": true,
      "isShared": true,
      "isArtistic": false,
      "isPersonalized": false
    }
  },
  ...
]

IMPORTANT: Return exactly ${products.length} objects, matching the product order above.`;
}

/**
 * Enrich products using batched LLM calls
 */
async function enrichProductsBatchLLM(
  products: Product[],
  spinner: ora.Ora,
  modelProvider: ModelProvider = 'openai',
  verbose: boolean = false
): Promise<EnrichmentResult[]> {
  try {
    spinner.text = `LLM enriching batch of ${products.length} products (${modelProvider})...`;

    const prompt = generateBatchEnrichmentPrompt(products);

    if (verbose) {
      const productIds = products.map(p => p.id).join(', ');
      console.log(
        `\n[LLM Batch] provider=${modelProvider} size=${products.length} ids=[${productIds}] prompt_chars=${prompt.length}`
      );
    }

    const response = await callLLM(prompt, modelProvider);

    const parsed = JSON.parse(response);
    const results: EnrichmentResult[] = [];

    // Map LLM results back to products
    for (let i = 0; i < products.length; i++) {
      const llmResult = parsed[i] || {};

      // Normalize interests using taxonomy
      const rawInterests = llmResult.interests || [];
      const normalizedInterests = expandInterests(rawInterests);

      // Validate occasions
      const occasions = (llmResult.occasions || [])
        .filter((occ: string) => OCCASIONS.includes(occ as OccasionName));

      // Extract only boolean attributes
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

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(response.length / 4);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;

    if (verbose) {
      console.log(
        `[LLM Batch] parsed=${parsed.length} estimated_tokens=${totalTokens} input_est=${estimatedInputTokens} output_est=${estimatedOutputTokens}`
      );
    }

    return results;
  } catch (error: any) {
    spinner.fail(`LLM batch enrichment failed: ${error.message}`);
    if (verbose) {
      console.error('[LLM Batch] error details:', error);
    }
    // Return empty results on failure
    return products.map(p => ({
      productId: p.id,
      interests: [],
      occasions: [],
      attributes: {},
    }));
  }
}

// ============================================================================
// DATABASE PERSISTENCE
// ============================================================================

/**
 * Save enrichment results to Neo4j
 */
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
         SET r.extraction_method = 'hybrid_enrichment',
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

    // Save gift attributes
    if (Object.keys(result.attributes).length > 0) {
      const attributeProps = Object.entries(result.attributes)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, boolean>);

      await session.run(
        `MATCH (p:Product {id: $productId})
         SET p += $attributes,
             p.attributes_updated_at = datetime()`,
        { productId, attributes: attributeProps }
      );
    }
  } finally {
    await session.close();
  }
}

// ============================================================================
// MAIN ENRICHMENT LOGIC
// ============================================================================

async function enrichProductsHybrid(options: {
  limit?: number;
  dryRun: boolean;
  skipHeuristic: boolean;
  skipLLM: boolean;
  resume: boolean;
  concurrency: number;
  batchSize: number;
  maxDurationMinutes?: number;
  verbose?: boolean;
  model: ModelProvider;
}) {
  const spinner = ora('Initializing...').start();

  // Load checkpoint if resuming
  let checkpoint: CheckpointData | null = null;
  if (options.resume) {
    checkpoint = loadCheckpoint();
    if (checkpoint) {
      spinner.succeed(`Resumed from checkpoint (${checkpoint.processedIds.size} products already processed)`);
    }
  }

  // Initialize Neo4j
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  // Initialize stats
  const stats: Stats = checkpoint?.stats || {
    totalProducts: 0,
    heuristicProcessed: 0,
    heuristicEnriched: 0,
    llmProcessed: 0,
    llmEnriched: 0,
    totalInterestsAdded: 0,
    totalOccasionsAdded: 0,
    totalAttributesSet: 0,
    tokensUsed: 0,
    estimatedCost: 0,
    startTime: Date.now(),
    lastCheckpoint: Date.now(),
  };

  const processedIds = checkpoint?.processedIds || new Set<string>();
  const deadline = options.maxDurationMinutes
    ? Date.now() + options.maxDurationMinutes * 60_000
    : null;

  const maybeAbortForTime = (stage: string) => {
    if (!deadline) return false;
    if (Date.now() <= deadline) return false;

    spinner.warn(`Max duration reached during ${stage}, saving progress...`);
    if (!options.dryRun) {
      saveCheckpoint({
        processedIds,
        stats,
        timestamp: new Date().toISOString(),
      });
      stats.lastCheckpoint = Date.now();
    }
    console.log(chalk.yellow('\n⏳ Max duration reached. Use --resume to continue from checkpoint.\n'));
    return true;
  };

  try {
    // ========================================================================
    // FETCH PRODUCTS
    // ========================================================================

    spinner.text = 'Fetching products...';

    const query = `
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
      OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
      WITH p,
           COLLECT(DISTINCT i.name) AS interests,
           COLLECT(DISTINCT o.name) AS occasions
      RETURN p.id AS id,
             p.title AS title,
             p.description AS description,
             p.price AS price,
             p.vendor AS vendor,
             interests,
             occasions
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await session.run(query);
    let products: Product[] = result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
      price: r.get('price'),
      vendor: r.get('vendor'),
      currentInterests: r.get('interests') || [],
      currentOccasions: r.get('occasions') || [],
    }));

    // Filter out already processed products if resuming
    if (checkpoint) {
      products = products.filter(p => !processedIds.has(p.id));
      spinner.succeed(`Found ${products.length} products to process (${processedIds.size} already done)`);
    } else {
      spinner.succeed(`Found ${products.length} products`);
    }

    if (products.length === 0) {
      console.log(chalk.green('\n✅ No products to process!'));
      return;
    }

    stats.totalProducts = products.length + processedIds.size;

    console.log(chalk.bold.cyan(`\n${'='.repeat(70)}`));
    console.log(chalk.bold.cyan(`  HYBRID PRODUCT ENRICHMENT`));
    console.log(chalk.bold.cyan(`${'='.repeat(70)}\n`));
    console.log(`Mode: ${options.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
    console.log(`Products: ${chalk.white(products.length)}`);
    console.log(`Strategy: ${options.skipHeuristic ? 'LLM only' : options.skipLLM ? 'Heuristic only' : 'Two-pass hybrid'}`);
    console.log(`Model: ${chalk.cyan(options.model === 'gemini' ? 'Gemini 1.5 Flash (50% cheaper)' : 'GPT-4o-mini')}`);
    console.log(`Batch size: ${chalk.white(options.batchSize)} products/call`);
    console.log(`Concurrency: ${chalk.white(options.concurrency)} parallel batches\n`);

    // ========================================================================
    // PASS 1: HEURISTIC ENRICHMENT
    // ========================================================================

    let productsNeedingLLM: Product[] = [];

    if (!options.skipHeuristic) {
      console.log(chalk.bold.blue('\n📊 PASS 1: Heuristic Enrichment (keyword-based)\n'));

      const heuristicStartTime = Date.now();
      let heuristicProgress = 0;

      for (const product of products) {
        if (processedIds.has(product.id)) continue;
        if (maybeAbortForTime('heuristic pass')) return;

        const result = enrichProductHeuristic(product);

        // Merge with existing data
        const totalInterests = new Set([...product.currentInterests, ...result.interests]);
        const totalOccasions = new Set([...product.currentOccasions, ...result.occasions]);

        // Check if needs LLM enrichment (< 2 interests OR < 1 occasion)
        if (totalInterests.size < 2 || totalOccasions.size < 1) {
          productsNeedingLLM.push(product);
        } else {
          // Sufficient enrichment from heuristics alone
          await saveEnrichmentToNeo4j(product.id, result, options.dryRun);
          processedIds.add(product.id);
          stats.heuristicEnriched++;
        }

        stats.heuristicProcessed++;
        stats.totalInterestsAdded += result.interests.length;
        stats.totalOccasionsAdded += result.occasions.length;
        stats.totalAttributesSet += Object.keys(result.attributes).length;

        heuristicProgress++;
        if (heuristicProgress % 100 === 0) {
          const elapsed = (Date.now() - heuristicStartTime) / 1000;
          const rate = heuristicProgress / elapsed;
          const remaining = products.length - heuristicProgress;
          const eta = Math.ceil(remaining / rate);

          spinner.text = `Heuristic: ${heuristicProgress}/${products.length} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}s`;
        }
      }

      const heuristicDuration = ((Date.now() - heuristicStartTime) / 1000).toFixed(1);

      console.log(chalk.green(`✓ Heuristic pass complete in ${heuristicDuration}s`));
      console.log(`  Fully enriched: ${chalk.white(stats.heuristicEnriched)} products`);
      console.log(`  Need LLM: ${chalk.yellow(productsNeedingLLM.length)} products\n`);
    } else {
      // Skip heuristic - all products need LLM
      productsNeedingLLM = products;
    }

    // ========================================================================
    // PASS 2: LLM GAP-FILL (BATCHED)
    // ========================================================================

    if (!options.skipLLM && productsNeedingLLM.length > 0) {
      console.log(chalk.bold.blue(`\n🤖 PASS 2: LLM Gap-Fill (batched, GPT-4o-mini)\n`));

      const llmStartTime = Date.now();
      let llmProgress = 0;

      // Process in batches with concurrency
      for (let i = 0; i < productsNeedingLLM.length; i += options.batchSize * options.concurrency) {
        if (maybeAbortForTime('LLM pass')) return;
        // Create concurrent batches
        const batchGroups: Product[][] = [];
        for (let j = 0; j < options.concurrency; j++) {
          const start = i + (j * options.batchSize);
          const end = Math.min(start + options.batchSize, productsNeedingLLM.length);
          if (start < productsNeedingLLM.length) {
            batchGroups.push(productsNeedingLLM.slice(start, end));
          }
        }

        // Process batches in parallel
        const batchResults = await Promise.all(
          batchGroups.map(batch => enrichProductsBatchLLM(batch, spinner, options.model, !!options.verbose))
        );

        // Save results
        for (const results of batchResults) {
          for (const result of results) {
            await saveEnrichmentToNeo4j(result.productId, result, options.dryRun);
            processedIds.add(result.productId);

            stats.llmProcessed++;
            if (result.interests.length > 0 || result.occasions.length > 0) {
              stats.llmEnriched++;
            }
            stats.totalInterestsAdded += result.interests.length;
            stats.totalOccasionsAdded += result.occasions.length;
            stats.totalAttributesSet += Object.keys(result.attributes).length;
          }
        }

        llmProgress += batchGroups.reduce((sum, batch) => sum + batch.length, 0);

        // Estimate tokens (rough: 300 input + 200 output per product)
        const batchTokens = batchGroups.reduce((sum, batch) => sum + (batch.length * 500), 0);
        stats.tokensUsed += batchTokens;
        stats.estimatedCost = (stats.tokensUsed * INPUT_TOKEN_COST * 0.6) + (stats.tokensUsed * OUTPUT_TOKEN_COST * 0.4);

        // Progress update
        const elapsed = (Date.now() - llmStartTime) / 1000;
        const rate = llmProgress / elapsed;
        const remaining = productsNeedingLLM.length - llmProgress;
        const eta = Math.ceil(remaining / rate);

        spinner.succeed(`LLM: ${llmProgress}/${productsNeedingLLM.length} | Rate: ${rate.toFixed(1)}/s | Cost: $${stats.estimatedCost.toFixed(3)} | ETA: ${eta}s`);

        // Checkpoint every 5 batches
        if ((llmProgress % (options.batchSize * 5)) === 0 && !options.dryRun) {
          saveCheckpoint({
            processedIds,
            stats,
            timestamp: new Date().toISOString(),
          });
          stats.lastCheckpoint = Date.now();
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(1);
      console.log(chalk.green(`\n✓ LLM pass complete in ${llmDuration}s`));
      console.log(`  Enriched: ${chalk.white(stats.llmEnriched)} products`);
      console.log(`  Tokens: ${chalk.white(stats.tokensUsed.toLocaleString())}`);
      console.log(`  Cost: ${chalk.white(`$${stats.estimatedCost.toFixed(3)}`)}\n`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================

    const totalDuration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log(chalk.bold.cyan(`\n${'='.repeat(70)}`));
    console.log(chalk.bold.cyan(`  ENRICHMENT SUMMARY`));
    console.log(chalk.bold.cyan(`${'='.repeat(70)}\n`));

    console.log(chalk.white('Products:'));
    console.log(`  Total processed: ${chalk.green(processedIds.size)}`);
    console.log(`  Heuristic only: ${chalk.green(stats.heuristicEnriched)}`);
    console.log(`  LLM enriched: ${chalk.green(stats.llmEnriched)}`);

    console.log(chalk.white('\nEnrichments:'));
    console.log(`  Interests added: ${chalk.green(stats.totalInterestsAdded)}`);
    console.log(`  Occasions added: ${chalk.green(stats.totalOccasionsAdded)}`);
    console.log(`  Attributes set: ${chalk.green(stats.totalAttributesSet)}`);

    if (stats.tokensUsed > 0) {
      console.log(chalk.white('\nLLM Usage:'));
      console.log(`  Tokens: ${chalk.green(stats.tokensUsed.toLocaleString())}`);
      console.log(`  Estimated cost: ${chalk.green(`$${stats.estimatedCost.toFixed(3)}`)}`);
    }

    console.log(chalk.white('\nPerformance:'));
    console.log(`  Total time: ${chalk.green(totalDuration)}s`);
    console.log(`  Rate: ${chalk.green((processedIds.size / parseFloat(totalDuration)).toFixed(1))} products/s`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes saved to database'));
      console.log(chalk.gray('    Use --live flag to apply changes\n'));
    } else {
      console.log(chalk.green('\n✅ All changes saved to database\n'));
      clearCheckpoint();
    }

  } catch (error) {
    spinner.fail('Enrichment failed');
    console.error(chalk.red('\n❌ Error:'), error);

    // Save checkpoint on error
    if (!options.dryRun) {
      saveCheckpoint({
        processedIds,
        stats,
        timestamp: new Date().toISOString(),
      });
      console.log(chalk.yellow('\n💾 Progress saved. Use --resume to continue.\n'));
    }
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

const args = process.argv.slice(2);

const options = {
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  dryRun: !args.includes('--live'),
  skipHeuristic: args.includes('--skip-heuristic'),
  skipLLM: args.includes('--skip-llm'),
  resume: args.includes('--resume'),
  concurrency: args.includes('--concurrency') ? parseInt(args[args.indexOf('--concurrency') + 1]) : 3,
  batchSize: args.includes('--batch-size') ? parseInt(args[args.indexOf('--batch-size') + 1]) : 15,
  maxDurationMinutes: args.includes('--max-duration') ? parseInt(args[args.indexOf('--max-duration') + 1]) : undefined,
  verbose: args.includes('--verbose'),
  model: (args.includes('--model') ? args[args.indexOf('--model') + 1] : 'gemini') as ModelProvider,
};

// Validation
if (options.skipHeuristic && options.skipLLM) {
  console.error(chalk.red('❌ Error: Cannot skip both heuristic and LLM passes\n'));
  process.exit(1);
}

// Run
enrichProductsHybrid(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
