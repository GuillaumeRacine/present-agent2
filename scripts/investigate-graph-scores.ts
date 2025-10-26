/**
 * Investigate why graph scores might be 0
 * Check if products have MATCHES_INTEREST relationships to coffee/reading
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j } from '../src/lib/neo4j';

async function investigate() {
  const driver = await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: 'neo4j',
  });

  const session = driver.session();

  try {
    console.log('\n🔍 Investigating Graph Scores\n');
    console.log('=' .repeat(60));

    // 1. Check if coffee/reading interests exist
    console.log('\n1. Checking Interest nodes:');
    const interestsResult = await session.run(`
      MATCH (i:Interest)
      WHERE i.name IN ['coffee', 'reading']
      RETURN i.name AS name
      ORDER BY name
    `);

    const interests = interestsResult.records.map(r => r.get('name'));
    console.log('   Found interests:', interests);

    if (interests.length === 0) {
      console.log('   ❌ No coffee or reading interests found!');
      await session.close();
      await closeNeo4j();
      return;
    }

    // 2. Check products with coffee interest
    console.log('\n2. Products with "coffee" interest:');
    const coffeeResult = await session.run(`
      MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
      RETURN p.id AS id, p.title AS title, r.relevance_score AS score
      ORDER BY r.relevance_score DESC
      LIMIT 5
    `);

    if (coffeeResult.records.length > 0) {
      console.log('   ✅ Found products:');
      coffeeResult.records.forEach(r => {
        console.log(`   - ${r.get('title')} (score: ${r.get('score')})`);
      });
    } else {
      console.log('   ❌ No products found with coffee interest!');
    }

    // 3. Check products with reading interest
    console.log('\n3. Products with "reading" interest:');
    const readingResult = await session.run(`
      MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest {name: 'reading'})
      RETURN p.id AS id, p.title AS title, r.relevance_score AS score
      ORDER BY r.relevance_score DESC
      LIMIT 5
    `);

    if (readingResult.records.length > 0) {
      console.log('   ✅ Found products:');
      readingResult.records.forEach(r => {
        console.log(`   - ${r.get('title')} (score: ${r.get('score')})`);
      });
    } else {
      console.log('   ❌ No products found with reading interest!');
    }

    // 4. Check a specific product (CLIFF HANGER ESPRESSO from test)
    console.log('\n4. Checking specific product: "CLIFF HANGER ESPRESSO"');
    const productResult = await session.run(`
      MATCH (p:Product {title: 'CLIFF HANGER ESPRESSO'})
      OPTIONAL MATCH (p)-[r:MATCHES_INTEREST]->(i:Interest)
      RETURN p.id AS id, p.title AS title, p.price AS price,
             COLLECT({interest: i.name, score: r.relevance_score}) AS interests
    `);

    if (productResult.records.length > 0) {
      const record = productResult.records[0];
      console.log(`   Product: ${record.get('title')}`);
      console.log(`   Price: $${record.get('price')}`);
      const interests = record.get('interests').filter((i: any) => i.interest);
      if (interests.length > 0) {
        console.log('   Interests:');
        interests.forEach((i: any) => {
          console.log(`   - ${i.interest} (score: ${i.score})`);
        });
      } else {
        console.log('   ❌ No interests linked to this product!');
      }
    }

    // 5. Test the actual Cypher query logic with coffee/reading
    console.log('\n5. Testing hybrid query logic:');
    console.log('   Simulating Explorer query with interests: ["coffee", "reading"]');

    const testResult = await session.run(`
      MATCH (p:Product)
      WHERE p.available = true
        AND p.price >= 40
        AND p.price <= 65

      // Interest matching
      OPTIONAL MATCH (p)-[mi:MATCHES_INTEREST]->(i:Interest)
      WHERE i.name IN $interests
      WITH p,
        COLLECT(DISTINCT {name: i.name, strength: mi.relevance_score}) AS matchedInterests,
        COALESCE(AVG(mi.relevance_score), 0) AS interestScore

      WHERE SIZE(matchedInterests) > 0  // Only products with at least one interest match

      RETURN p.title AS title,
             p.price AS price,
             interestScore,
             matchedInterests
      ORDER BY interestScore DESC
      LIMIT 5
    `, { interests: ['coffee', 'reading'] });

    if (testResult.records.length > 0) {
      console.log('   ✅ Query found products:');
      testResult.records.forEach(r => {
        const interests = r.get('matchedInterests');
        const interestNames = interests.map((i: any) => i.name).filter(Boolean);
        console.log(`   - ${r.get('title')} ($${r.get('price')})`);
        console.log(`     Interest score: ${r.get('interestScore')}`);
        console.log(`     Matched: ${interestNames.join(', ')}`);
      });
    } else {
      console.log('   ❌ Query returned no products!');
      console.log('   This means the WHERE i.name IN $interests is not matching anything');
    }

    // 6. Check total MATCHES_INTEREST relationships
    console.log('\n6. Overall statistics:');
    const statsResult = await session.run(`
      MATCH ()-[r:MATCHES_INTEREST]->()
      RETURN COUNT(r) AS totalMatches
    `);
    console.log(`   Total MATCHES_INTEREST relationships: ${statsResult.records[0].get('totalMatches')}`);

    const coffeeCountResult = await session.run(`
      MATCH ()-[r:MATCHES_INTEREST]->(i:Interest {name: 'coffee'})
      RETURN COUNT(r) AS count
    `);
    console.log(`   Products with coffee interest: ${coffeeCountResult.records[0].get('count')}`);

    const readingCountResult = await session.run(`
      MATCH ()-[r:MATCHES_INTEREST]->(i:Interest {name: 'reading'})
      RETURN COUNT(r) AS count
    `);
    console.log(`   Products with reading interest: ${readingCountResult.records[0].get('count')}`);

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

investigate();
