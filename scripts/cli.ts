/**
 * CLI for Testing Recommendations
 *
 * Simple command-line interface to test the recommendation engine
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Command } from 'commander';
import { initNeo4j, closeNeo4j } from '../src/lib/neo4j.js';
import { recommend } from '../src/lib/recommend.js';
import { logger } from '../src/lib/logger.js';

const program = new Command();

program
  .name('present-agent')
  .description('AI-powered gift recommendation CLI')
  .version('0.1.0');

program
  .command('search <query>')
  .description('Search for gift recommendations')
  .option('-n, --num <number>', 'Number of recommendations', '5')
  .action(async (query: string, options) => {
    try {
      // Initialize Neo4j
      await initNeo4j({
        uri: process.env.NEO4J_URL!,
        username: process.env.NEO4J_USER!,
        password: process.env.NEO4J_PASSWORD!,
        database: process.env.NEO4J_DATABASE || 'neo4j'
      });

      const numResults = parseInt(options.num);

      console.log(`\n🔍 Searching for: "${query}"\n`);

      const recommendations = await recommend(query, numResults);

      if (recommendations.length === 0) {
        console.log('❌ No recommendations found. Try adjusting your query.\n');
        return;
      }

      console.log(`✅ Found ${recommendations.length} recommendations:\n`);
      console.log('═'.repeat(80));

      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.product.title}`);
        console.log(`   💰 Price: $${rec.product.price} ${rec.product.currency}`);
        console.log(`   ⭐ Score: ${rec.score.toFixed(2)} | Confidence: ${rec.confidence.toFixed(2)}`);
        console.log(`   📝 ${rec.rationale}`);
        if (rec.product.url) {
          console.log(`   🔗 ${rec.product.url}`);
        }
        console.log('─'.repeat(80));
      });

      console.log('\n');

    } catch (error) {
      console.error('\n❌ Search failed:', error);
      logger.error('CLI search failed', { query, error });
      process.exit(1);
    } finally {
      await closeNeo4j();
    }
  });

program
  .command('benchmark')
  .description('Run benchmark queries')
  .action(async () => {
    try {
      await initNeo4j({
        uri: process.env.NEO4J_URL!,
        username: process.env.NEO4J_USER!,
        password: process.env.NEO4J_PASSWORD!,
        database: process.env.NEO4J_DATABASE || 'neo4j'
      });

      const benchmarkQueries = [
        'birthday gift for tech-savvy dad under $100',
        'romantic anniversary gift for wife',
        'graduation present for college student',
        'baby shower gift for expecting parents',
        'housewarming gift for new homeowners'
      ];

      console.log('\n🏃 Running benchmark queries...\n');
      console.log('═'.repeat(80));

      for (const query of benchmarkQueries) {
        console.log(`\n📊 Query: "${query}"`);

        const startTime = Date.now();
        const recommendations = await recommend(query, 3);
        const executionTime = Date.now() - startTime;

        console.log(`   ⏱️  Time: ${executionTime}ms`);
        console.log(`   📦 Results: ${recommendations.length}`);

        if (recommendations.length > 0) {
          console.log(`   🥇 Top: ${recommendations[0].product.title} ($${recommendations[0].product.price})`);
          console.log(`   💬 "${recommendations[0].rationale}"`);
        }

        console.log('─'.repeat(80));
      }

      console.log('\n✅ Benchmark complete\n');

    } catch (error) {
      console.error('\n❌ Benchmark failed:', error);
      process.exit(1);
    } finally {
      await closeNeo4j();
    }
  });

program.parse();
