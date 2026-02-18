# UX Test Plan – Present-Agent2

**Purpose**: Validate recommendations quality, user experience, and bug fixes
**Status**: Ready to execute (requires valid Neo4j credentials)
**Last Updated**: 2025-11-24

---

## ⚠️ Prerequisites

Before running these tests:

1. **Update `.env.local` with valid credentials**:
   ```bash
   NEO4J_URL=neo4j+s://YOUR_ACTUAL_INSTANCE.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=YOUR_ACTUAL_PASSWORD
   ```

2. **Start the servers**:
   ```bash
   npm run dev
   ```

3. **Verify backend is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

---

## 🎯 Test Suite Overview

| Test Category | # Tests | Priority | Time Est. |
|--------------|---------|----------|-----------|
| Bug Fixes Validation | 3 | 🔴 Critical | 10 min |
| Recommendation Quality | 5 | 🟠 High | 20 min |
| User Experience Flow | 4 | 🟠 High | 15 min |
| Edge Cases | 3 | 🟡 Medium | 10 min |
| Performance | 2 | 🟡 Medium | 10 min |
| **TOTAL** | **17 tests** | | **~65 min** |

---

## 🔴 PART 1: Bug Fixes Validation (CRITICAL)

These tests validate the 3 critical bugs we fixed.

### Test 1.1: Multi-Turn Conversation Fix ✅

**Bug Fixed**: "No previous context found for session" error

**Test Steps**:
```bash
# Step 1: Send minimal query (should get questions)
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for my sister",
    "userId": "test-bug-fix-001",
    "sessionId": "test-multiturn-001"
  }' | python3 -m json.tool > /tmp/step1.json

# Verify: mode should be "clarifying"
cat /tmp/step1.json | grep '"mode"'

# Step 2: Answer questions (THIS SHOULD WORK NOW - previously crashed!)
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for my sister",
    "userId": "test-bug-fix-001",
    "sessionId": "test-multiturn-001",
    "clarifications": {
      "interests": "reading",
      "budget": {"min": 30, "max": 50},
      "occasion": {"name": "birthday", "urgency": "planned"}
    },
    "originalQuery": "gift for my sister"
  }' | python3 -m json.tool > /tmp/step2.json

# Verify: Should get recommendations, NO error
cat /tmp/step2.json | grep -E '(mode|error|recommendations)'
```

**Expected Result**:
- ✅ Step 1: Returns questions (mode: "clarifying")
- ✅ Step 2: Returns recommendations (NO "No previous context found" error)
- ✅ Response includes products with reasoning

**Pass Criteria**: No errors, recommendations returned in step 2

---

### Test 1.2: Neo4j Retry Logic ✅

**Bug Fixed**: Intermittent Neo4j connection failures

**Test Steps**:
```bash
# Run multiple queries in quick succession to test connection pool
for i in {1..5}; do
  echo "Request $i..."
  curl -X POST http://localhost:3000/api/recommend \
    -H "Content-Type: application/json" \
    -d "{
      \"userQuery\": \"birthday gift for dad\",
      \"userId\": \"test-retry-$i\",
      \"sessionId\": \"test-retry-$i\"
    }" -w "\nStatus: %{http_code}\n" -s -o /tmp/retry-test-$i.json

  # Check for errors
  cat /tmp/retry-test-$i.json | grep -i error && echo "❌ FAILED" || echo "✅ PASSED"
  sleep 2
done
```

**Expected Result**:
- ✅ All 5 requests succeed (HTTP 200)
- ✅ If any Neo4j connection issue occurs, system auto-retries (check logs)
- ✅ No complete failures

**Check Logs**:
```bash
# Look for retry messages in logs
tail -100 logs/combined.log | grep -i "retry"
```

**Pass Criteria**: All requests succeed, retries logged if needed

---

### Test 1.3: Memory Agent Graceful Degradation ✅

**Bug Fixed**: ERROR logs when failures are handled gracefully

**Test Steps**:
```bash
# Send query and check logs for appropriate log levels
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for my mom who loves gardening",
    "userId": "test-new-user-001",
    "sessionId": "test-graceful-001"
  }' > /tmp/graceful-test.json

# Check logs for Memory agent
tail -50 logs/combined.log | grep -i "memory"
```

**Expected Result**:
- ✅ Query succeeds even for new user with no history
- ✅ Logs show WARN level (not ERROR) for "no history" scenarios
- ✅ Response includes recommendations

**Pass Criteria**: System continues gracefully, appropriate log levels

---

## 🟠 PART 2: Recommendation Quality Tests

### Test 2.1: Detailed Query → Direct Recommendations

**Scenario**: User provides complete context upfront

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Birthday gift for my wife who loves cooking and baking, budget $50-100, she also values sustainable and eco-friendly products",
    "userId": "test-quality-001",
    "sessionId": "test-quality-001"
  }' | python3 -m json.tool > /tmp/quality-detailed.json
```

**Evaluate**:
- [ ] Mode: Should be "recommendations" or "recommendations_with_refinement"
- [ ] Product relevance: Do recommendations match cooking/baking interests?
- [ ] Price accuracy: Are recommendations in $50-100 range?
- [ ] Personalization: Does reasoning mention wife, cooking, sustainability?
- [ ] Confidence scores: Are they reasonable (0.3-0.8 range)?

**Quality Benchmarks**:
- **Excellent**: 3+ highly relevant products, personalized reasoning
- **Good**: 2-3 relevant products, generic reasoning
- **Needs Improvement**: <2 relevant products or off-budget

---

### Test 2.2: Minimal Query → Questions → Recommendations

**Scenario**: User provides minimal info, answers questions

```bash
# Step 1: Minimal query
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "need a gift",
    "userId": "test-quality-002",
    "sessionId": "test-quality-002"
  }' | python3 -m json.tool > /tmp/quality-minimal-1.json

# Check questions received
cat /tmp/quality-minimal-1.json | jq '.questions[] | {question, type}'

# Step 2: Answer questions
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "need a gift",
    "userId": "test-quality-002",
    "sessionId": "test-quality-002",
    "clarifications": {
      "relationship": "friend",
      "interests": "tech",
      "budget": {"min": 25, "max": 75},
      "occasion": {"name": "birthday", "urgency": "planned"}
    },
    "originalQuery": "need a gift"
  }' | python3 -m json.tool > /tmp/quality-minimal-2.json
```

**Evaluate**:
- [ ] Questions are clear and specific?
- [ ] Suggested answers are helpful (not "Option A/B")?
- [ ] Recommendations after answering are relevant to tech + friend + $25-75?
- [ ] Reasoning incorporates answered questions?

---

### Test 2.3: Interest Specificity

**Scenario**: Test if system handles broad vs. specific interests

```bash
# Test A: Broad interest
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for dad who likes music, budget $60",
    "userId": "test-interest-001",
    "sessionId": "test-interest-001"
  }' | python3 -m json.tool > /tmp/interest-broad.json

# Check if system asks refinement question
cat /tmp/interest-broad.json | jq '.questions[]? | select(.field | contains("music"))'
```

**Expected**:
- System should ask: "What type of music?" (listener, musician, producer)
- Refinement questions show specific options

---

### Test 2.4: Budget Constraints

**Scenario**: Test budget filtering accuracy

```bash
# Test: Strict budget
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for coworker who likes coffee, budget EXACTLY $25, cannot go over",
    "userId": "test-budget-001",
    "sessionId": "test-budget-001"
  }' | python3 -m json.tool > /tmp/budget-strict.json

# Check all recommendation prices
cat /tmp/budget-strict.json | jq '.recommendations.recommendations[] | {name: .product.title, price: .product.price}'
```

**Pass Criteria**:
- [ ] ALL recommendations ≤ $25 (should be strict)
- [ ] System recognizes "EXACTLY" / "cannot go over" signals

---

### Test 2.5: Occasion Appropriateness

**Scenario**: Test if recommendations match occasion formality

```bash
# Test: Professional occasion
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "retirement gift for my boss who is retiring after 30 years, budget $100-150, she loves reading and gardening",
    "userId": "test-occasion-001",
    "sessionId": "test-occasion-001"
  }' | python3 -m json.tool > /tmp/occasion-professional.json
```

**Evaluate**:
- [ ] Recommendations are appropriate for boss (professional, not too personal)
- [ ] Significance reflects 30-year career milestone
- [ ] Reasoning mentions professional relationship

---

## 🟠 PART 3: User Experience Flow Tests

### Test 3.1: Complete User Journey

**Scenario**: New user, first time, full flow

```bash
# User arrives, types vague query
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for someone special",
    "userId": "new-user-001",
    "sessionId": "journey-001"
  }' | python3 -m json.tool > /tmp/journey-1.json

# Evaluate questions
cat /tmp/journey-1.json | jq '{
  mode,
  question_count: .questions | length,
  has_escape_hatch: .showEscapeHatch,
  intro: .naturalLanguage.intro,
  encouragement: .encouragement
}'
```

**UX Checklist**:
- [ ] Intro is welcoming and conversational?
- [ ] 2-4 questions asked (not overwhelming)?
- [ ] Escape hatch visible ("Skip questions" option)?
- [ ] Questions have helpful suggested answers?
- [ ] Acknowledgment of what we know so far?

---

### Test 3.2: skipQuestions Escape Hatch

**Scenario**: User wants recommendations immediately

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "birthday gift",
    "userId": "test-skip-001",
    "sessionId": "test-skip-001",
    "skipQuestions": true
  }' | python3 -m json.tool > /tmp/skip-questions.json

# Check response
cat /tmp/skip-questions.json | jq '{
  mode,
  has_recommendations: (.recommendations.recommendations | length > 0),
  confidence: .recommendations.recommendations[0].confidence
}'
```

**Expected**:
- ✅ Returns recommendations immediately (no questions)
- ✅ Confidence scores are lower (expected with minimal context)
- ✅ Still provides reasoning for each product

---

### Test 3.3: Response Time Perception

**Scenario**: Measure response times for UX perception

```bash
# Quick query (questions only)
time curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for mom",
    "userId": "test-speed-001",
    "sessionId": "test-speed-001"
  }' -o /tmp/speed-test-1.json

# Full recommendations query
time curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for mom who loves cooking, budget $50",
    "userId": "test-speed-002",
    "sessionId": "test-speed-002"
  }' -o /tmp/speed-test-2.json
```

**Benchmark**:
- Questions only: ≤25 seconds (acceptable)
- Full recommendations: ≤50 seconds (needs optimization but acceptable)
- >60 seconds: Poor UX, needs attention

---

### Test 3.4: Error Handling & Feedback

**Scenario**: Invalid inputs

```bash
# Test 1: Empty query
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "",
    "userId": "test-error-001",
    "sessionId": "test-error-001"
  }' | python3 -m json.tool

# Test 2: Invalid budget
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for dad",
    "userId": "test-error-002",
    "sessionId": "test-error-002",
    "clarifications": {
      "budget": {"min": 1000, "max": 10}
    }
  }' | python3 -m json.tool
```

**Expected**:
- [ ] Friendly error messages (not technical jargon)
- [ ] Suggests how to fix the issue
- [ ] System doesn't crash

---

## 🟡 PART 4: Edge Cases

### Test 4.1: No Products Match Criteria

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gift for someone who collects vintage typewriters from 1920s Prussia, budget $5",
    "userId": "test-edge-001",
    "sessionId": "test-edge-001"
  }' | python3 -m json.tool > /tmp/edge-no-match.json
```

**Expected**:
- System handles gracefully (doesn't crash)
- Returns closest alternatives with explanation
- Or asks clarifying questions to broaden search

---

### Test 4.2: Conflicting Requirements

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "luxury gift that shows I care deeply, budget $10, needs to be high-quality and impressive",
    "userId": "test-edge-002",
    "sessionId": "test-edge-002"
  }' | python3 -m json.tool > /tmp/edge-conflict.json
```

**Expected**:
- System recognizes conflict (luxury vs. $10 budget)
- Either asks for clarification or manages expectations
- Reasoning explains the trade-off

---

### Test 4.3: Multiple Recipients

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "gifts for my mom and dad, mom likes gardening, dad likes cooking, budget $100 total",
    "userId": "test-edge-003",
    "sessionId": "test-edge-003"
  }' | python3 -m json.tool > /tmp/edge-multiple.json
```

**Expected**:
- System handles multiple recipients
- Splits budget appropriately
- Or asks which recipient to focus on first

---

## 🟡 PART 5: Performance Tests

### Test 5.1: Concurrent Users

```bash
# Simulate 5 concurrent users
for i in {1..5}; do
  (curl -X POST http://localhost:3000/api/recommend \
    -H "Content-Type: application/json" \
    -d "{
      \"userQuery\": \"birthday gift for friend\",
      \"userId\": \"concurrent-user-$i\",
      \"sessionId\": \"concurrent-$i\"
    }" -w "\nUser $i: %{time_total}s\n" -o /tmp/concurrent-$i.json) &
done
wait

# Check all succeeded
grep -l "recommendations" /tmp/concurrent-*.json | wc -l
```

**Expected**:
- All 5 requests succeed
- Response times remain reasonable (<60s each)
- No database connection errors

---

### Test 5.2: Memory Usage

```bash
# Monitor memory during operation
ps aux | grep "node.*server" | head -1

# Run 10 sequential requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/recommend \
    -H "Content-Type: application/json" \
    -d "{
      \"userQuery\": \"gift for dad who likes tech, budget \$50\",
      \"userId\": \"memory-test-$i\",
      \"sessionId\": \"memory-test-$i\"
    }" -o /tmp/memory-test-$i.json

  # Check memory after each request
  ps aux | grep "node.*server" | awk '{print $6/1024 " MB"}'
done
```

**Expected**:
- Memory usage remains stable (no leak)
- Doesn't exceed reasonable limits (~500MB for dev)

---

## 📊 Test Results Summary Template

Use this to track results:

```markdown
## Test Results - [Date]

### Bug Fixes (3 tests)
- [x] Multi-turn conversation: PASS/FAIL - Notes:
- [ ] Neo4j retry logic: PASS/FAIL - Notes:
- [ ] Memory agent fallback: PASS/FAIL - Notes:

### Recommendation Quality (5 tests)
- [ ] Detailed query: PASS/FAIL - Quality: Excellent/Good/Poor
- [ ] Minimal query flow: PASS/FAIL - Quality: Excellent/Good/Poor
- [ ] Interest specificity: PASS/FAIL - Notes:
- [ ] Budget constraints: PASS/FAIL - Budget accuracy: %
- [ ] Occasion appropriateness: PASS/FAIL - Notes:

### User Experience (4 tests)
- [ ] Complete journey: PASS/FAIL - UX Score: /10
- [ ] Skip questions: PASS/FAIL - Notes:
- [ ] Response times: PASS/FAIL - Avg: ___ seconds
- [ ] Error handling: PASS/FAIL - Notes:

### Edge Cases (3 tests)
- [ ] No matches: PASS/FAIL - Graceful: YES/NO
- [ ] Conflicts: PASS/FAIL - Handled: YES/NO
- [ ] Multiple recipients: PASS/FAIL - Notes:

### Performance (2 tests)
- [ ] Concurrent users: PASS/FAIL - Success rate: %
- [ ] Memory usage: PASS/FAIL - Stable: YES/NO

**Overall Assessment**:
**Critical Issues Found**:
**Recommendations for Improvement**:
```

---

## 🎯 Success Criteria

### Minimum Viable (Must Pass):
- ✅ All 3 bug fix tests pass
- ✅ At least 3/5 recommendation quality tests show "Good" or better
- ✅ No crashes or unhandled errors
- ✅ Response times < 60 seconds

### Production Ready (Should Pass):
- ✅ All bug fix tests pass
- ✅ 4/5 recommendation quality tests show "Good" or better
- ✅ All UX tests show acceptable experience
- ✅ Response times < 50 seconds average
- ✅ Edge cases handled gracefully

### Excellent (Target):
- ✅ 100% bug fix test success
- ✅ 5/5 recommendation quality tests show "Excellent"
- ✅ All UX tests score 8/10 or higher
- ✅ Response times < 35 seconds average
- ✅ All edge cases and performance tests pass

---

## 🚀 Quick Start

```bash
# 1. Update credentials in .env.local
# 2. Start servers
npm run dev

# 3. Run critical tests first
bash -c "$(curl -s https://raw.githubusercontent.com/...)" # (Or copy test commands)

# 4. Check logs for issues
tail -f logs/combined.log

# 5. Document results
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `tail -100 logs/combined.log`
2. Verify Neo4j connection: `curl http://localhost:3000/health`
3. Review test output in `/tmp/test-*.json` files
4. Report issues with test number and error details

---

**Happy Testing!** 🧪

Report your results and I'll help analyze and improve the system.
