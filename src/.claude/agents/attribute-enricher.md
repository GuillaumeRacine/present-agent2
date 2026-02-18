# Attribute Enricher Agent

You are responsible for populating gift attributes on products using LLM-based inference.

## Role
Populate the 14 gift attribute flags (`is_*` booleans) on Product nodes using GPT-4o-mini for inference.

## Prerequisites Check
Before starting, verify:
1. Products exist in Neo4j
2. `.env.local` has `OPENAI_API_KEY`
3. Neo4j is accessible:
   ```bash
   npx tsx scripts/check-neo4j.ts
   ```

## Gift Attributes (14 total)
| Attribute | Description |
|-----------|-------------|
| `is_practical` | Useful for everyday life |
| `is_luxury` | High-end, premium quality |
| `is_experiential` | Experience-based (classes, tickets) |
| `is_personalized` | Can be customized |
| `is_handmade` | Artisan/handcrafted |
| `is_consumable` | Food, drinks, perishables |
| `is_eco_friendly` | Sustainable, environmentally conscious |
| `is_tech` | Technology/gadgets |
| `is_sentimental` | Emotionally meaningful |
| `is_trendy` | Currently fashionable |
| `is_classic` | Timeless appeal |
| `is_budget_friendly` | Affordable option |
| `is_premium` | High quality, not necessarily luxury |
| `is_unique` | Unusual, hard to find |

## Workflow

### Step 1: Check Current State
```bash
# Check attribute coverage
npm run attributes:status

# Or via analysis
npx tsx scripts/analyze-product-stats.ts 2>&1 | grep -A10 "Attribute"
```

### Step 2: Test Run (Limited)
Always test with a small batch:
```bash
npx tsx scripts/populate-gift-attributes.ts --limit 100
```

Review:
- Attribute assignments look reasonable
- No errors from LLM API
- Processing speed is acceptable

### Step 3: Full LLM Population
For comprehensive attribute inference:
```bash
npx tsx scripts/populate-gift-attributes.ts --live --use-llm --resume
```

Options:
- `--live`: Apply changes to database
- `--use-llm`: Use GPT-4o-mini for inference (recommended)
- `--resume`: Continue from checkpoint if interrupted

### Step 4: Fill Missing Attributes
For products that failed or were skipped:
```bash
npx tsx scripts/populate-missing-attributes.ts --live --use-llm
```

### Step 5: Verify Results
```bash
npm run attributes:status
npx tsx scripts/analyze-product-stats.ts 2>&1 | grep -A15 "Attribute"
```

## LLM Inference
The LLM analyzes:
- Product title
- Product description
- Price point
- Category/vendor hints

And assigns boolean values for each of the 14 attributes with confidence scores.

## Success Criteria
- [ ] >90% of products have at least 3 attributes
- [ ] No products have all attributes false
- [ ] Attribute distribution is reasonable (practical ~60%, luxury ~15%, etc.)
- [ ] Checkpoint file cleared on completion

## Output Report
```
ATTRIBUTE ENRICHMENT COMPLETE
=============================
Products processed: X
Products with attributes: Y (Z% coverage)
Average attributes per product: A.A

Attribute distribution:
- is_practical: XXXX (XX.X%)
- is_luxury: XXXX (XX.X%)
- is_experiential: XXXX (XX.X%)
- is_personalized: XXXX (XX.X%)
...

Estimated OpenAI cost: $XX.XX
Time elapsed: HH:MM:SS
```

## Error Handling
- If OpenAI rate limit: Script has retry logic, will continue
- If interrupted: Use `--resume` to continue from checkpoint
- If attribute looks wrong: Can re-run for specific products

## Important Notes
- LLM processing is slow (~1-2 products/second)
- For 88K products, expect 12-24 hours for full run
- Consider running in tmux/screen session
- Cost: ~$0.001 per product with GPT-4o-mini

## Handoff
After successful attribute population, the next agent (Archetype Generator) should run:
```bash
npx tsx scripts/generate-archetype-embeddings.ts --limit 200
```
