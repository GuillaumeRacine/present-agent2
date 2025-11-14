/**
 * Neo4j Schema Setup
 *
 * Complete schema with:
 * - All node constraints (uniqueness)
 * - All vector indexes (10 embeddings)
 * - Property indexes for filtering/sorting
 * - Test data ingestion
 */

import { getSession } from '../lib/neo4j.js';
import { logSchemaSetup, logger } from '../lib/logger.js';

/**
 * Create all constraints for data integrity
 */
export async function createConstraints(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating Neo4j constraints...');

    const constraints = [
      { name: 'user_id', cypher: 'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE' },
      { name: 'recipient_id', cypher: 'CREATE CONSTRAINT recipient_id IF NOT EXISTS FOR (r:Recipient) REQUIRE r.id IS UNIQUE' },
      { name: 'product_id', cypher: 'CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE' },
      { name: 'interest_id', cypher: 'CREATE CONSTRAINT interest_id IF NOT EXISTS FOR (i:Interest) REQUIRE i.id IS UNIQUE' },
      { name: 'value_id', cypher: 'CREATE CONSTRAINT value_id IF NOT EXISTS FOR (v:Value) REQUIRE v.id IS UNIQUE' },
      { name: 'occasion_id', cypher: 'CREATE CONSTRAINT occasion_id IF NOT EXISTS FOR (o:Occasion) REQUIRE o.id IS UNIQUE' },
      { name: 'conversation_turn_id', cypher: 'CREATE CONSTRAINT conversation_turn_id IF NOT EXISTS FOR (ct:ConversationTurn) REQUIRE ct.id IS UNIQUE' },
      { name: 'recommendation_id', cypher: 'CREATE CONSTRAINT recommendation_id IF NOT EXISTS FOR (rec:Recommendation) REQUIRE rec.id IS UNIQUE' },
      { name: 'gift_archetype_id', cypher: 'CREATE CONSTRAINT gift_archetype_id IF NOT EXISTS FOR (ga:GiftArchetype) REQUIRE ga.id IS UNIQUE' },
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint.cypher);
        logSchemaSetup({
          operation: 'constraint',
          name: constraint.name,
          status: 'success'
        });
      } catch (error: any) {
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists' ||
            error.code === 'Neo.ClientError.Schema.IndexWithNameAlreadyExists') {
          logSchemaSetup({
            operation: 'constraint',
            name: constraint.name,
            status: 'exists'
          });
        } else {
          throw error;
        }
      }
    }

    logger.info('Constraints created successfully');

  } catch (error) {
    logger.error('Failed to create constraints', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Create regular indexes for query optimization
 */
export async function createIndexes(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating Neo4j property indexes...');

    const indexes = [
      { name: 'product_price', cypher: 'CREATE INDEX product_price IF NOT EXISTS FOR (p:Product) ON (p.price)' },
      { name: 'product_available', cypher: 'CREATE INDEX product_available IF NOT EXISTS FOR (p:Product) ON (p.available)' },
      { name: 'conversation_timestamp', cypher: 'CREATE INDEX conversation_timestamp IF NOT EXISTS FOR (ct:ConversationTurn) ON (ct.timestamp)' },
      { name: 'recommendation_timestamp', cypher: 'CREATE INDEX recommendation_timestamp IF NOT EXISTS FOR (rec:Recommendation) ON (rec.timestamp)' },
      { name: 'user_email', cypher: 'CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)' },
    ];

    for (const index of indexes) {
      try {
        await session.run(index.cypher);
        logSchemaSetup({
          operation: 'index',
          name: index.name,
          status: 'success'
        });
      } catch (error: any) {
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists' ||
            error.code === 'Neo.ClientError.Schema.IndexWithNameAlreadyExists') {
          logSchemaSetup({
            operation: 'index',
            name: index.name,
            status: 'exists'
          });
        } else {
          throw error;
        }
      }
    }

    logger.info('Property indexes created successfully');

  } catch (error) {
    logger.error('Failed to create indexes', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Create vector indexes for embedding similarity search
 */
export async function createVectorIndexes(): Promise<void> {
  const session = getSession();

  try {
    logger.info('Creating vector indexes for embeddings...');

    const vectorIndexes = [
      // User embeddings
      { name: 'user_profile_embedding', node: 'User', property: 'profile_embedding' },
      { name: 'user_value_embedding', node: 'User', property: 'value_embedding' },
      { name: 'user_style_embedding', node: 'User', property: 'style_embedding' },

      // Product embeddings (CRITICAL for Explorer)
      { name: 'product_embedding', node: 'Product', property: 'product_embedding' },
      { name: 'product_style_embedding', node: 'Product', property: 'style_embedding' },
      { name: 'product_sentiment_embedding', node: 'Product', property: 'sentiment_embedding' },
      { name: 'product_use_case_embedding', node: 'Product', property: 'use_case_embedding' },

      // Recipient embeddings
      { name: 'recipient_interest_embedding', node: 'Recipient', property: 'interest_embedding' },
      { name: 'recipient_personality_embedding', node: 'Recipient', property: 'personality_embedding' },

      // Interest/Value/Occasion embeddings
      { name: 'interest_embedding', node: 'Interest', property: 'interest_embedding' },
      { name: 'value_embedding', node: 'Value', property: 'value_embedding' },
      { name: 'occasion_embedding', node: 'Occasion', property: 'occasion_embedding' },
    ];

    for (const vectorIndex of vectorIndexes) {
      try {
        await session.run(`
          CREATE VECTOR INDEX ${vectorIndex.name} IF NOT EXISTS
          FOR (n:${vectorIndex.node}) ON (n.${vectorIndex.property})
          OPTIONS {
            indexConfig: {
              \`vector.dimensions\`: 1536,
              \`vector.similarity_function\`: 'cosine'
            }
          }
        `);
        logSchemaSetup({
          operation: 'vector_index',
          name: vectorIndex.name,
          status: 'success'
        });
      } catch (error: any) {
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          logSchemaSetup({
            operation: 'vector_index',
            name: vectorIndex.name,
            status: 'exists'
          });
        } else {
          throw error;
        }
      }
    }

    logger.info('Vector indexes created successfully');

  } catch (error) {
    logger.error('Failed to create vector indexes', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Generate mock embedding (for test data)
 */
function generateMockEmbedding(): number[] {
  // Generate 1536-dimensional mock embedding with random values
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

/**
 * Ingest test data for development
 */
export async function ingestTestData(verbose: boolean = false): Promise<void> {
  const session = getSession();

  try {
    logger.info('Ingesting test data...');

    // 1. Create test users
    if (verbose) logger.info('Creating test users...');
    await session.run(`
      CREATE (u1:User {
        id: 'user_test_001',
        email: 'john@example.com',
        name: 'John Doe',
        profile_embedding: $profileEmbed1,
        value_embedding: $valueEmbed1,
        style_embedding: $styleEmbed1,
        created_at: datetime()
      })
      CREATE (u2:User {
        id: 'user_test_002',
        email: 'sarah@example.com',
        name: 'Sarah Smith',
        profile_embedding: $profileEmbed2,
        value_embedding: $valueEmbed2,
        style_embedding: $styleEmbed2,
        created_at: datetime()
      })
    `, {
      profileEmbed1: generateMockEmbedding(),
      valueEmbed1: generateMockEmbedding(),
      styleEmbed1: generateMockEmbedding(),
      profileEmbed2: generateMockEmbedding(),
      valueEmbed2: generateMockEmbedding(),
      styleEmbed2: generateMockEmbedding(),
    });

    // 2. Create common interests
    if (verbose) logger.info('Creating interests...');
    await session.run(`
      CREATE (i1:Interest {
        id: 'interest_coffee',
        name: 'coffee',
        interest_embedding: $embed1
      })
      CREATE (i2:Interest {
        id: 'interest_reading',
        name: 'reading',
        interest_embedding: $embed2
      })
      CREATE (i3:Interest {
        id: 'interest_hiking',
        name: 'hiking',
        interest_embedding: $embed3
      })
      CREATE (i4:Interest {
        id: 'interest_cooking',
        name: 'cooking',
        interest_embedding: $embed4
      })
      CREATE (i5:Interest {
        id: 'interest_yoga',
        name: 'yoga',
        interest_embedding: $embed5
      })
      CREATE (i6:Interest {
        id: 'interest_gaming',
        name: 'gaming',
        interest_embedding: $embed6
      })
      CREATE (i7:Interest {
        id: 'interest_gardening',
        name: 'gardening',
        interest_embedding: $embed7
      })
    `, {
      embed1: generateMockEmbedding(),
      embed2: generateMockEmbedding(),
      embed3: generateMockEmbedding(),
      embed4: generateMockEmbedding(),
      embed5: generateMockEmbedding(),
      embed6: generateMockEmbedding(),
      embed7: generateMockEmbedding(),
    });

    // 3. Create common values
    if (verbose) logger.info('Creating values...');
    await session.run(`
      CREATE (v1:Value {
        id: 'value_eco_friendly',
        name: 'eco-friendly',
        value_embedding: $embed1
      })
      CREATE (v2:Value {
        id: 'value_vegan',
        name: 'vegan',
        value_embedding: $embed2
      })
      CREATE (v3:Value {
        id: 'value_handmade',
        name: 'handmade',
        value_embedding: $embed3
      })
      CREATE (v4:Value {
        id: 'value_local',
        name: 'local',
        value_embedding: $embed4
      })
      CREATE (v5:Value {
        id: 'value_minimalist',
        name: 'minimalist',
        value_embedding: $embed5
      })
    `, {
      embed1: generateMockEmbedding(),
      embed2: generateMockEmbedding(),
      embed3: generateMockEmbedding(),
      embed4: generateMockEmbedding(),
      embed5: generateMockEmbedding(),
    });

    // 4. Create common occasions
    if (verbose) logger.info('Creating occasions...');
    await session.run(`
      CREATE (o1:Occasion {
        id: 'occasion_birthday',
        name: 'birthday',
        occasion_embedding: $embed1
      })
      CREATE (o2:Occasion {
        id: 'occasion_anniversary',
        name: 'anniversary',
        occasion_embedding: $embed2
      })
      CREATE (o3:Occasion {
        id: 'occasion_christmas',
        name: 'christmas',
        occasion_embedding: $embed3
      })
      CREATE (o4:Occasion {
        id: 'occasion_just_because',
        name: 'just_because',
        occasion_embedding: $embed4
      })
      CREATE (o5:Occasion {
        id: 'occasion_graduation',
        name: 'graduation',
        occasion_embedding: $embed5
      })
    `, {
      embed1: generateMockEmbedding(),
      embed2: generateMockEmbedding(),
      embed3: generateMockEmbedding(),
      embed4: generateMockEmbedding(),
      embed5: generateMockEmbedding(),
    });

    // 5. Create test recipients
    if (verbose) logger.info('Creating recipients...');
    await session.run(`
      MATCH (u:User {id: 'user_test_001'})
      CREATE (r1:Recipient {
        id: 'recipient_dad',
        name: 'Dad',
        age: 58,
        gender: 'male',
        interest_embedding: $interestEmbed1,
        personality_embedding: $personalityEmbed1
      })
      CREATE (r2:Recipient {
        id: 'recipient_girlfriend',
        name: 'Emily',
        age: 28,
        gender: 'female',
        interest_embedding: $interestEmbed2,
        personality_embedding: $personalityEmbed2
      })
      CREATE (u)-[:HAS_RELATIONSHIP {
        relationship_type: 'parent',
        closeness: 'close',
        years_known: 58
      }]->(r1)
      CREATE (u)-[:HAS_RELATIONSHIP {
        relationship_type: 'romantic_partner',
        closeness: 'intimate',
        years_known: 0.25
      }]->(r2)
    `, {
      interestEmbed1: generateMockEmbedding(),
      personalityEmbed1: generateMockEmbedding(),
      interestEmbed2: generateMockEmbedding(),
      personalityEmbed2: generateMockEmbedding(),
    });

    // 6. Link recipients to interests
    if (verbose) logger.info('Linking recipients to interests...');
    await session.run(`
      MATCH (r:Recipient {id: 'recipient_dad'}), (i:Interest)
      WHERE i.name IN ['coffee', 'reading', 'gardening']
      CREATE (r)-[:INTERESTED_IN {strength: 0.9}]->(i)
    `);
    await session.run(`
      MATCH (r:Recipient {id: 'recipient_girlfriend'}), (i:Interest)
      WHERE i.name IN ['yoga', 'cooking', 'hiking']
      CREATE (r)-[:INTERESTED_IN {strength: 0.85}]->(i)
    `);

    // 7. Link recipients to values
    if (verbose) logger.info('Linking recipients to values...');
    await session.run(`
      MATCH (r:Recipient {id: 'recipient_girlfriend'}), (v:Value)
      WHERE v.name IN ['vegan', 'eco-friendly']
      CREATE (r)-[:VALUES {importance: 0.95, is_requirement: true}]->(v)
    `);

    // 8. Create test products
    if (verbose) logger.info('Creating test products...');

    const products = [
      {
        id: 'prod_coffee_001',
        title: 'Premium Pour-Over Coffee Set',
        description: 'Hand-crafted ceramic dripper with locally roasted beans. Perfect for the coffee enthusiast who appreciates quality and ritual.',
        price: 58.00,
        vendor: 'Artisan Coffee Co.',
        interests: ['coffee'],
        occasions: ['birthday', 'just_because'],
      },
      {
        id: 'prod_book_001',
        title: 'Hardcover Book Set - Classic Literature',
        description: 'Beautiful leather-bound collection of timeless classics. Perfect for the dedicated reader.',
        price: 75.00,
        vendor: 'Heritage Books',
        interests: ['reading'],
        occasions: ['birthday', 'christmas'],
      },
      {
        id: 'prod_garden_001',
        title: 'Organic Seed Starter Kit',
        description: 'Complete kit with heirloom seeds, biodegradable pots, and organic soil. Great for the home gardener.',
        price: 42.00,
        vendor: 'Green Thumb Supply',
        interests: ['gardening'],
        occasions: ['birthday', 'just_because'],
        values: ['eco-friendly'],
      },
      {
        id: 'prod_yoga_001',
        title: 'Eco-Friendly Yoga Mat Set',
        description: 'Made from natural rubber and recycled materials. Includes mat, blocks, and strap.',
        price: 89.00,
        vendor: 'Mindful Movement',
        interests: ['yoga'],
        occasions: ['birthday', 'christmas'],
        values: ['eco-friendly', 'vegan'],
      },
      {
        id: 'prod_cooking_001',
        title: 'Plant-Based Cookbook & Spice Set',
        description: 'Award-winning vegan cookbook with organic spice collection. Perfect for the plant-based chef.',
        price: 52.00,
        vendor: 'Green Kitchen',
        interests: ['cooking'],
        occasions: ['birthday', 'just_because'],
        values: ['vegan'],
      },
      {
        id: 'prod_hiking_001',
        title: 'Sustainable Hiking Daypack',
        description: 'Made from recycled materials. Ergonomic design with hydration pocket. Perfect for day hikes.',
        price: 95.00,
        vendor: 'Trail Gear Co.',
        interests: ['hiking'],
        occasions: ['birthday', 'graduation'],
        values: ['eco-friendly'],
      },
      {
        id: 'prod_coffee_002',
        title: 'Coffee Subscription - 3 Months',
        description: 'Small-batch roasted coffee delivered monthly. Support local roasters.',
        price: 65.00,
        vendor: 'Local Roast Collective',
        interests: ['coffee'],
        occasions: ['birthday', 'anniversary'],
        values: ['local'],
      },
      {
        id: 'prod_reading_002',
        title: 'Handmade Leather Bookmark Set',
        description: 'Artisan leather bookmarks with personalized stamping option. Beautiful and functional.',
        price: 28.00,
        vendor: 'Craft & Co.',
        interests: ['reading'],
        occasions: ['just_because', 'christmas'],
        values: ['handmade'],
      },
    ];

    for (const product of products) {
      await session.run(`
        CREATE (p:Product {
          id: $id,
          title: $title,
          description: $description,
          price: $price,
          vendor: $vendor,
          available: true,
          product_embedding: $productEmbed,
          style_embedding: $styleEmbed,
          sentiment_embedding: $sentimentEmbed,
          use_case_embedding: $useCaseEmbed,
          created_at: datetime()
        })
      `, {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        vendor: product.vendor,
        productEmbed: generateMockEmbedding(),
        styleEmbed: generateMockEmbedding(),
        sentimentEmbed: generateMockEmbedding(),
        useCaseEmbed: generateMockEmbedding(),
      });

      // Link to interests
      if (product.interests && product.interests.length > 0) {
        await session.run(`
          MATCH (p:Product {id: $productId}), (i:Interest)
          WHERE i.name IN $interests
          CREATE (p)-[:MATCHES_INTEREST {relevance_score: 0.9}]->(i)
        `, {
          productId: product.id,
          interests: product.interests,
        });
      }

      // Link to occasions
      if (product.occasions && product.occasions.length > 0) {
        await session.run(`
          MATCH (p:Product {id: $productId}), (o:Occasion)
          WHERE o.name IN $occasions
          CREATE (p)-[:SUITABLE_FOR {suitability_score: 0.85}]->(o)
        `, {
          productId: product.id,
          occasions: product.occasions,
        });
      }

      // Link to values
      if (product.values && product.values.length > 0) {
        await session.run(`
          MATCH (p:Product {id: $productId}), (v:Value)
          WHERE v.name IN $values
          CREATE (p)-[:ALIGNS_WITH {alignment_score: 0.92}]->(v)
        `, {
          productId: product.id,
          values: product.values,
        });
      }
    }

    logger.info('Test data ingested successfully ✅');

  } catch (error) {
    logger.error('Failed to ingest test data', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Setup complete schema (constraints + indexes + vector indexes)
 */
export async function setupSchema(options?: { skipTestData?: boolean; verbose?: boolean }): Promise<void> {
  logger.info('Setting up Neo4j schema...');

  try {
    await createConstraints();
    await createIndexes();
    await createVectorIndexes();

    if (!options?.skipTestData) {
      await ingestTestData(options?.verbose || false);
    }

    logger.info('Schema setup complete ✅');
  } catch (error) {
    logger.error('Schema setup failed', { error });
    throw error;
  }
}

/**
 * Verify schema is correctly set up
 */
export async function verifySchema(): Promise<{
  constraints: string[];
  indexes: string[];
  vectorIndexes: string[];
}> {
  const session = getSession();

  try {
    logger.info('Verifying schema setup...');

    // Get all constraints
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    const constraints = constraintsResult.records.map(r =>
      r.get('name')
    );

    // Get all indexes
    const indexesResult = await session.run('SHOW INDEXES');
    const allIndexes = indexesResult.records.map(r => ({
      name: r.get('name'),
      type: r.get('type')
    }));

    const regularIndexes = allIndexes
      .filter(i => i.type !== 'VECTOR')
      .map(i => i.name);

    const vectorIndexes = allIndexes
      .filter(i => i.type === 'VECTOR')
      .map(i => i.name);

    logger.info('Schema verification complete', {
      constraints: constraints.length,
      indexes: regularIndexes.length,
      vectorIndexes: vectorIndexes.length
    });

    return {
      constraints,
      indexes: regularIndexes,
      vectorIndexes
    };

  } catch (error) {
    logger.error('Schema verification failed', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Drop all constraints and indexes (for clean restart)
 */
export async function dropSchema(): Promise<void> {
  const session = getSession();

  try {
    logger.warn('Dropping all schema elements...');

    // Drop all data first
    await session.run('MATCH (n) DETACH DELETE n');
    logger.info('Dropped all nodes and relationships');

    // Drop constraints
    const constraints = await session.run('SHOW CONSTRAINTS');
    for (const record of constraints.records) {
      const name = record.get('name');
      await session.run(`DROP CONSTRAINT ${name} IF EXISTS`);
      logger.info(`Dropped constraint: ${name}`);
    }

    // Drop indexes
    const indexes = await session.run('SHOW INDEXES');
    for (const record of indexes.records) {
      const name = record.get('name');
      await session.run(`DROP INDEX ${name} IF EXISTS`);
      logger.info(`Dropped index: ${name}`);
    }

    logger.warn('Schema dropped successfully');

  } catch (error) {
    logger.error('Failed to drop schema', { error });
    throw error;
  } finally {
    await session.close();
  }
}
