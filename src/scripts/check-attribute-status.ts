#!/usr/bin/env tsx
/**
 * Check the status of gift attributes in the database
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, getDriver, closeNeo4j } from '../src/lib/neo4j.js';

async function checkAttributeStatus() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('\n📊 Gift Attributes Status\n');

    // Total products
    const totalResult = await session.run('MATCH (p:Product) RETURN count(p) as total');
    const total = Number(totalResult.records[0].get('total'));
    console.log(`Total products: ${total.toLocaleString()}`);

    // Products with ANY attribute set
    const withAttrResult = await session.run(`
      MATCH (p:Product)
      WHERE p.is_experiential = true
         OR p.is_memory_making = true
         OR p.is_sentimental = true
         OR p.is_personalized = true
         OR p.is_practical = true
         OR p.is_luxury = true
         OR p.is_aspirational = true
         OR p.is_educational = true
         OR p.is_shared = true
         OR p.is_conversation_starter = true
         OR p.is_lasting_value = true
         OR p.is_consumable = true
         OR p.is_artistic = true
         OR p.is_minimalist = true
      RETURN count(p) as withAttributes
    `);
    const withAttributes = Number(withAttrResult.records[0].get('withAttributes'));
    console.log(`Products with attributes: ${withAttributes.toLocaleString()} (${((withAttributes / total) * 100).toFixed(1)}%)`);

    // Products WITHOUT any attributes
    const withoutAttrResult = await session.run(`
      MATCH (p:Product)
      WHERE (p.is_experiential IS NULL OR p.is_experiential = false)
        AND (p.is_memory_making IS NULL OR p.is_memory_making = false)
        AND (p.is_sentimental IS NULL OR p.is_sentimental = false)
        AND (p.is_personalized IS NULL OR p.is_personalized = false)
        AND (p.is_practical IS NULL OR p.is_practical = false)
        AND (p.is_luxury IS NULL OR p.is_luxury = false)
        AND (p.is_aspirational IS NULL OR p.is_aspirational = false)
        AND (p.is_educational IS NULL OR p.is_educational = false)
        AND (p.is_shared IS NULL OR p.is_shared = false)
        AND (p.is_conversation_starter IS NULL OR p.is_conversation_starter = false)
        AND (p.is_lasting_value IS NULL OR p.is_lasting_value = false)
        AND (p.is_consumable IS NULL OR p.is_consumable = false)
        AND (p.is_artistic IS NULL OR p.is_artistic = false)
        AND (p.is_minimalist IS NULL OR p.is_minimalist = false)
      RETURN count(p) as withoutAttributes
    `);
    const withoutAttributes = Number(withoutAttrResult.records[0].get('withoutAttributes'));
    console.log(`Products without attributes: ${withoutAttributes.toLocaleString()} (${((withoutAttributes / total) * 100).toFixed(1)}%)`);

    // Sample of products without attributes
    if (withoutAttributes > 0) {
      console.log('\n🔍 Sample products missing attributes:\n');
      const sampleResult = await session.run(`
        MATCH (p:Product)
        WHERE (p.is_experiential IS NULL OR p.is_experiential = false)
          AND (p.is_memory_making IS NULL OR p.is_memory_making = false)
          AND (p.is_sentimental IS NULL OR p.is_sentimental = false)
          AND (p.is_personalized IS NULL OR p.is_personalized = false)
          AND (p.is_practical IS NULL OR p.is_practical = false)
          AND (p.is_luxury IS NULL OR p.is_luxury = false)
          AND (p.is_aspirational IS NULL OR p.is_aspirational = false)
          AND (p.is_educational IS NULL OR p.is_educational = false)
          AND (p.is_shared IS NULL OR p.is_shared = false)
          AND (p.is_conversation_starter IS NULL OR p.is_conversation_starter = false)
          AND (p.is_lasting_value IS NULL OR p.is_lasting_value = false)
          AND (p.is_consumable IS NULL OR p.is_consumable = false)
          AND (p.is_artistic IS NULL OR p.is_artistic = false)
          AND (p.is_minimalist IS NULL OR p.is_minimalist = false)
        RETURN p.id as id, p.title as title, p.price as price
        LIMIT 10
      `);

      sampleResult.records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.get('title')} ($${record.get('price') || 'N/A'})`);
        console.log(`   ID: ${record.get('id')}`);
      });
    }

    // Attribute distribution
    console.log('\n📈 Attribute Distribution:\n');
    const attributeNames = [
      'is_experiential',
      'is_memory_making',
      'is_sentimental',
      'is_personalized',
      'is_practical',
      'is_luxury',
      'is_aspirational',
      'is_educational',
      'is_shared',
      'is_conversation_starter',
      'is_lasting_value',
      'is_consumable',
      'is_artistic',
      'is_minimalist'
    ];

    for (const attr of attributeNames) {
      const result = await session.run(
        `MATCH (p:Product) WHERE p.${attr} = true RETURN count(p) as count`
      );
      const count = Number(result.records[0].get('count'));
      const percentage = ((count / total) * 100).toFixed(1);
      console.log(`${attr.padEnd(30)} ${count.toString().padStart(6)} (${percentage}%)`);
    }

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

checkAttributeStatus().catch(console.error);
