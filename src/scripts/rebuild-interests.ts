#!/usr/bin/env tsx
/**
 * Rebuild Interest Taxonomy
 *
 * Complete rebuild of the product interest system:
 * 1. Extract interests from all products using LLM
 * 2. Generate comprehensive interest taxonomy (50-100 interests)
 * 3. Create new MATCHES_INTEREST relationships in Neo4j
 * 4. Track progress and allow resuming
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { InterestExtractor, InterestExtractionResult } from '../src/services/interest-extractor.js';
import { logger } from '../src/lib/logger.js';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

interface ProcessingState {
  totalProducts: number;
  processedProducts: number;
  failedProducts: string[];
  startedAt: string;
  lastCheckpoint: string;
  lastProcessedIndex: number;  // Track by index instead of IDs
  interestStats: Map<string, {
    count: number;
    totalRelevance: number;
    avgRelevance: number;
    // Removed products array to save memory
  }>;
}

const STATE_FILE = path.join(process.cwd(), 'data', 'interest-rebuild-state.json');

class InterestRebuilder {
  private openai: OpenAI;
  private extractor: InterestExtractor;
  private state: ProcessingState;
  private spinner: any;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.extractor = new InterestExtractor(this.openai);
    this.state = this.loadState();
  }

  /**
   * Load processing state from file (for resume functionality)
   */
  private loadState(): ProcessingState {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        console.log(`📂 Resuming from checkpoint: ${data.processedProducts}/${data.totalProducts} products processed`);
        return {
          ...data,
          lastProcessedIndex: data.lastProcessedIndex || 0,
          interestStats: new Map(Object.entries(data.interestStats || {})),
        };
      } catch (error) {
        console.warn('Failed to load state file, starting fresh');
      }
    }

    return {
      totalProducts: 0,
      processedProducts: 0,
      failedProducts: [],
      startedAt: new Date().toISOString(),
      lastCheckpoint: new Date().toISOString(),
      lastProcessedIndex: 0,
      interestStats: new Map(),
    };
  }

  /**
   * Save processing state to file
   */
  private saveState(): void {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const stateData = {
      totalProducts: this.state.totalProducts,
      processedProducts: this.state.processedProducts,
      failedProducts: this.state.failedProducts,
      startedAt: this.state.startedAt,
      lastCheckpoint: new Date().toISOString(),
      lastProcessedIndex: this.state.lastProcessedIndex,
      interestStats: Object.fromEntries(this.state.interestStats),
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(stateData, null, 2));
  }

  /**
   * Update interest statistics
   */
  private updateInterestStats(result: InterestExtractionResult): void {
    for (const interest of result.interests) {
      const existing = this.state.interestStats.get(interest.name) || {
        count: 0,
        totalRelevance: 0,
        avgRelevance: 0,
      };

      existing.count++;
      existing.totalRelevance += interest.relevanceScore;
      existing.avgRelevance = existing.totalRelevance / existing.count;

      this.state.interestStats.set(interest.name, existing);
    }
  }

  /**
   * Main rebuild process
   */
  async rebuild(options: {
    limit?: number;
    dryRun?: boolean;
    clearExisting?: boolean;
  } = {}): Promise<void> {
    const { limit, dryRun = false, clearExisting = false } = options;

    this.spinner = ora('Initializing...').start();

    try {
      // Initialize Neo4j
      await initNeo4j({
        uri: process.env.NEO4J_URL || '',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || '',
        database: process.env.NEO4J_DATABASE || 'neo4j',
      });

      const driver = getDriver();
      const session = driver.session();

      try {
        // Step 1: Clear existing MATCHES_INTEREST relationships if requested
        if (clearExisting && !dryRun) {
          this.spinner.text = 'Clearing existing interest relationships...';
          const clearResult = await session.run(`
            MATCH ()-[r:MATCHES_INTEREST]->()
            DELETE r
            RETURN count(r) as deletedCount
          `);
          const deletedCountRaw = clearResult.records[0]?.get('deletedCount');
          const deletedCount = typeof deletedCountRaw === 'number' ? deletedCountRaw : (deletedCountRaw?.toInt ? deletedCountRaw.toInt() : 0);
          this.spinner.succeed(`Cleared ${deletedCount} existing interest relationships`);
        }

        // Step 2: Load all products
        this.spinner.text = 'Loading products from database...';
        const productsQuery = limit
          ? `MATCH (p:Product) WHERE p.available = true RETURN p LIMIT ${limit}`
          : `MATCH (p:Product) WHERE p.available = true RETURN p`;

        const productsResult = await session.run(productsQuery);
        const allProducts = productsResult.records.map(r => r.get('p').properties);

        this.state.totalProducts = allProducts.length;
        this.spinner.succeed(`Loaded ${allProducts.length} products`);

        // Skip already processed products (for resume)
        const productsToProcess = allProducts.slice(this.state.lastProcessedIndex);

        if (productsToProcess.length === 0) {
          console.log('✅ All products already processed!');
          return;
        }

        console.log(`\n🔄 Processing ${productsToProcess.length} products (${this.state.processedProducts} already done)...\n`);

        // Step 3: Process products in batches
        const BATCH_SIZE = 10;
        const CHECKPOINT_INTERVAL = 100;

        for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
          const batch = productsToProcess.slice(i, i + BATCH_SIZE);

          this.spinner.start(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(productsToProcess.length / BATCH_SIZE)}`);

          // Extract interests for batch
          const results = await this.extractor.extractBatch(batch);

          // Store results in Neo4j
          if (!dryRun) {
            for (const result of results) {
              await this.storeInterests(session, result);
              this.updateInterestStats(result);
              this.state.processedProducts++;
              this.state.lastProcessedIndex++;
            }
          } else {
            // Dry run: just log
            for (const result of results) {
              console.log(`\n[DRY RUN] Product: ${result.productId}`);
              console.log(`  Interests: ${result.interests.map(i => `${i.name}(${i.relevanceScore.toFixed(2)})`).join(', ')}`);
              this.updateInterestStats(result);
              this.state.processedProducts++;
              this.state.lastProcessedIndex++;
            }
          }

          // Checkpoint progress
          if (this.state.processedProducts % CHECKPOINT_INTERVAL === 0) {
            this.saveState();
            this.spinner.succeed(`Checkpoint: ${this.state.processedProducts}/${this.state.totalProducts} products processed`);
          }

          // Progress update
          const progress = ((this.state.processedProducts / this.state.totalProducts) * 100).toFixed(1);
          this.spinner.text = `Progress: ${this.state.processedProducts}/${this.state.totalProducts} (${progress}%)`;
        }

        this.spinner.succeed(`✅ Processed ${this.state.processedProducts} products`);

        // Step 4: Print statistics
        this.printStatistics();

        // Final save
        this.saveState();

      } finally {
        await session.close();
      }

    } catch (error) {
      this.spinner.fail('Rebuild failed');
      logger.error('Interest rebuild failed', { error });
      throw error;
    } finally {
      await closeNeo4j();
    }
  }

  /**
   * Store extracted interests in Neo4j
   */
  private async storeInterests(session: any, result: InterestExtractionResult): Promise<void> {
    if (result.interests.length === 0) return;

    try {
      // Create/merge interest nodes and relationships
      const query = `
        UNWIND $interests AS interest

        // Create or merge Interest node
        MERGE (i:Interest {name: interest.name})
        ON CREATE SET
          i.category = interest.category,
          i.created_at = datetime()

        WITH i, interest

        // Match product
        MATCH (p:Product {id: $productId})

        // Create relationship
        MERGE (p)-[r:MATCHES_INTEREST]->(i)
        SET r.relevance_score = interest.relevanceScore,
            r.confidence = interest.confidence,
            r.reasoning = interest.reasoning,
            r.extracted_at = datetime(),
            r.extraction_method = 'llm_v2'

        RETURN count(r) as relationshipsCreated
      `;

      await session.run(query, {
        productId: result.productId,
        interests: result.interests,
      });
    } catch (error) {
      logger.error('Failed to store interests', {
        productId: result.productId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.state.failedProducts.push(result.productId);
    }
  }

  /**
   * Print statistics about extracted interests
   */
  private printStatistics(): void {
    console.log('\n📊 Interest Extraction Statistics\n');
    console.log(`Total Products: ${this.state.totalProducts}`);
    console.log(`Processed: ${this.state.processedProducts}`);
    console.log(`Failed: ${this.state.failedProducts.length}`);
    console.log(`Unique Interests: ${this.state.interestStats.size}\n`);

    // Top 30 interests by frequency
    const topInterests = Array.from(this.state.interestStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30);

    console.log('Top 30 Interests by Frequency:\n');
    topInterests.forEach(([name, stats], i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${name.padEnd(25)} ${stats.count.toString().padStart(6)} products (avg relevance: ${stats.avgRelevance.toFixed(2)})`);
    });

    // Save detailed stats to file
    const statsFile = path.join(process.cwd(), 'data', 'interest-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify({
      summary: {
        totalProducts: this.state.totalProducts,
        processedProducts: this.state.processedProducts,
        failedProducts: this.state.failedProducts.length,
        uniqueInterests: this.state.interestStats.size,
      },
      interests: Object.fromEntries(
        Array.from(this.state.interestStats.entries())
          .map(([name, stats]) => [name, stats]) // Fixed: removed products reference that no longer exists
      ),
    }, null, 2));

    console.log(`\n💾 Detailed stats saved to: ${statsFile}`);
  }
}

// CLI
const args = process.argv.slice(2);
const options = {
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  dryRun: args.includes('--dry-run'),
  clearExisting: args.includes('--clear'),
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           🔄 Interest Taxonomy Rebuild - Phase C               ║
║                                                                ║
║  This will rebuild the entire interest system using LLM        ║
║  extraction to create a comprehensive, dynamic taxonomy.       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Options:
${options.limit ? `  - Processing ${options.limit} products` : '  - Processing ALL products (41,686)'}
${options.dryRun ? '  - DRY RUN mode (no database writes)' : '  - LIVE mode (will write to database)'}
${options.clearExisting ? '  - Will clear existing interest relationships' : '  - Will preserve existing relationships'}

`);

const rebuilder = new InterestRebuilder();
rebuilder.rebuild(options).catch(console.error);
