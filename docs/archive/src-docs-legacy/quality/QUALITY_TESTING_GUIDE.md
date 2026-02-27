# Quality Testing Guide - Real User Scenarios

## Overview

This guide focuses on **testing recommendation quality with realistic user queries** - the way actual users would interact with the system.

---

## Test Scenarios

We've created **13 realistic test scenarios** organized by difficulty:

### EASY (2 scenarios)
Simple queries with clear intent and common interests:
- ✅ "My dad loves coffee, birthday gift, $50"
- ✅ "Christmas gift for friend who loves reading, $30"

### MEDIUM (3 scenarios)
Multiple interests, some constraints:
- ✅ "Anniversary gift, girlfriend loves cooking and wine, $150"
- ✅ "Tech dad who has everything, need something unique, $75"
- ✅ "Eco-conscious mom who loves gardening, Mother's Day, $60"

### HARD (3 scenarios)
Conflicting requirements, vague interests:
- ✅ "Minimalist friend who hates clutter, Christmas, $40-80"
- ✅ "Brother loves fitness AND video games, birthday, $50"
- ✅ "Girlfriend obsessed with true crime and vinyl, anniversary, $100"

### EXPERT (5 scenarios)
Edge cases, multiple constraints, abstract:
- ✅ "Meaningful experiential gift for wife starting new job, no food/drink, $75-125"
- ✅ "Retiring parents downsizing, sentimental but space-efficient, $80"
- ✅ "Coworker birthday, don't know hobbies, office-appropriate, $30"

---

## Quick Start

### Run All Scenarios (13 tests)
```bash
npm run test:real-users
```

**Expected output**:
```
================================================================================
  REAL USER SCENARIO TESTING
  Focus: Recommendation Quality
================================================================================

TEST: Coffee Lover Dad - Birthday [EASY]
Query: "My dad loves coffee and he has a birthday coming up. Budget around $50."
...
Quality Score: 8/10
✓ PASS

SUMMARY:
Passed: 9/13 (69.2%)
Average Quality Score: 7.3/10
```

### Run By Difficulty
```bash
npm run test:real-users:easy     # 2 easy tests
npm run test:real-users:medium   # 3 medium tests
npm run test:real-users:hard     # 3 hard tests
npm run test:real-users:expert   # 5 expert tests
```

---

## What Gets Evaluated

### Quality Scoring (0-10 points)

| Criteria | Points | Description |
|----------|--------|-------------|
| **Products Returned** | 2 | Did we get any results? |
| **Diversity** | 2 | Multiple vendors (60%+ different) |
| **Budget Adherence** | 2 | All products within budget |
| **Must-Have Match** | 3 | Products match required criteria |
| **Must-Not-Have** | 2 | Properly excludes unwanted items |
| **Personalization** | 1 | Reasoning is personalized (bonus) |

**Passing Score**: ≥7/10

### Success Criteria

A test **passes** if:
- ✅ Quality score ≥ 7/10
- ✅ Products match core requirements
- ✅ Budget respected
- ✅ Appropriate diversity

A test **fails** if:
- ❌ Quality score < 7/10
- ❌ No products returned
- ❌ Products don't match query intent
- ❌ Budget violations

---

## Understanding Results

### Sample Output

```bash
================================================================================
TEST: Tech Dad - Has Everything [MEDIUM]
Query: "My dad is really into tech and gadgets but he already has everything..."
================================================================================

Execution Time: 4,237ms
Products Returned: 12
Quality Score: 8/10

Strengths:
  ✓ Returned 12 products
  ✓ Good diversity: 9 different vendors
  ✓ All products within budget
  ✓ Products match required criteria: tech, unique

Issues:
  ⚠ Low personalization in 2 product reasonings

Top 3 Recommendations:
  1. Smart Coffee Mug Warmer
     $49.99 - TechGadgets
     "Perfect for the tech-savvy dad who has everything - this unique..."
  2. Wireless Charging Station
     $65.00 - ModernTech
     "An elegant tech solution that combines form and function..."
  3. LED Desk Lamp with USB Ports
     $72.50 - HomeOffice
     "Practical tech upgrade for his workspace with modern features..."

✓ PASS
```

### Summary Section

```
SUMMARY
================================================================================
Total Tests: 13
Passed: 9 (69.2%)
Failed: 4 (30.8%)
Average Quality Score: 7.3/10
Average Execution Time: 4,523ms

By Difficulty:
  EASY: 2/2 passed (9.5/10 avg)
  MEDIUM: 3/3 passed (8.3/10 avg)
  HARD: 2/3 passed (6.8/10 avg)
  EXPERT: 2/5 passed (5.2/10 avg)

Most Common Issues:
  ❌ No products match required criteria: 3 times
  ⚠ Low diversity: 2 times
  ❌ Products exceed budget: 1 time

================================================================================
  ✓ SYSTEM QUALITY: GOOD (needs improvement on expert scenarios)
================================================================================
```

---

## Target Benchmarks

### Success Rate by Difficulty

| Difficulty | Target | Good | Excellent |
|------------|--------|------|-----------|
| **Easy** | 80% | 90% | 100% |
| **Medium** | 60% | 75% | 90% |
| **Hard** | 40% | 55% | 70% |
| **Expert** | 25% | 40% | 55% |
| **Overall** | 50% | 65% | 80% |

### Quality Score Targets

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| **Avg Score** | 6.0/10 | 7.0/10 | 8.0/10 |
| **Easy Avg** | 7.0/10 | 8.5/10 | 9.5/10 |
| **Medium Avg** | 6.5/10 | 7.5/10 | 8.5/10 |
| **Hard Avg** | 5.5/10 | 6.5/10 | 7.5/10 |
| **Expert Avg** | 4.5/10 | 5.5/10 | 6.5/10 |

---

## Current Status (Baseline)

**Before today's improvements**:
- Success Rate: ~0% (system quality report)
- Average Quality: 5.3/10 (persona tests)
- Main issues: Generic recommendations, no semantic understanding

**Expected after improvements**:
- Success Rate: 50-65% (based on improvements)
- Average Quality: 7.0-7.5/10
- Main improvements: Archetype matching, dual-profiling, performance

---

## Interpreting Failures

### Common Failure Patterns

**1. "No products match required criteria"**
- **Cause**: Interest coverage gaps, archetype mismatch
- **Fix**: Add missing interests, improve attribute tagging
- **Example**: "true crime podcasts" → Need niche interest coverage

**2. "Low diversity"**
- **Cause**: Diversity algorithm too aggressive, limited product pool
- **Fix**: Adjust diversity thresholds, expand catalog
- **Example**: Too many products from same vendor

**3. "Products exceed budget"**
- **Cause**: Constraint validation issue
- **Fix**: Review Constraints agent budget handling
- **Example**: Budget $50 but showing $65 items

**4. "Generic personalization"**
- **Cause**: Storyteller not using giver/recipient context
- **Fix**: Verify context passing, improve prompt
- **Example**: Reasoning doesn't reference relationship or values

---

## Adding Your Own Scenarios

Edit `scripts/test-real-user-scenarios.ts`:

```typescript
{
  id: 'custom-1',
  name: 'Your Scenario Name',
  query: 'Natural language query like a real user would type',
  expectedQualities: ['quality1', 'quality2'],
  mustHave: ['required interest or type'],
  mustNotHave: ['excluded items'],
  difficulty: 'medium'
}
```

**Tips for good test scenarios**:
- Use natural language (how users actually talk)
- Include budget explicitly
- Mention relationship and occasion
- Add constraints that real users have
- Test edge cases (conflicting requirements, no interests, etc.)

---

## Next Steps After Testing

### If Success Rate < 50%
Focus on **foundational issues**:
1. Check attribute population completed successfully
2. Verify interest coverage (orphaned products fixed)
3. Review Explorer agent query results
4. Check Listener agent context extraction

### If Success Rate 50-65%
Focus on **quality improvements**:
1. Improve Meaning agent archetype identification
2. Enhance Validator agent filtering
3. Add more product attributes
4. Refine diversity algorithm

### If Success Rate > 65%
Focus on **optimization**:
1. Fine-tune scoring weights
2. A/B test variations
3. Add advanced personalization
4. Optimize for speed

---

## Debugging Individual Scenarios

### Run a single scenario
Modify the script to run only one:

```typescript
const scenariosToRun = SCENARIOS.filter(s => s.id === 'medium-1');
```

### Enable detailed logging
Set log level to debug in `.env.local`:

```env
LOG_LEVEL=debug
```

### Check agent outputs
Review logs for each agent's decisions:
- `logs/combined.log` - All agent activities
- Look for: Listener extraction, Meaning archetype, Explorer candidates

---

## Continuous Quality Monitoring

### Recommended Testing Schedule

**During Development**:
```bash
npm run test:real-users:easy     # Quick smoke test (2 tests, ~1 min)
npm run test:real-users:medium   # Core scenarios (3 tests, ~2 min)
```

**Before Deployment**:
```bash
npm run test:real-users          # Full suite (13 tests, ~5 min)
```

**In Production**:
- Run weekly with real user queries
- Track success rate trends
- Identify new edge cases
- Add failing queries as new test scenarios

---

## Quality Improvement Workflow

1. **Run tests** → Identify failures
2. **Analyze** → Which agent/component failed?
3. **Fix** → Targeted improvement
4. **Re-test** → Verify fix worked
5. **Repeat** → Iterate until targets met

### Example Workflow

```bash
# 1. Run tests
npm run test:real-users

# 2. Analyze: "No products for minimalist scenario"
#    → Issue: Not recognizing "experiential" need

# 3. Fix: Improve Meaning agent prompt for minimalist queries

# 4. Re-test
npm run test:real-users:hard

# 5. Success rate improved 40% → 55% ✓
```

---

## Tips for Maximum Quality

### 1. **Start with Easy Scenarios**
Build confidence with simple queries first:
```bash
npm run test:real-users:easy
```
Target: 100% pass rate

### 2. **Tackle Medium Next**
These represent most real-world queries:
```bash
npm run test:real-users:medium
```
Target: 75%+ pass rate

### 3. **Hard = Differentiation**
These show where you excel vs competitors:
```bash
npm run test:real-users:hard
```
Target: 55%+ pass rate

### 4. **Expert = Innovation**
Stretch goals, don't worry about low pass rate:
```bash
npm run test:real-users:expert
```
Target: 40%+ pass rate (anything above is excellent!)

---

## Comparison with Persona Testing

| Feature | Real User Scenarios | Persona Testing |
|---------|---------------------|-----------------|
| **Focus** | Query quality | User profile depth |
| **Queries** | Natural language | Structured profiles |
| **Scenarios** | 13 diverse | 3 detailed |
| **Time** | ~5 min | ~15 min |
| **Use Case** | Quick quality check | Deep personalization test |
| **Best For** | Development iteration | Production validation |

**Recommendation**: Use **Real User Scenarios** for daily development, **Persona Testing** for release validation.

---

## Success Indicators

You'll know the system is working well when:

✅ **Easy scenarios**: 100% pass (quick wins)
✅ **Medium scenarios**: 75%+ pass (core functionality)
✅ **Hard scenarios**: 55%+ pass (competitive advantage)
✅ **Expert scenarios**: 40%+ pass (innovation)
✅ **Overall**: 65%+ pass (excellent quality)
✅ **Avg quality score**: 7.0+/10 (user satisfaction)
✅ **Execution time**: <5s (performance)

---

## Common Questions

**Q: Why 13 scenarios instead of 100?**
A: Quality over quantity. 13 well-designed scenarios cover the critical paths. You can add more as you find new edge cases.

**Q: Can I test with my own queries?**
A: Yes! Add them to the SCENARIOS array or modify the script to accept command-line queries.

**Q: What if all tests fail?**
A: Check basics first:
1. Is attribute population complete?
2. Is Neo4j connection working?
3. Are OpenAI API calls succeeding?
4. Review logs for errors

**Q: How often should I run these tests?**
A:
- During development: After each change (easy/medium only)
- Before commits: Full suite
- Before deployment: Full suite + persona tests

---

## Next Steps

1. **Wait for attribute population to complete** (~10 min)
2. **Run easy scenarios first**:
   ```bash
   npm run test:real-users:easy
   ```
3. **If those pass, run full suite**:
   ```bash
   npm run test:real-users
   ```
4. **Analyze results and iterate**

---

**Goal**: Achieve 65%+ overall success rate with 7.0+/10 average quality score.

Good luck! 🎯
