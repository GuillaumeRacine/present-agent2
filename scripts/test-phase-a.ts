import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';
import { generateEmbedding } from '../src/lib/llm.js';

async function testPhaseA() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('\n=== Phase A Test: Wine Product Discovery ===\n');

    // Generate embedding for wine query
    const semanticQuery = 'wine lover gift birthday thoughtful appreciation';
    console.log('Generating embedding for:', semanticQuery);
    const queryEmbedding = await generateEmbedding(semanticQuery);

    // Test 1: Vector search with window = 100
    console.log('\n--- Test 1: Vector window = 100 ---');
    const result100 = await session.run(`
      CALL db.index.vector.queryNodes('product_embedding', 100, $queryEmbedding)
      YIELD node AS product, score AS semanticScore
      WHERE product.available = true
        AND product.price >= 25
        AND product.price <= 75

      // Text fallback for wine
      WITH product, semanticScore,
        [interest IN ['wine'] WHERE
          toLower(product.title) CONTAINS toLower(interest) OR
          toLower(product.description) CONTAINS toLower(interest)
        ] AS textMatchedInterests

      WITH product, semanticScore,
        CASE
          WHEN SIZE(textMatchedInterests) > 0 THEN 0.6
          ELSE 0
        END AS interestScore,
        SIZE(textMatchedInterests) > 0 AS hasTextMatch

      WHERE hasTextMatch = true

      RETURN product.title as title,
             product.price as price,
             semanticScore,
             interestScore,
             (0.35 * interestScore) as graphScore,
             (0.60 * (0.35 * interestScore) + 0.40 * semanticScore) as hybridScore
      ORDER BY hybridScore DESC
      LIMIT 10
    `, { queryEmbedding });

    console.log(`Found ${result100.records.length} wine products with text matching:`);
    result100.records.forEach((r, i) => {
      console.log(
        `  ${i + 1}. ${r.get('title').substring(0, 60)} - $${r.get('price')} ` +
        `(hybrid: ${r.get('hybridScore').toFixed(3)}, interest: ${r.get('interestScore').toFixed(2)})`
      );
    });

    // Test 2: Count products in vector window with "wine" in text
    console.log('\n--- Test 2: Wine products in top 100 vector results ---');
    const wineInTop100 = await session.run(`
      CALL db.index.vector.queryNodes('product_embedding', 100, $queryEmbedding)
      YIELD node AS product, score AS semanticScore
      WHERE product.available = true
        AND product.price >= 25
        AND product.price <= 75
        AND (toLower(product.title) CONTAINS 'wine' OR toLower(product.description) CONTAINS 'wine')
      RETURN COUNT(*) as count
    `, { queryEmbedding });

    const wineCountRaw = wineInTop100.records[0].get('count');
    const wineCount = typeof wineCountRaw === 'number' ? wineCountRaw : wineCountRaw.toInt();
    console.log(`Wine products in top 100 vector results: ${wineCount}`);

    // Test 3: Compare to old window size (30)
    console.log('\n--- Test 3: Wine products in top 30 (old window) ---');
    const wineInTop30 = await session.run(`
      CALL db.index.vector.queryNodes('product_embedding', 30, $queryEmbedding)
      YIELD node AS product, score AS semanticScore
      WHERE product.available = true
        AND product.price >= 25
        AND product.price <= 75
        AND (toLower(product.title) CONTAINS 'wine' OR toLower(product.description) CONTAINS 'wine')
      RETURN COUNT(*) as count
    `, { queryEmbedding });

    const wineCount30Raw = wineInTop30.records[0].get('count');
    const wineCount30 = typeof wineCount30Raw === 'number' ? wineCount30Raw : wineCount30Raw.toInt();
    console.log(`Wine products in top 30 vector results: ${wineCount30}`);

    // Calculate improvement
    const improvement = wineCount > 0 ? ((wineCount / Math.max(wineCount30, 1)) * 100).toFixed(0) : 0;
    console.log(`\n📊 Improvement: ${improvement}% more wine products considered`);

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

testPhaseA().catch(console.error);
