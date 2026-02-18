import { getDb } from '../src/db/index.js';

const db = getDb();

console.log('\nVerifying Attribute Mapping in Neo4j\n' + '='.repeat(80));

// Check sample of recently enriched products
const result = await db.run(`
  MATCH (p:Product)
  WHERE p.is_practical IS NOT NULL
  RETURN p.id as id, p.title as title,
         p.is_practical, p.is_luxury, p.is_personalizable,
         p.is_experiential, p.is_collectible, p.is_tech,
         p.is_handmade, p.is_eco_friendly, p.is_educational,
         p.is_novelty, p.is_sentimental, p.is_wellness,
         p.is_subscription, p.is_foodie,
         p.attributes_updated_at
  ORDER BY p.attributes_updated_at DESC
  LIMIT 5
`);

console.log(`\nSample of ${result.records.length} Recently Enriched Products:\n`);

for (const record of result.records) {
  const id = record.get('id');
  const title = record.get('title') || 'No title';
  const updated = record.get('attributes_updated_at');

  console.log(`\nProduct: ${id}`);
  console.log(`Title: ${title.substring(0, 70)}...`);
  console.log(`Updated: ${updated}`);

  const attrs = [
    'is_practical', 'is_luxury', 'is_personalizable', 'is_experiential',
    'is_collectible', 'is_tech', 'is_handmade', 'is_eco_friendly',
    'is_educational', 'is_novelty', 'is_sentimental', 'is_wellness',
    'is_subscription', 'is_foodie'
  ];

  const trueAttrs = attrs.filter(attr => record.get(attr) === true);
  const falseAttrs = attrs.filter(attr => record.get(attr) === false);

  console.log(`  ✓ TRUE: ${trueAttrs.map(a => a.replace('is_', '')).join(', ')}`);
  console.log(`  Stats: ${trueAttrs.length} true, ${falseAttrs.length} false`);
}

// Get overall stats
const stats = await db.run(`
  MATCH (p:Product)
  RETURN
    count(p) as total,
    count(p.is_practical) as withAttrs,
    avg(CASE WHEN p.is_practical THEN 1.0 ELSE 0.0 END) as avgPractical,
    avg(CASE WHEN p.is_luxury THEN 1.0 ELSE 0.0 END) as avgLuxury,
    avg(CASE WHEN p.is_tech THEN 1.0 ELSE 0.0 END) as avgTech
`);

console.log('\n' + '='.repeat(80));
console.log('Overall Database Statistics:');
const s = stats.records[0];
console.log(`  Total products: ${s.get('total').toNumber().toLocaleString()}`);
console.log(`  With attributes: ${s.get('withAttrs').toNumber().toLocaleString()}`);
console.log(`  Coverage: ${((s.get('withAttrs').toNumber() / s.get('total').toNumber()) * 100).toFixed(1)}%`);
console.log(`\n  Attribute Averages:`);
console.log(`    is_practical: ${(s.get('avgPractical') * 100).toFixed(1)}%`);
console.log(`    is_luxury: ${(s.get('avgLuxury') * 100).toFixed(1)}%`);
console.log(`    is_tech: ${(s.get('avgTech') * 100).toFixed(1)}%`);
console.log('');

await db.close();
