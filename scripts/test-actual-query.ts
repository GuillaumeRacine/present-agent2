/**
 * Test the EXACT Cypher query that Explorer uses
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j } from '../src/lib/neo4j';
import { generateEmbedding } from '../src/lib/llm';

async function testActualQuery() {
  const driver = await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: 'neo4j',
  });

  const session = driver.session();

  try {
    console.log('\n🧪 Testing Actual Explorer Cypher Query\n');

    // Generate embeddings like Explorer does
    console.log('Generating embeddings...');
    const semanticQuery = "Gift for dad who loves coffee and reading";
    const styleQuery = "Aesthetic style: practical_luxury";
    const sentimentQuery = "Emotional tone: appreciation and connection";
    const useCaseQuery = "Use case: coffee, reading, relaxation";

    const [queryEmbedding, styleEmbedding, sentimentEmbedding, useCaseEmbedding] =
      await Promise.all([
        generateEmbedding(semanticQuery),
        generateEmbedding(styleQuery),
        generateEmbedding(sentimentQuery),
        generateEmbedding(useCaseQuery),
      ]);

    console.log('✓ Embeddings generated\n');

    // Run the EXACT query from Explorer
    console.log('Executing hybrid Cypher query...\n');

    const cypher = `
      // 1. Vector similarity search across all 4 embeddings
      CALL db.index.vector.queryNodes('product_embedding', 30, $queryEmbedding)
      YIELD node AS product, score AS semanticScore

      // Get other vector scores
      WITH product, semanticScore,
        gds.similarity.cosine(product.style_embedding, $styleEmbedding) AS styleScore,
        gds.similarity.cosine(product.sentiment_embedding, $sentimentEmbedding) AS sentimentScore,
        gds.similarity.cosine(product.use_case_embedding, $useCaseEmbedding) AS useCaseScore

      // Calculate combined vector score
      WITH product,
        (0.40 * semanticScore + 0.25 * styleScore + 0.20 * sentimentScore + 0.15 * useCaseScore) AS vectorScore

      // 2. Apply hard constraints early
      WHERE product.available = true
        AND product.price >= $budgetMin
        AND product.price <= $budgetMax

      // 3. Graph traversal - Interest matching
      OPTIONAL MATCH (product)-[mi:MATCHES_INTEREST]->(i:Interest)
      WHERE i.name IN $interests
      WITH product, vectorScore,
        COLLECT(DISTINCT {name: i.name, strength: mi.relevance_score}) AS matchedInterests,
        COALESCE(AVG(mi.relevance_score), 0) AS interestScore

      // 4. Graph traversal - Value alignment (STRICT for requirements)
      OPTIONAL MATCH (product)-[av:ALIGNS_WITH]->(v:Value)
      WITH product, vectorScore, matchedInterests, interestScore,
        COLLECT(DISTINCT {name: v.name, alignment: av.alignment_score}) AS matchedValues,
        COALESCE(AVG(av.alignment_score), 0) AS valueScore

      // Check required values
      WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
        [val IN $requiredValues WHERE val IN [mv IN matchedValues | mv.name]] AS satisfiedRequirements
      WHERE SIZE($requiredValues) = 0 OR SIZE(satisfiedRequirements) = SIZE($requiredValues)

      // 5. Graph traversal - Occasion suitability
      OPTIONAL MATCH (product)-[so:SUITABLE_FOR]->(o:Occasion)
      WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
        COLLECT(DISTINCT {name: o.name, suitability: so.suitability_score}) AS matchedOccasions,
        COALESCE(AVG(so.suitability_score), 0) AS occasionScore

      // 6. Social proof - Similar users who liked this product
      OPTIONAL MATCH (similarUser:User)-[:HAS_RELATIONSHIP {relationship_type: $relationshipType}]->(similarRecipient:Recipient)
      OPTIONAL MATCH (rec:Recommendation {product_id: product.id})
      WHERE rec.was_liked = true OR rec.was_purchased = true
      WITH product, vectorScore, matchedInterests, interestScore, matchedValues, valueScore,
        matchedOccasions, occasionScore,
        COUNT(DISTINCT rec) AS socialProofCount,
        COALESCE(COUNT(DISTINCT rec) / 10.0, 0) AS socialProofScore

      // 7. Calculate graph score (weighted combination)
      WITH product, vectorScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount,
        (0.35 * interestScore +
         0.25 * valueScore +
         0.25 * occasionScore +
         0.15 * socialProofScore) AS graphScore

      // 8. Calculate hybrid score (60% graph + 40% vector)
      WITH product, vectorScore, graphScore, matchedInterests, matchedValues, matchedOccasions, socialProofCount,
        (0.60 * graphScore + 0.40 * vectorScore) AS hybridScore,
        (graphScore + vectorScore) / 2.0 AS confidenceScore

      // 9. Order by hybrid score and limit
      ORDER BY hybridScore DESC
      LIMIT 20

      RETURN product, vectorScore, graphScore, hybridScore, confidenceScore,
             matchedInterests, matchedValues, matchedOccasions, socialProofCount
    `;

    const result = await session.run(cypher, {
      queryEmbedding,
      styleEmbedding,
      sentimentEmbedding,
      useCaseEmbedding,
      interests: ['coffee', 'reading'],
      budgetMin: 40,
      budgetMax: 65,
      requiredValues: [],
      relationshipType: 'father',
    });

    console.log(`Found ${result.records.length} products\n`);
    console.log('Top 5 Results:');
    console.log('='.repeat(80));

    result.records.slice(0, 5).forEach((record, i) => {
      const product = record.get('product').properties;
      const vectorScore = record.get('vectorScore');
      const graphScore = record.get('graphScore');
      const hybridScore = record.get('hybridScore');
      const matchedInterests = record.get('matchedInterests');

      console.log(`\n${i + 1}. ${product.title} - $${product.price}`);
      console.log(`   Vector Score: ${vectorScore.toFixed(3)}`);
      console.log(`   Graph Score: ${graphScore.toFixed(3)}`);
      console.log(`   Hybrid Score: ${hybridScore.toFixed(3)}`);
      console.log(`   Confidence: ${record.get('confidenceScore').toFixed(3)}`);

      const interests = matchedInterests.filter((m: any) => m.name);
      if (interests.length > 0) {
        console.log(`   Matched Interests: ${interests.map((m: any) => `${m.name} (${m.strength})`).join(', ')}`);
      } else {
        console.log(`   Matched Interests: NONE`);
      }
    });

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await closeNeo4j();
  }
}

testActualQuery();
