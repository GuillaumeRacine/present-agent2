#!/usr/bin/env tsx
/**
 * Check Coffee Products in Database
 *
 * Investigates why coffee products are not appearing in search results
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';

async function main() {
  console.log('\n🔍 Investigating Coffee Products\n');
  console.log('='.repeat(80));

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const session = getSession();

  try {
    // 1. Check total products
    console.log('\n1. Total Products:');
    const totalResult = await session.run(`
      MATCH (p:Product)
      RETURN count(p) as total
    `);
    console.log(`   Total products in database: ${totalResult.records[0].get('total')}`);

    // 2. Check products with "coffee" interest
    console.log('\n2. Products with Coffee Interest:');
    const coffeeInterestResult = await session.run(`
      MATCH (p:Product)-[:HAS_INTEREST]->(i:Interest)
      WHERE i.name =~ '(?i).*coffee.*'
      RETURN i.name as interest, count(p) as products
      ORDER BY products DESC
    `);

    if (coffeeInterestResult.records.length === 0) {
      console.log('   ❌ No products have coffee-related interests!');
    } else {
      coffeeInterestResult.records.forEach(record => {
        console.log(`   - ${record.get('interest')}: ${record.get('products')} products`);
      });
    }

    // 3. Check all interests to see what's available
    console.log('\n3. All Interest Names (sample):');
    const allInterestsResult = await session.run(`
      MATCH (i:Interest)
      RETURN i.name as interest
      ORDER BY i.name
      LIMIT 20
    `);
    allInterestsResult.records.forEach(record => {
      console.log(`   - ${record.get('interest')}`);
    });

    // 4. Search products by title/description containing "coffee"
    console.log('\n4. Products with "coffee" in Title/Description:');
    const coffeeTextResult = await session.run(`
      MATCH (p:Product)
      WHERE p.title =~ '(?i).*coffee.*' OR p.description =~ '(?i).*coffee.*'
      RETURN p.id as id, p.title as title, p.price as price
      LIMIT 10
    `);

    if (coffeeTextResult.records.length === 0) {
      console.log('   ❌ No products mention "coffee" in title or description!');
    } else {
      console.log(`   Found ${coffeeTextResult.records.length} products:`);
      coffeeTextResult.records.forEach(record => {
        console.log(`   - ${record.get('title')} ($${record.get('price')})`);
      });
    }

    // 5. Check if coffee interest exists at all
    console.log('\n5. Coffee Interest Node:');
    const coffeeNodeResult = await session.run(`
      MATCH (i:Interest)
      WHERE i.name = 'coffee'
      RETURN i.name as name, i.id as id
    `);

    if (coffeeNodeResult.records.length === 0) {
      console.log('   ❌ "coffee" interest node does not exist!');

      // Check similar interests
      console.log('\n   Looking for similar interests:');
      const similarResult = await session.run(`
        MATCH (i:Interest)
        WHERE i.name =~ '(?i).*(coffee|beverage|drink|brew).*'
        RETURN i.name as name
        ORDER BY i.name
        LIMIT 10
      `);

      if (similarResult.records.length > 0) {
        similarResult.records.forEach(record => {
          console.log(`     - ${record.get('name')}`);
        });
      } else {
        console.log('     No similar interests found');
      }
    } else {
      console.log(`   ✓ Coffee interest exists: ${coffeeNodeResult.records[0].get('name')}`);
    }

    // 6. Check products with gift attributes related to consumables
    console.log('\n6. Products with Consumable Attribute:');
    const consumableResult = await session.run(`
      MATCH (p:Product)
      WHERE p.isConsumable = true
      RETURN count(p) as total
    `);
    console.log(`   ${consumableResult.records[0].get('total')} products marked as consumable`);

    // 7. Sample some products to see their structure
    console.log('\n7. Sample Product Structure:');
    const sampleResult = await session.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:HAS_INTEREST]->(i:Interest)
      WITH p, collect(i.name) as interests
      RETURN p.id as id, p.title as title, p.price as price, interests
      LIMIT 5
    `);

    sampleResult.records.forEach(record => {
      const interests = record.get('interests');
      console.log(`\n   Product: ${record.get('title')}`);
      console.log(`   Price: $${record.get('price')}`);
      console.log(`   Interests: ${interests.length > 0 ? interests.join(', ') : 'NONE'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✓ Investigation complete\n');
}

main().catch(console.error);
