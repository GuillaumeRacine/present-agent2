/**
 * Check product connections in detail
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getDriver } from '../src/lib/neo4j.js';

async function main() {
  try {
    console.log('\n🔍 Checking Product Connections\n');

    await initNeo4j({
      uri: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
      database: process.env.NEO4J_DATABASE || 'neo4j',
    });

    const driver = getDriver();
    const session = driver.session();

    try {
      // Check first 10 products
      const result = await session.run(`
        MATCH (p:Product)
        WHERE p.id IN ['1', '10', '100', '1000', '10000', '5', '50', '500', '5000', '15000']
        OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(i:Interest)
        OPTIONAL MATCH (p)-[:ALIGNS_WITH]->(v:Value)
        OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(o:Occasion)
        RETURN p.id as id, p.title as title,
               collect(DISTINCT i.name) as interests,
               collect(DISTINCT v.name) as values,
               collect(DISTINCT o.name) as occasions,
               size(collect(DISTINCT i)) as interestCount,
               size(collect(DISTINCT v)) as valueCount,
               size(collect(DISTINCT o)) as occasionCount
        ORDER BY p.id
      `);

      console.log('Product connections:');
      result.records.forEach(record => {
        const id = record.get('id');
        const title = record.get('title');
        const interests = record.get('interests').filter((i: any) => i);
        const values = record.get('values').filter((v: any) => v);
        const occasions = record.get('occasions').filter((o: any) => o);

        console.log(`\n${id}: ${title}`);
        console.log(`  Interests (${interests.length}): ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`);
        console.log(`  Values (${values.length}): ${values.slice(0, 3).join(', ')}${values.length > 3 ? '...' : ''}`);
        console.log(`  Occasions (${occasions.length}): ${occasions.slice(0, 3).join(', ')}${occasions.length > 3 ? '...' : ''}`);
      });

      // Check what interests exist
      console.log('\n\nAvailable Interests:');
      const interestsResult = await session.run('MATCH (i:Interest) RETURN i.name as name ORDER BY i.name');
      const interestNames = interestsResult.records.map(r => r.get('name'));
      console.log(interestNames.join(', '));

      // Check what values exist
      console.log('\n\nAvailable Values:');
      const valuesResult = await session.run('MATCH (v:Value) RETURN v.name as name ORDER BY v.name');
      const valueNames = valuesResult.records.map(r => r.get('name'));
      console.log(valueNames.join(', '));

      // Check what occasions exist
      console.log('\n\nAvailable Occasions:');
      const occasionsResult = await session.run('MATCH (o:Occasion) RETURN o.name as name ORDER BY o.name');
      const occasionNames = occasionsResult.records.map(r => r.get('name'));
      console.log(occasionNames.join(', '));

      // Find products connected to "coffee" or "reading" interests
      console.log('\n\nProducts with coffee/reading interests:');
      const coffeeResult = await session.run(`
        MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
        WHERE toLower(i.name) CONTAINS 'coffee' OR toLower(i.name) CONTAINS 'read'
        RETURN p.id as id, p.title as title, p.price as price, collect(i.name) as interests
        LIMIT 5
      `);

      coffeeResult.records.forEach(record => {
        console.log(`  ${record.get('title')} ($${record.get('price')}) - ${record.get('interests').join(', ')}`);
      });

    } finally {
      await session.close();
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

main();
