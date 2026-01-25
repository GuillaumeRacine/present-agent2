#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { initNeo4j, getSession, closeNeo4j } from '../src/lib/neo4j.js';

dotenv.config({ path: '.env.local' });

async function main() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const session = getSession();

  try {
    console.log('\n=== CHECKING ENRICHMENT CRITERIA ===\n');

    // 1. Total products
    const totalResult = await session.run('MATCH (p:Product) RETURN count(p) as total');
    const totalVal = totalResult.records[0].get('total');
    const total = typeof totalVal === 'object' && totalVal.toNumber ? totalVal.toNumber() : Number(totalVal);
    console.log('Total products:', total);

    // 2. Products with NO interests at all
    const noInterestsResult = await session.run(`
      MATCH (p:Product)
      WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest)
      RETURN count(p) as count
    `);
    const noInterestsVal = noInterestsResult.records[0].get('count');
    const noInterests = typeof noInterestsVal === 'object' && noInterestsVal.toNumber ? noInterestsVal.toNumber() : Number(noInterestsVal);
    console.log('Products with NO interests:', noInterests);

    // 3. Products with < 2 interests
    const lessThan2Result = await session.run(`
      MATCH (p:Product)
      WHERE size([(p)-[:MATCHES_INTEREST]->() | 1]) < 2
      RETURN count(p) as count
    `);
    const lessThan2Val = lessThan2Result.records[0].get('count');
    const lessThan2 = typeof lessThan2Val === 'object' && lessThan2Val.toNumber ? lessThan2Val.toNumber() : Number(lessThan2Val);
    console.log('Products with < 2 interests:', lessThan2);

    // 4. Products with isPractical IS NULL (no attributes)
    const noAttributesResult = await session.run(`
      MATCH (p:Product)
      WHERE p.isPractical IS NULL
      RETURN count(p) as count
    `);
    const noAttributesVal = noAttributesResult.records[0].get('count');
    const noAttributes = typeof noAttributesVal === 'object' && noAttributesVal.toNumber ? noAttributesVal.toNumber() : Number(noAttributesVal);
    console.log('Products with NO attributes (isPractical IS NULL):', noAttributes);

    // 5. The EXACT query the script uses (OR condition)
    const scriptQueryResult = await session.run(`
      MATCH (p:Product)
      WHERE NOT (p)-[:MATCHES_INTEREST]->(:Interest)
         OR size([(p)-[:MATCHES_INTEREST]->() | 1]) < 2
         OR p.isPractical IS NULL
      RETURN count(p) as needsEnrichment
    `);
    const needsEnrichmentVal = scriptQueryResult.records[0].get('needsEnrichment');
    const needsEnrichment = typeof needsEnrichmentVal === 'object' && needsEnrichmentVal.toNumber ? needsEnrichmentVal.toNumber() : Number(needsEnrichmentVal);
    console.log('\nProducts matching script criteria (OR condition):', needsEnrichment);

    // 6. Break down the OR condition - show overlaps
    const overlapsResult = await session.run(`
      MATCH (p:Product)
      WITH p,
           NOT (p)-[:MATCHES_INTEREST]->(:Interest) as hasNoInterests,
           size([(p)-[:MATCHES_INTEREST]->() | 1]) < 2 as hasLessThan2,
           p.isPractical IS NULL as hasNoAttributes
      RETURN
        count(CASE WHEN hasNoInterests AND hasLessThan2 AND hasNoAttributes THEN 1 END) as all3,
        count(CASE WHEN hasNoInterests AND hasLessThan2 AND NOT hasNoAttributes THEN 1 END) as interests_only,
        count(CASE WHEN hasNoInterests AND NOT hasLessThan2 AND hasNoAttributes THEN 1 END) as no_int_no_attr,
        count(CASE WHEN NOT hasNoInterests AND hasLessThan2 AND hasNoAttributes THEN 1 END) as less2_no_attr,
        count(CASE WHEN hasNoInterests AND NOT hasLessThan2 AND NOT hasNoAttributes THEN 1 END) as just_no_interests,
        count(CASE WHEN NOT hasNoInterests AND hasLessThan2 AND NOT hasNoAttributes THEN 1 END) as just_less2,
        count(CASE WHEN NOT hasNoInterests AND NOT hasLessThan2 AND hasNoAttributes THEN 1 END) as just_no_attr
    `);

    const overlaps = overlapsResult.records[0];
    console.log('\nBreakdown of overlapping conditions:');
    console.log('  All 3 conditions:', overlaps.get('all3'));
    console.log('  No interests + <2 interests (but has attributes):', overlaps.get('interests_only'));
    console.log('  No interests + no attributes:', overlaps.get('no_int_no_attr'));
    console.log('  <2 interests + no attributes:', overlaps.get('less2_no_attr'));
    console.log('  Just no interests:', overlaps.get('just_no_interests'));
    console.log('  Just <2 interests:', overlaps.get('just_less2'));
    console.log('  Just no attributes:', overlaps.get('just_no_attr'));

    // 7. Check products that PASS all criteria (well enriched)
    const wellEnrichedResult = await session.run(`
      MATCH (p:Product)
      WHERE (p)-[:MATCHES_INTEREST]->(:Interest)
        AND size([(p)-[:MATCHES_INTEREST]->() | 1]) >= 2
        AND p.isPractical IS NOT NULL
      RETURN count(p) as wellEnriched
    `);
    const wellEnrichedVal = wellEnrichedResult.records[0].get('wellEnriched');
    const wellEnriched = typeof wellEnrichedVal === 'object' && wellEnrichedVal.toNumber ? wellEnrichedVal.toNumber() : Number(wellEnrichedVal);
    console.log('\nProducts that are WELL ENRICHED (pass all criteria):', wellEnriched);
    console.log('  Coverage:', ((wellEnriched / total) * 100).toFixed(1) + '%');

    console.log('\n=== SUMMARY ===');
    console.log(`Total products: ${total}`);
    console.log(`Need enrichment (script criteria): ${needsEnrichment} (${((needsEnrichment / total) * 100).toFixed(1)}%)`);
    console.log(`Well enriched: ${wellEnriched} (${((wellEnriched / total) * 100).toFixed(1)}%)`);
    console.log(`Verification: ${needsEnrichment + wellEnriched} should equal ${total}: ${needsEnrichment + wellEnriched === total ? '✓' : '✗'}`);

  } finally {
    await session.close();
    await closeNeo4j();
  }
}

main().catch(console.error);
