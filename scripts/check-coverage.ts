import { getDb } from '../src/db/index.js';

const db = getDb();

const result = await db.run(`
  MATCH (p:Product)
  RETURN
    count(p) as total,
    count(CASE WHEN p.is_practical IS NOT NULL THEN 1 END) as withAttrs,
    count(CASE WHEN p.is_practical IS NULL THEN 1 END) as needsAttrs,
    avg(CASE WHEN p.is_practical THEN 1.0 ELSE 0.0 END) * 100 as pracPct,
    avg(CASE WHEN p.is_luxury THEN 1.0 ELSE 0.0 END) * 100 as luxPct,
    avg(CASE WHEN p.is_tech THEN 1.0 ELSE 0.0 END) * 100 as techPct,
    avg(CASE WHEN p.is_experiential THEN 1.0 ELSE 0.0 END) * 100 as expPct
`);

const r = result.records[0];
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  FINAL ENRICHMENT STATUS');
console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log(`Total products:      ${r.get('total').toNumber().toLocaleString()}`);
console.log(`With attributes:     ${r.get('withAttrs').toNumber().toLocaleString()} (${(r.get('withAttrs').toNumber() / r.get('total').toNumber() * 100).toFixed(1)}%)`);
console.log(`Still needs attrs:   ${r.get('needsAttrs').toNumber().toLocaleString()} (${(r.get('needsAttrs').toNumber() / r.get('total').toNumber() * 100).toFixed(1)}%)\n`);
console.log('Attribute Distribution (of products with attributes):');
console.log(`  is_practical:      ${r.get('pracPct').toFixed(1)}%`);
console.log(`  is_luxury:         ${r.get('luxPct').toFixed(1)}%`);
console.log(`  is_tech:           ${r.get('techPct').toFixed(1)}%`);
console.log(`  is_experiential:   ${r.get('expPct').toFixed(1)}%`);
console.log('');

await db.close();
