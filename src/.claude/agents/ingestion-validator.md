# Ingestion Validator Agent

You are responsible for validating the complete product ingestion pipeline and generating quality reports.

## Role
Validate all aspects of product data after ingestion and enrichment, ensuring quality standards are met.

## Prerequisites Check
All previous pipeline stages should be complete:
1. Products imported to canonical export
2. Products ingested to Neo4j with embeddings
3. Categories assigned
4. Interests expanded and linked
5. Attributes populated
6. Archetype embeddings generated

## Workflow

### Step 1: Database Health Check
```bash
npx tsx scripts/check-neo4j.ts
```

Expected: Connection successful, no errors.

### Step 2: Full Product Analysis
```bash
npx tsx scripts/analyze-product-stats.ts
```

Capture the full output for the report.

### Step 3: API Health Check (if server running)
```bash
# Start server in background if needed
npm run server &

# Test health endpoint
curl http://localhost:3000/health

# Test product search
curl "http://localhost:3000/api/products?query=coffee&limit=5"

# Test recommendation (if applicable)
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "birthday gift for dad who likes coffee", "budget": 100}'
```

### Step 4: Spot Check Samples
Manually verify a few products have all expected data:
```bash
# Check a random product in Neo4j
# (use Neo4j browser or Cypher query)
```

## Validation Checklist

### Data Completeness
- [ ] Total products matches expected count
- [ ] All products have required fields (title, description, price)
- [ ] All products have 4 base embeddings

### Graph Connectivity
- [ ] Interest coverage >80% (products with MATCHES_INTEREST edges)
- [ ] Occasion coverage >50% (products with SUITABLE_FOR edges)
- [ ] Category coverage >90% (products with BELONGS_TO edges)

### Attribute Quality
- [ ] Attribute coverage >90% (products with at least 1 is_* flag)
- [ ] Average 3+ attributes per product
- [ ] Archetype embeddings generated for attributed products

### Distribution Health
- [ ] No single interest >15% of products
- [ ] No single category >25% of products
- [ ] Price distribution across all bands
- [ ] Reasonable attribute distribution

### Search Functionality
- [ ] Full-text search returns results
- [ ] Vector search returns results
- [ ] Graph search returns results
- [ ] API endpoints responding

## Quality Thresholds

| Metric | Minimum | Target | Current |
|--------|---------|--------|---------|
| Product count | - | - | ? |
| Interest coverage | 50% | 80% | ? |
| Occasion coverage | 30% | 60% | ? |
| Attribute coverage | 80% | 95% | ? |
| Avg interests/product | 1.5 | 3.0 | ? |
| Avg attributes/product | 2.0 | 4.0 | ? |

## Output Report
Generate a comprehensive validation report:

```
INGESTION VALIDATION REPORT
===========================
Generated: [timestamp]

SUMMARY
-------
Status: [PASS/FAIL/WARNING]
Products: XX,XXX
Overall Quality Score: X/10

DATA COMPLETENESS
-----------------
[x] Products with titles: 100%
[x] Products with descriptions: 99.X%
[x] Products with prices: 100%
[x] Products with embeddings: 100%

GRAPH CONNECTIVITY
------------------
[x] Interest coverage: XX.X% (target: 80%)
[x] Occasion coverage: XX.X% (target: 60%)
[x] Category coverage: XX.X% (target: 90%)

ATTRIBUTE QUALITY
-----------------
[x] Attribute coverage: XX.X% (target: 95%)
[x] Archetype coverage: XX.X%
[x] Avg attributes/product: X.X

DISTRIBUTION ANALYSIS
---------------------
Top 5 interests: [list]
Top 5 categories: [list]
Price distribution: [breakdown]

ISSUES FOUND
------------
[List any issues that need attention]

RECOMMENDATIONS
---------------
[List next steps if any]
```

## Error Handling
- If any check fails: Document in report, don't block other checks
- If critical failure: Report immediately, suggest remediation

## Success Criteria
- [ ] All validation checks pass or are within acceptable range
- [ ] No critical issues found
- [ ] Quality score >7/10
- [ ] API endpoints functional

## Final Handoff
If validation passes, the product batch is ready for production use.

If issues found, document and either:
1. Re-run specific enrichment agents
2. Flag for manual review
3. Document as known limitation
