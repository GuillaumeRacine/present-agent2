# LLM Gift Attribute Inference - Execution Checklist

## Pre-Flight Checklist

Before running the full population, verify all prerequisites:

### System Requirements
- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Neo4j database accessible
- [ ] Database contains products (41,704 expected)

### API Configuration
- [ ] OpenAI API key set in `.env.local` (OR)
- [ ] Anthropic API key set in `.env.local`
- [ ] API key has sufficient credits
- [ ] Test API connection works

### Testing Complete
- [ ] Ran `npm run attributes:test-llm` successfully
- [ ] Reviewed test results (coverage ~100%)
- [ ] Verified attribute quality looks good
- [ ] Cost estimate acceptable ($5.63)

### Documentation Reviewed
- [ ] Read `LLM_ATTRIBUTE_INFERENCE_SUMMARY.md`
- [ ] Reviewed `LLM_ATTRIBUTE_INFERENCE_QUICK_START.md`
- [ ] Checked `BEFORE_AFTER_ATTRIBUTE_COMPARISON.md`
- [ ] Understand the process and expected results

### Risk Mitigation
- [ ] Understand this modifies database (has `--live` flag)
- [ ] Know how to resume if interrupted (`--resume` flag)
- [ ] Checkpoint system explained and understood
- [ ] Can monitor progress in terminal

---

## Quick Test (Recommended First Step)

Before full run, do a quick sanity check:

```bash
# Test on 10 products
npm run attributes:test-llm
```

**Expected Output**:
- Coverage: ~100%
- Avg attributes: ~3-4 per product
- Quality: Contextual and accurate
- Time: ~40 seconds

**If results look good, proceed to next section.**

---

## Dry Run Test (Recommended Second Step)

Test the population script without making changes:

```bash
# Dry run on 100 products (no database changes)
npm run attributes:populate:llm-test
```

**Expected Output**:
- Mode: DRY RUN
- Method: LLM-based inference
- Processing: 100 products
- Shows sample attribute assignments
- Time: ~60 seconds
- Cost estimate shown

**If results look good, proceed to full run.**

---

## Full Population (Main Event)

### Step 1: Start the Run

```bash
npm run attributes:populate:llm
```

**This will**:
- Process all 41,704 products
- Use LLM inference for each
- Update Neo4j database with attributes
- Take approximately 7 hours
- Cost approximately $5.63

### Step 2: Monitor Progress

Watch the terminal for:
- Current progress: "LLM inference: 1234/41704"
- Checkpoints saved every 100 products
- Token usage tracking
- Cost estimates updating
- Any errors (individual products may fail without stopping batch)

### Step 3: Handle Interruptions (If Needed)

If the script stops for any reason:

```bash
# Resume from last checkpoint
npm run attributes:populate:llm-resume
```

This will:
- Load checkpoint data
- Skip already processed products
- Continue from where it stopped

### Step 4: Completion

When finished, you'll see:
- Summary statistics
- Total products processed
- Coverage percentage
- Final token count
- Final cost estimate
- "Checkpoint cleared" message

---

## Post-Run Validation

After completion, verify the results:

### 1. Check Coverage
```bash
# Count products with attributes
# (Use Neo4j Browser or custom query)
```

Expected: ~41,704 products (100%)

### 2. Spot Check Quality
```bash
# Run test again to see new results
npm run attributes:test-llm:20
```

Should show attributes for all products tested.

### 3. Review Logs
Check `logs/combined.log` for:
- Any errors that occurred
- Success rates
- Performance metrics

### 4. Test Recommendations
Run some recommendation queries to see if quality improved:
- User query: "practical luxury gift"
- User query: "conversation starter under $50"
- User query: "sentimental memory-making gift"

---

## Troubleshooting Guide

### Issue: "No LLM providers configured"
**Solution**:
```bash
# Add to .env.local
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### Issue: Script stops with API error
**Solution**:
1. Check API key is valid
2. Check you have sufficient credits
3. Wait a moment and resume:
```bash
npm run attributes:populate:llm-resume
```

### Issue: Progress seems slow
**Expected**: ~100 products per minute due to rate limiting
- 41,704 products ÷ 100/min ≈ 417 minutes (7 hours)
- This is intentional to avoid API throttling

### Issue: Cost higher than expected
**Check**:
1. How many products processed?
2. Token usage shown in summary
3. Expected: $5.63 for 41,704 products
4. If much higher, verify rate limiting is working

### Issue: Some products have no attributes
**Expected**: LLM may fail on a small number of products
- Fallback returns empty attributes
- Logged as errors
- Batch continues processing
- Should be <1% of products

### Issue: Want to start over
**Solution**:
```bash
# Remove checkpoint file
rm .gift-attributes-checkpoint.json

# Run again from beginning
npm run attributes:populate:llm
```

---

## Commands Quick Reference

### Testing
```bash
npm run attributes:test-llm              # 10 products
npm run attributes:test-llm:20           # 20 products
tsx scripts/test-llm-attributes.ts 50    # Custom count
```

### Dry Runs
```bash
npm run attributes:populate:llm-test     # 100 products, no changes
```

### Production
```bash
npm run attributes:populate:llm          # Full run
npm run attributes:populate:llm-resume   # Resume from checkpoint
```

### Comparison
```bash
npm run attributes:test                  # Keyword-based (old)
npm run attributes:populate:llm-test     # LLM-based (new)
```

---

## Success Criteria

After completion, verify:

- [ ] All 41,704 products processed
- [ ] Coverage ~100% (vs 39.2% before)
- [ ] Average 3-4 attributes per product (vs 0.8 before)
- [ ] Cost ~$5.63 (acceptable)
- [ ] Time ~7 hours (acceptable)
- [ ] Checkpoint file removed (automatic on success)
- [ ] No critical errors in logs
- [ ] Recommendation quality improved

---

## Timeline Estimate

| Phase | Time | Activity |
|-------|------|----------|
| **Pre-flight** | 10 min | Verify prerequisites |
| **Quick test** | 1 min | Test on 10 products |
| **Dry run** | 2 min | Test on 100 products |
| **Full run** | 7 hours | Process 41,704 products |
| **Validation** | 10 min | Verify results |
| **Total** | ~7.5 hours | End-to-end |

---

## Cost Breakdown

| Component | Calculation | Cost |
|-----------|-------------|------|
| Input tokens | 20.8M @ $0.15/1M | $3.12 |
| Output tokens | 4.2M @ $0.60/1M | $2.51 |
| **Total** | 41,704 products | **$5.63** |

Per product: **$0.000135**

---

## Final Confirmation

Before executing `npm run attributes:populate:llm`, confirm:

- [ ] I understand this modifies the database
- [ ] I have reviewed test results
- [ ] I accept the cost (~$5.63)
- [ ] I can dedicate ~7 hours (or can resume later)
- [ ] I have reviewed the documentation
- [ ] I am ready to proceed

## Execute When Ready

```bash
npm run attributes:populate:llm
```

**Good luck!** 🚀

---

## Support

If issues arise:
1. Check `logs/combined.log` for errors
2. Review `LLM_ATTRIBUTE_INFERENCE_SUMMARY.md`
3. Verify API keys in `.env.local`
4. Use `--resume` flag to continue from checkpoint
5. Check this troubleshooting guide

---

**Remember**: The system has checkpointing, so interruptions are safe. You can always resume later.
