#!/usr/bin/env tsx
/**
 * Tag products with SUITABLE_FOR -> Occasion edges
 *
 * Strategy:
 * - Fast heuristic pass from title/description
 * - Optional LLM refinement (adds 0-2 more occasions)
 * - Upserts Occasion nodes and edges
 *
 * Usage:
 *   tsx scripts/tag-occasions.ts [--limit 1000] [--live] [--use-llm]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { chatCompletion } from '../src/lib/llm.js';
import chalk from 'chalk';

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

function simpleHeuristics(title: string, description: string): OccasionName[] {
  const text = `${title} ${description}`.toLowerCase();
  const picks = new Set<OccasionName>();

  if (/birthday|b-day|bday|turning\s+\d+/.test(text)) picks.add('birthday');
  if (/christmas|xmas|holiday|holidays/.test(text)) picks.add('christmas');
  if (/anniversary|years together|romantic/.test(text)) picks.add('anniversary');
  if (/wedding|bride|groom|bridal/.test(text)) picks.add('wedding');
  if (/valentine|valentine's|love\s+gift/.test(text)) picks.add('valentines_day');
  if (/mother'?s\s+day|mom|mum/.test(text)) picks.add('mothers_day');
  if (/father'?s\s+day|dad/.test(text)) picks.add('fathers_day');
  if (/graduation|graduate|class of/.test(text)) picks.add('graduation');
  if (/housewarming|new home|moving in/.test(text)) picks.add('housewarming');
  if (/thank you|appreciation|gratitude/.test(text)) picks.add('thank_you');
  if (/get well|recovery|feel better/.test(text)) picks.add('get_well');
  if (/congratulations|congrats/.test(text)) picks.add('congratulations');
  if (/retirement|retiree|retiring/.test(text)) picks.add('retirement');

  // Generic fallbacks based on product types
  if (/jewelry|necklace|ring|bracelet|romantic|love/.test(text)) picks.add('anniversary');
  if (/luxury|premium|experience|spa|massage/.test(text)) picks.add('birthday');

  return Array.from(picks);
}

async function llmOccasionsFallback(title: string, description: string, max: number): Promise<OccasionName[]> {
  const sys = 'You classify products into suitable gift occasions from a fixed list.';
  const user = `Product title: ${title}\nProduct description: ${description.substring(0, 600)}\n\nOccasions list (return 0-${max} best): ${OCCASIONS.join(', ')}\nRespond with a JSON array of occasion names, lowercase, snake_case.`;
  try {
    const content = await chatCompletion({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      jsonMode: true,
    });
    const parsed = JSON.parse(content);
    const arr: string[] = Array.isArray(parsed) ? parsed : parsed.occasions || [];
    return arr.filter((x) => OCCASIONS.includes(x as OccasionName)) as OccasionName[];
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? parseInt(args[limitArg + 1]) : 1000;
  const live = args.includes('--live');
  const useLLM = args.includes('--use-llm');

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  console.log(chalk.bold.cyan(`\n🎉 Tagging occasions (${live ? 'LIVE' : 'DRY-RUN'})\n`));

  try {
    const res = await session.run(
      `MATCH (p:Product)
       WHERE NOT (p)-[:SUITABLE_FOR]->(:Occasion)
       RETURN p.id as id, p.title as title, p.description as description
       LIMIT $limit`,
      { limit }
    );

    const products = res.records.map((r) => ({
      id: r.get('id'),
      title: r.get('title') || '',
      description: r.get('description') || '',
    }));

    console.log(chalk.white(`Found ${products.length} products missing occasions`));

    let totalTagged = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const heuristic = simpleHeuristics(p.title, p.description);
      let finalOccasions = heuristic.slice(0, 2);

      if (useLLM && finalOccasions.length < 2) {
        const remaining = 2 - finalOccasions.length;
        const llm = await llmOccasionsFallback(p.title, p.description, remaining);
        for (const o of llm) {
          if (!finalOccasions.includes(o)) finalOccasions.push(o);
        }
      }

      if (finalOccasions.length === 0) continue;

      if (live) {
        await session.run(
          `UNWIND $list as name
           MERGE (o:Occasion {name: name})
           WITH o
           MATCH (p:Product {id: $id})
           MERGE (p)-[:SUITABLE_FOR]->(o)`,
          { id: p.id, list: finalOccasions }
        );
      }

      totalTagged += finalOccasions.length;
      if ((i + 1) % 50 === 0) {
        console.log(chalk.gray(`  processed ${i + 1}/${products.length}`));
      }
    }

    console.log(
      chalk.green(`\n✓ ${live ? 'Tagged' : 'Would tag'} ${totalTagged} edges across ${products.length} products`)
    );
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch((err) => {
  console.error(chalk.red('Tagging failed:'), err);
  process.exit(1);
});

