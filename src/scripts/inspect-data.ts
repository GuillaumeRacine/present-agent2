#!/usr/bin/env tsx
/**
 * Database Inspection Tool
 *
 * Quick script to manually inspect graph data
 * Usage: npm run inspect
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';
import chalk from 'chalk';

async function sampleProducts() {
  console.log(chalk.bold.cyan('\n📦 SAMPLE PRODUCTS WITH ATTRIBUTES\n'));

  const session = getSession();
  const result = await session.run(`
    MATCH (p:Product)
    WHERE p.is_practical IS NOT NULL OR p.is_luxury IS NOT NULL
    RETURN p.id as id,
           p.title as title,
           p.price as price,
           p.vendor as vendor,
           p.is_practical as practical,
           p.is_luxury as luxury,
           p.is_sentimental as sentimental,
           p.is_experiential as experiential,
           p.is_personalized as personalized
    ORDER BY rand()
    LIMIT 10
  `);

  result.records.forEach((record, idx) => {
    const product = record.toObject();
    console.log(chalk.green(`\n${idx + 1}. ${product.title}`));
    console.log(chalk.gray(`   ID: ${product.id}`));
    console.log(chalk.gray(`   Price: $${product.price} | Vendor: ${product.vendor || 'Unknown'}`));

    const attrs = [];
    if (product.practical) attrs.push('practical');
    if (product.luxury) attrs.push('luxury');
    if (product.sentimental) attrs.push('sentimental');
    if (product.experiential) attrs.push('experiential');
    if (product.personalized) attrs.push('personalized');

    console.log(chalk.blue(`   Attributes: ${attrs.join(', ') || 'none'}`));
  });

  await session.close();
}

async function sampleRecipients() {
  console.log(chalk.bold.cyan('\n👤 SAMPLE RECIPIENTS\n'));

  const session = getSession();
  const result = await session.run(`
    MATCH (r:Recipient)
    OPTIONAL MATCH (r)-[:HAS_INTEREST]->(i:Interest)
    WITH r, collect(i.name)[0..10] as interests
    RETURN r.id as id,
           r.name as name,
           r.relationship as relationship,
           r.age as age,
           r.gender as gender,
           interests
    LIMIT 5
  `);

  result.records.forEach((record, idx) => {
    const recipient = record.toObject();
    console.log(chalk.green(`\n${idx + 1}. ${recipient.name || 'Unnamed'}`));
    console.log(chalk.gray(`   ID: ${recipient.id}`));
    console.log(chalk.gray(`   Relationship: ${recipient.relationship || 'N/A'}`));
    console.log(chalk.gray(`   Age: ${recipient.age || 'N/A'} | Gender: ${recipient.gender || 'N/A'}`));
    if (recipient.interests && recipient.interests.length > 0) {
      console.log(chalk.blue(`   Interests: ${recipient.interests.slice(0, 5).join(', ')}...`));
    }
  });

  await session.close();
}

async function sampleConversations() {
  console.log(chalk.bold.cyan('\n💬 RECENT CONVERSATIONS\n'));

  const session = getSession();
  const result = await session.run(`
    MATCH (c:Conversation)
    RETURN c.sessionId as sessionId,
           c.userId as userId,
           c.userQuery as query,
           c.recommendationCount as count,
           c.timestamp as timestamp,
           c.success as success
    ORDER BY c.timestamp DESC
    LIMIT 10
  `);

  result.records.forEach((record, idx) => {
    const conv = record.toObject();
    console.log(chalk.green(`\n${idx + 1}. ${conv.query?.substring(0, 60)}...`));
    console.log(chalk.gray(`   User: ${conv.userId}`));
    console.log(chalk.gray(`   Session: ${conv.sessionId}`));
    console.log(chalk.gray(`   Recommendations: ${conv.count || 0}`));
    console.log(chalk.gray(`   Time: ${new Date(conv.timestamp).toLocaleString()}`));
    console.log(conv.success ? chalk.green('   ✓ Success') : chalk.red('   ✗ Failed'));
  });

  await session.close();
}

async function sampleInterests() {
  console.log(chalk.bold.cyan('\n🎯 SAMPLE INTERESTS\n'));

  const session = getSession();
  const result = await session.run(`
    MATCH (i:Interest)<-[:HAS_INTEREST]-(p:Product)
    WITH i, count(p) as productCount
    ORDER BY productCount DESC
    RETURN i.name as interest,
           i.category as category,
           productCount
    LIMIT 20
  `);

  result.records.forEach((record, idx) => {
    const interest = record.toObject();
    console.log(chalk.green(`${idx + 1}. ${interest.interest}`));
    console.log(chalk.gray(`   Category: ${interest.category || 'N/A'} | Products: ${interest.productCount}`));
  });

  await session.close();
}

async function databaseStats() {
  console.log(chalk.bold.cyan('\n📊 DATABASE STATISTICS\n'));

  const session = getSession();
  const stats = await session.run(`
    MATCH (p:Product) WITH count(p) as products
    MATCH (r:Recipient) WITH products, count(r) as recipients
    MATCH (i:Interest) WITH products, recipients, count(i) as interests
    MATCH (c:Conversation) WITH products, recipients, interests, count(c) as conversations
    MATCH (p2:Product) WHERE p2.is_practical IS NOT NULL
    WITH products, recipients, interests, conversations, count(p2) as withAttributes
    RETURN products, recipients, interests, conversations, withAttributes
  `);

  const data = stats.records[0].toObject();

  console.log(chalk.white(`Total Products: ${chalk.bold(data.products)}`));
  console.log(chalk.white(`Products with Attributes: ${chalk.bold(data.withAttributes)} (${((data.withAttributes/data.products)*100).toFixed(1)}%)`));
  console.log(chalk.white(`Total Recipients: ${chalk.bold(data.recipients)}`));
  console.log(chalk.white(`Total Interests: ${chalk.bold(data.interests)}`));
  console.log(chalk.white(`Total Conversations: ${chalk.bold(data.conversations)}`));

  await session.close();
}

async function specificProduct(productId: string) {
  console.log(chalk.bold.cyan(`\n🔍 PRODUCT DETAILS: ${productId}\n`));

  const session = getSession();
  const result = await session.run(`
    MATCH (p:Product {id: $productId})
    OPTIONAL MATCH (p)-[:HAS_INTEREST]->(i:Interest)
    WITH p, collect(i.name) as interests
    RETURN p, interests
  `, { productId });

  if (result.records.length === 0) {
    console.log(chalk.red('Product not found'));
    await session.close();
    return;
  }

  const record = result.records[0];
  const product = record.get('p').properties;
  const interests = record.get('interests');

  console.log(chalk.green(product.title));
  console.log(chalk.gray(`ID: ${product.id}`));
  console.log(chalk.gray(`Price: $${product.price}`));
  console.log(chalk.gray(`Vendor: ${product.vendor || 'Unknown'}`));
  console.log(chalk.gray(`Description: ${product.description?.substring(0, 200)}...`));

  console.log(chalk.bold('\nAttributes:'));
  Object.keys(product).forEach(key => {
    if (key.startsWith('is_') && product[key] === true) {
      console.log(chalk.blue(`  ✓ ${key.replace('is_', '')}`));
    }
  });

  if (interests && interests.length > 0) {
    console.log(chalk.bold('\nInterests:'));
    interests.slice(0, 20).forEach((interest: string) => {
      console.log(chalk.cyan(`  • ${interest}`));
    });
    if (interests.length > 20) {
      console.log(chalk.gray(`  ... and ${interests.length - 20} more`));
    }
  }

  await session.close();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  try {
    if (command === 'product' && args[1]) {
      await specificProduct(args[1]);
    } else if (command === 'products') {
      await sampleProducts();
    } else if (command === 'recipients') {
      await sampleRecipients();
    } else if (command === 'conversations') {
      await sampleConversations();
    } else if (command === 'interests') {
      await sampleInterests();
    } else if (command === 'stats') {
      await databaseStats();
    } else {
      // Show everything
      await databaseStats();
      await sampleProducts();
      await sampleInterests();
      await sampleRecipients();
      await sampleConversations();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  } finally {
    await closeNeo4j();
  }
}

main();
