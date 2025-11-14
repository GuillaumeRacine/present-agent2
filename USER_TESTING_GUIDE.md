# 🎁 User Testing Guide - Present-Agent2

## Quick Start: Test the System Yourself

Now that you have 99.7% attribute coverage (41,562/41,704 products), you can test the recommendation system with real queries!

---

## 🚀 Method 1: Start the API Server (Recommended)

### Step 1: Start the Backend Server

```bash
npm run server
```

This starts the HTTP API on `http://localhost:3000` (or your configured port).

### Step 2: Test with API Requests

#### Basic Recommendation Request

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "birthday gift for dad who loves coffee and grilling, budget $50-100"
  }'
```

#### More Complex Query

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "unique eco-friendly birthday gift for mom who loves gardening and yoga, budget $30-80, needs to be practical",
    "userId": "user_123",
    "sessionId": "session_abc"
  }'
```

###Step 3: Examine the Response

The API returns a comprehensive JSON response with:
- **Recommendations**: Top product matches
- **Reasoning**: Why each product was chosen
- **Agent Outputs**: Context from all 10 agents
- **Performance Metrics**: Execution times, scores
- **Gift Profile**: Extracted recipient/giver information

---

## 🎯 Method 2: Use CLI Testing Scripts

### Test with Predefined Personas

```bash
# Quick test (3 personas)
npm run test:personas:quick

# Full persona test (all personas)
npm run test:personas

# Batch test with variations
npm run test:personas:batch
```

### Test with Real User Scenarios

```bash
# Easy scenarios (simple queries)
npm run test:real-users:easy

# Medium scenarios (more context)
npm run test:real-users:medium

# Hard scenarios (complex requirements)
npm run test:real-users:hard

# Expert scenarios (very specific/challenging)
npm run test:real-users:expert

# All scenarios
npm run test:real-users
```

---

## 📊 Method 3: Interactive Search

### Using the Search CLI

```bash
npm run search
```

This opens an interactive search interface where you can:
1. Enter natural language queries
2. See recommendations with scores
3. Get detailed reasoning
4. Test different query types

---

## 🧪 Method 4: Frontend UI (If Available)

### Start Both Server and Frontend

```bash
# Terminal 1: Start backend
npm run server:dev

# Terminal 2: Start frontend
npm run frontend

# Or run both together
npm run dev
```

Then open your browser to `http://localhost:3001` (or configured frontend port).

---

## 📝 Example Test Queries

### Easy Queries (Good for Testing)

```
"birthday gift for dad who loves coffee"
"christmas present for mom under $50"
"anniversary gift for wife"
"graduation gift for brother who loves tech"
```

### Medium Queries (More Context)

```
"unique birthday gift for best friend who loves art and photography, budget $40-80"
"practical holiday gift for coworker who enjoys gardening, under $60"
"sentimental anniversary gift for partner who loves travel and cooking, $100-150"
```

### Hard Queries (Complex Requirements)

```
"eco-friendly birthday gift for mom who recently retired and loves gardening, cooking, and yoga. Budget $50-150. Prefer something experiential or sentimental, no tech gadgets or clutter. Need it in 14 days."
"luxury christmas gift for dad who has everything, loves golf and whiskey, budget $200-500, must be unique and not something he'd buy himself"
```

---

## 🔍 What to Look For

### 1. **Attribute Matching**

Products should now show strong archetype alignment:
- **Archetype scores**: Should be 0.20-1.00 (not 0.000)
- **Attribute counts**: Most products should have 20-30 attributes
- **Relevance**: Recommendations should match the query intent

### 2. **Recommendation Quality**

Check if recommendations:
- Match the recipient's interests
- Fit the budget
- Align with the gift archetype (practical, sentimental, experiential, etc.)
- Include diverse options (different categories, price points)

### 3. **Reasoning Quality**

The system should provide:
- Clear explanation of why each product matches
- Specific attribute alignments
- Personalization insights
- Context from the query

### 4. **Performance**

- **Response time**: Should be 10-30 seconds for most queries
- **Cache hits**: Subsequent similar queries should be faster
- **No errors**: Should handle all query types gracefully

---

## 📈 Check System Status

### Verify Attribute Coverage

```bash
npm run attributes:status
```

**Expected output:**
```
Total products: 41,704
Products with attributes: 41,562 (99.7%)
Products without attributes: 142 (0.3%)
```

### View Attribute Distribution

The status command shows how many products have each attribute:
```
is_practical                    23,906 (57.3%)
is_lasting_value                23,965 (57.5%)
is_conversation_starter         16,862 (40.4%)
is_luxury                       12,264 (29.4%)
...
```

---

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port is already in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Try different port
PORT=3001 npm run server
```

### Low Relevance Scores

This is normal! The system is designed with strict quality gates:
- **33% success rate** on persona tests is acceptable
- Validator ensures quality over quantity
- Some queries legitimately may not have great matches

### No Recommendations Returned

Check:
1. Budget range isn't too narrow
2. Interest exists in the product catalog
3. Query provides enough context
4. Neo4j connection is working

### Redis Warnings

```
⚠️  Redis connection error, falling back to in-memory cache
```

This is **fine** - the system automatically falls back to in-memory caching. Embeddings and recommendations will still work, just without distributed caching.

---

## 📊 Analyze Test Results

### View Test Reports

Test reports are saved in `test-results/`:
```bash
ls -lt test-results/
cat test-results/quick_test_*_report.md
```

### Key Metrics

- **Success Rate**: 30-50% is good with strict validation
- **Relevance Score**: 6+/10 is strong
- **Archetype Matching**: Should see non-zero scores
- **Response Time**: 10-30 seconds is normal

---

## 🎉 Success Criteria

You'll know the system is working well when:

✅ **Attribute coverage**: 95%+ (achieved: 99.7%)
✅ **Archetype scores**: Non-zero for most products
✅ **Recommendations**: Relevant to the query
✅ **Reasoning**: Clear and specific
✅ **Performance**: < 30 seconds per query
✅ **Diversity**: Mix of categories and price points

---

## 💡 Advanced Testing

### Test Specific Features

#### 1. **Giver Profiling**

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "I always give thoughtful, personalized gifts. Looking for something sentimental for my sister who loves books and coffee",
    "userId": "user_123"
  }'
```

#### 2. **Relationship Dynamics**

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "wedding gift for best friend from college, we bonded over travel and food"
  }'
```

#### 3. **Memory/History** (After multiple queries)

```bash
# First query
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "birthday gift for mom",
    "userId": "user_123",
    "sessionId": "session_abc"
  }'

# Second query (system should remember mom)
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "another gift for the same person, but for Christmas",
    "userId": "user_123",
    "sessionId": "session_abc"
  }'
```

---

## 📞 Next Steps

1. **Test your own queries** - Try queries relevant to your actual gift-giving needs
2. **Compare before/after** - Note the difference in archetype matching scores
3. **Check different archetypes** - Test practical, sentimental, experiential, luxury queries
4. **Monitor performance** - Track response times and relevance scores
5. **Report issues** - Document any unexpected behavior or low-quality recommendations

---

## 🔗 Quick Reference Commands

```bash
# Start server
npm run server

# Test personas
npm run test:personas:quick

# Test real users
npm run test:real-users:easy

# Check attributes
npm run attributes:status

# Interactive search
npm run search

# View health
curl http://localhost:3000/health
```

---

**Ready to test?** Start with:

```bash
npm run server
```

Then open a new terminal and try:

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "birthday gift for dad who loves coffee, budget $50"}'
```

Happy testing! 🚀
