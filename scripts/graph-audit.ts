#!/usr/bin/env tsx
/**
 * Graph Audit: product coverage and gaps
 * Outputs actionable stats to inform ingestion priorities.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initNeo4j, closeNeo4j, getSession } from '../src/lib/neo4j.js';

async function run() {
  await initNeo4j({
    uri: process.env.NEO4J_URL || '',
    username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const session = getSession();

  // Basic counts
  const counts = await session.run(`
    MATCH (p:Product) WITH count(p) AS products
    MATCH (i:Interest) WITH products, count(i) AS interests
    MATCH (o:Occasion) WITH products, interests, count(o) AS occasions
    MATCH (v:Value) WITH products, interests, occasions, count(v) AS values
    RETURN products, interests, occasions, values
  `);
  const { products, interests, occasions, values } = counts.records[0].toObject();

  // Coverage edges
  const coverage = await session.run(`
    MATCH (p:Product)
    OPTIONAL MATCH (p)-[:MATCHES_INTEREST]->(:Interest)
    WITH p, count(*) AS iCnt
    OPTIONAL MATCH (p)-[:SUITABLE_FOR]->(:Occasion)
    WITH p, iCnt, count(*) AS oCnt
    OPTIONAL MATCH (p)-[:ALIGNS_WITH]->(:Value)
    WITH p, iCnt, oCnt, count(*) AS vCnt
    RETURN 
      sum(CASE WHEN iCnt > 0 THEN 1 ELSE 0 END) AS productsWithInterests,
      sum(CASE WHEN oCnt > 0 THEN 1 ELSE 0 END) AS productsWithOccasions,
      sum(CASE WHEN vCnt > 0 THEN 1 ELSE 0 END) AS productsWithValues
  `);
  const cov = coverage.records[0].toObject();

  // Interest distribution (top/bottom)
  const interestDist = await session.run(`
    MATCH (i:Interest)
    OPTIONAL MATCH (p:Product)-[:MATCHES_INTEREST]->(i)
    RETURN i.name AS interest, count(p) AS productCount
    ORDER BY productCount DESC
  `);
  const interestsSorted = interestDist.records.map(r => r.toObject());

  // Price bands
  const bands = await session.run(`
    MATCH (p:Product)
    WITH p, 
      CASE 
        WHEN p.price IS NULL THEN 'unknown'
        WHEN p.price < 25 THEN '<25'
        WHEN p.price < 50 THEN '25-50'
        WHEN p.price < 100 THEN '50-100'
        WHEN p.price < 200 THEN '100-200'
        ELSE '200+'
      END AS band
    RETURN band, count(*) AS n
    ORDER BY band
  `);
  const priceBands = bands.records.map(r => r.toObject());

  // Attribute density (how many is_* true)
  const attrStats = await session.run(`
    MATCH (p:Product)
    WITH p, size([k IN keys(p) WHERE k STARTS WITH 'is_' AND p[k] = true]) AS attrTrue
    RETURN avg(attrTrue) AS avgAttrTrue, min(attrTrue) AS minAttrTrue, max(attrTrue) AS maxAttrTrue,
           percentileCont(attrTrue, 0.25) AS p25, percentileCont(attrTrue, 0.5) AS p50, percentileCont(attrTrue, 0.9) AS p90
  `);
  const attr = attrStats.records[0].toObject();

  // Vendor coverage
  const vendorStats = await session.run(`
    MATCH (p:Product)
    WITH coalesce(p.vendor, 'unknown') AS vendor, count(*) AS n
    RETURN vendor, n
    ORDER BY n DESC
    LIMIT 15
  `);
  const topVendors = vendorStats.records.map(r => r.toObject());

  // Missing vendor, missing price
  const miss = await session.run(`
    MATCH (p:Product)
    RETURN 
      sum(CASE WHEN p.vendor IS NULL OR p.vendor = '' THEN 1 ELSE 0 END) AS noVendor,
      sum(CASE WHEN p.price IS NULL THEN 1 ELSE 0 END) AS noPrice
  `);
  const missing = miss.records[0].toObject();

  await session.close();
  await closeNeo4j();

  const report = {
    products: Number(products),
    nodes: { interests: Number(interests), occasions: Number(occasions), values: Number(values) },
    coverage: {
      productsWithInterests: Number(cov.productsWithInterests),
      productsWithOccasions: Number(cov.productsWithOccasions),
      productsWithValues: Number(cov.productsWithValues),
    },
    interestTop5: interestsSorted.slice(0, 5),
    interestBottom5: interestsSorted.slice(-5),
    priceBands,
    attrDensity: {
      avg: Number(attr.avgAttrTrue), min: Number(attr.minAttrTrue), max: Number(attr.maxAttrTrue),
      p25: Number(attr.p25), p50: Number(attr.p50), p90: Number(attr.p90)
    },
    topVendors,
    missing,
  };

  // Print JSON to stdout for capture
  console.log(JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

