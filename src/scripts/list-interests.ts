import { initNeo4j, closeNeo4j } from '../src/lib/neo4j';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function listInterests() {
  const driver = await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: 'neo4j',
  });

  const session = driver.session();

  try {
    // Get all Interest nodes
    const result = await session.run(`
      MATCH (i:Interest)
      RETURN i.name AS name
      ORDER BY name
    `);

    console.log('\n📚 Interest Nodes in Database:');
    console.log('================================');

    const interests = result.records.map(r => r.get('name'));
    interests.forEach((interest, i) => {
      console.log(`${i + 1}. ${interest}`);
    });

    console.log(`\nTotal: ${interests.length} interests`);
    console.log('\nCopy-paste array:');
    console.log(JSON.stringify(interests, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

listInterests();
