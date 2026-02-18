# LLM API Testing Scripts

Quick reference for debugging LLM API issues in enrichment scripts.

---

## Quick Diagnosis

If enrichment is failing, run this first:

```bash
npx tsx scripts/test-llm-direct.ts
```

This will test all three LLM providers and show you exactly what's failing.

---

## Available Test Scripts

### 1. `test-llm-direct.ts` - Direct API Testing

**Purpose:** Test raw API calls to all providers

**What it tests:**
- Gemini simple call
- Gemini JSON mode with enrichment prompt
- OpenAI simple call
- OpenAI JSON mode with enrichment prompt
- Anthropic simple call
- Anthropic with enrichment prompt

**When to use:**
- Enrichment scripts are failing
- 0% success rate from LLMs
- Want to verify API keys are valid
- Checking if models are available

**Example output:**
```
✓ OpenAI: Working
✗ Gemini: 404 - Model not found
✗ Anthropic: 401 - Invalid API key
```

---

### 2. `test-enrichment-batch.ts` - Batch Enrichment Testing

**Purpose:** Test the actual batch enrichment logic

**What it tests:**
- Gemini batch processing (3 test products)
- OpenAI batch processing (3 test products)
- JSON parsing
- Interest normalization
- Success rate calculation
- Validation thresholds

**When to use:**
- After fixing API issues
- Verifying the fix works end-to-end
- Before running full enrichment
- Testing prompt changes

**Example output:**
```
Product 1: Coffee Lover's Gift Set
  Interests: coffee, brewing, caffeine
  Occasions: birthday, christmas
  Attributes: isPractical, isConsumable

Success Rate: 100.0% (3/3) ✅
```

---

### 3. `test-gemini-models.ts` - Gemini Model Discovery

**Purpose:** Find which Gemini model names actually work

**What it tests:**
- Multiple Gemini model names
- Shows which ones return 404 vs working

**When to use:**
- Gemini returning 404 errors
- Need to find current model names
- Gemini models changed/deprecated

**Example output:**
```
✓ gemini-2.0-flash: WORKS
✗ gemini-1.5-flash: 404 Not Found
```

---

### 4. `test-llm-fixed.ts` - Verification After Fix

**Purpose:** Verify the fix for the 0% success rate issue

**What it tests:**
- Correct Gemini model names (2.0-flash, 2.5-flash)
- OpenAI as baseline
- JSON parsing and structure validation
- Product count validation

**When to use:**
- After applying model name fixes
- Confirming the fix worked
- Before re-running enrichment

---

## Common Issues & Solutions

### Issue: "0% LLM success rate"

**Diagnosis:**
```bash
npx tsx scripts/test-llm-direct.ts
```

**Common causes:**
1. Wrong Gemini model name (404)
   - Fix: Use `gemini-2.0-flash` or `gemini-2.5-flash`
2. Invalid API key (401)
   - Fix: Update API key in `.env.local`
3. Rate limit (429)
   - Fix: Wait or reduce concurrency

---

### Issue: "Gemini immediately on cooldown"

**Diagnosis:**
```bash
npx tsx scripts/test-gemini-models.ts
```

**Likely cause:** Model name doesn't exist (404)

**Fix:** Update model name in enrichment scripts:
```typescript
// Wrong
model: 'gemini-1.5-flash-latest'

// Correct
model: 'gemini-2.0-flash'
```

**Files to update:**
- `scripts/enrich-products-robust.ts`
- `scripts/enrich-products-hybrid.ts`
- `scripts/enrich-attributes-focused.ts`

---

### Issue: "All providers failing"

**Diagnosis:**
```bash
npx tsx scripts/test-llm-direct.ts
```

**Possible causes:**
1. Network connectivity issue
2. All API keys invalid/expired
3. API services down

**Check:**
- Internet connection
- API key expiration dates
- Provider status pages

---

## Correct Model Names (as of Dec 2025)

### Gemini
✅ **Use these:**
- `gemini-2.0-flash` (fast, cheap)
- `gemini-2.5-flash` (newer)
- `gemini-2.5-pro` (more capable)

❌ **Don't use (deprecated):**
- `gemini-1.5-flash`
- `gemini-1.5-flash-latest`
- `gemini-1.5-pro`
- `gemini-pro`

### OpenAI
✅ **Use these:**
- `gpt-4o-mini` (recommended for enrichment)
- `gpt-4o`

### Anthropic
✅ **Use these:**
- `claude-3-haiku-20240307` (fast, cheap)
- `claude-3-5-sonnet-20241022` (more capable)

---

## Before Running Enrichment

Always run health check first:

```bash
# 1. Test API connections
npx tsx scripts/test-llm-direct.ts

# 2. Test batch enrichment logic
npx tsx scripts/test-enrichment-batch.ts

# 3. If all pass, run small test
npx tsx scripts/enrich-products-robust.ts --limit 100 --verbose

# 4. If successful, run full enrichment
npx tsx scripts/enrich-products-robust.ts --live
```

---

## API Key Status

Check current API key validity:

```bash
# Check which keys are configured
cat .env.local | grep -E "^(OPENAI_|GOOGLE_|GEMINI_|ANTHROPIC_)" | sed 's/=.*/=***/'
```

Expected output:
```
OPENAI_API_KEY=***
GEMINI_API_KEY=***
ANTHROPIC_API_KEY=***
```

---

## Cost Estimates

LLM provider costs (per 1M tokens):

| Provider | Model | Input | Output | Weighted Avg |
|----------|-------|-------|--------|--------------|
| Gemini | 2.0-flash | $0.075 | $0.30 | ~$0.15 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 | ~$0.30 |
| Anthropic | claude-3-haiku | $0.25 | $1.25 | ~$0.60 |

**Recommendation:** Use Gemini as primary (cheapest), OpenAI as fallback.

---

## Troubleshooting Flowchart

```
Enrichment failing?
│
├─> Run: test-llm-direct.ts
│   │
│   ├─> All pass? → Check enrichment script logic
│   │
│   ├─> Gemini 404? → Update model name to gemini-2.0-flash
│   │
│   ├─> API key 401? → Update .env.local with fresh key
│   │
│   └─> Rate limit 429? → Reduce concurrency or wait
│
└─> Run: test-enrichment-batch.ts
    │
    ├─> Pass? → Safe to run enrichment
    │
    └─> Fail? → Check prompt structure or validation logic
```

---

## Quick Commands Reference

```bash
# Test all APIs
npx tsx scripts/test-llm-direct.ts

# Test batch enrichment
npx tsx scripts/test-enrichment-batch.ts

# Test Gemini models
npx tsx scripts/test-gemini-models.ts

# Verify fix
npx tsx scripts/test-llm-fixed.ts

# List available Gemini models
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | jq -r '.models[].name'

# Check API keys configured
grep -E "^(OPENAI_|GEMINI_|ANTHROPIC_)" .env.local | sed 's/=.*/=***/'
```

---

## When to Re-run Tests

- After updating API keys
- After changing model names
- Before large enrichment runs
- After long periods of inactivity
- When seeing unexpected errors
- When providers release new models

---

## Support

For issues with these test scripts, check:
1. `/Volumes/Crucial X8/Code/Present-Agent2/LLM_API_FIX_REPORT.md` - Full diagnostic report
2. Test script source code for detailed comments
3. Provider documentation for model availability
