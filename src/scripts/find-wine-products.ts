import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

async function findWineProducts() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('\n=== Searching for Wine-Related Products ===\n');

    // Search 1: Products with "wine" in title or description
    const textSearch = await session.run(`
      MATCH (p:Product)
      WHERE toLower(p.title) CONTAINS 'wine'
         OR toLower(p.description) CONTAINS 'wine'
      RETURN p.id as id, p.title as title, p.price as price,
             substring(p.description, 0, 100) as desc
      LIMIT 20
    `);

    console.log(`Found ${textSearch.records.length} products with "wine" in title/description:\n`);
    textSearch.records.forEach((r, i) => {
      console.log(`${i + 1}. ${r.get('title')} - $${r.get('price')}`);
      console.log(`   ${r.get('desc')}...\n`);
    });

    // Search 2: Check if there's a "wine" interest
    const interestSearch = await session.run(`
      MATCH (i:Interest)
      WHERE toLower(i.name) CONTAINS 'wine'
      RETURN i.name as name, i.description as description
    `);

    console.log(`\n=== Wine Interests ===`);
    console.log(`Found ${interestSearch.records.length} wine-related interests:\n`);
    interestSearch.records.forEach((r) => {
      console.log(`- ${r.get('name')}: ${r.get('description')}`);
    });

    // Search 3: Products connected to wine interest
    const connectedProducts = await session.run(`
      MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
      WHERE toLower(i.name) CONTAINS 'wine'
      RETURN p.title as title, p.price as price, i.name as interest
      LIMIT 20
    `);

    console.log(`\n=== Products Connected to Wine Interest ===`);
    console.log(`Found ${connectedProducts.records.length} products:\n`);
    connectedProducts.records.forEach((r, i) => {
      console.log(`${i + 1}. ${r.get('title')} - $${r.get('price')} (via: ${r.get('interest')})`);
    });

    // Search 4: Broader alcohol/beverage search
    const beverageSearch = await session.run(`
      MATCH (p:Product)
      WHERE toLower(p.title) CONTAINS 'wine'
         OR toLower(p.title) CONTAINS 'beer'
         OR toLower(p.title) CONTAINS 'champagne'
         OR toLower(p.title) CONTAINS 'alcohol'
         OR toLower(p.title) CONTAINS 'drink'
         OR toLower(p.title) CONTAINS 'beverage'
      RETURN p.title as title, p.price as price
      LIMIT 30
    `);

    console.log(`\n=== All Alcohol/Beverage Products ===`);
    console.log(`Found ${beverageSearch.records.length} products:\n`);
    beverageSearch.records.forEach((r, i) => {
      console.log(`${i + 1}. ${r.get('title')} - $${r.get('price')}`);
    });

    // Search 5: Italy-related products
    const italySearch = await session.run(`
      MATCH (p:Product)
      WHERE toLower(p.title) CONTAINS 'italy'
         OR toLower(p.title) CONTAINS 'italian'
         OR toLower(p.description) CONTAINS 'italy'
         OR toLower(p.description) CONTAINS 'italian'
      RETURN p.title as title, p.price as price
      LIMIT 20
    `);

    console.log(`\n=== Italy-Related Products ===`);
    console.log(`Found ${italySearch.records.length} products:\n`);
    italySearch.records.forEach((r, i) => {
      console.log(`${i + 1}. ${r.get('title')} - $${r.get('price')}`);
    });

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

findWineProducts().catch(console.error);
