# Persona Testing Framework

Comprehensive testing framework that uses AI-simulated personas to evaluate recommendation quality, relevance, personalization, and UX.

## 🎯 Purpose

This framework helps uncover opportunities to improve the recommendation system by:

1. **Testing with realistic users** - 10 diverse personas with different demographics, gift-giving styles, and expectations
2. **Measuring quality metrics** - Relevance, personalization, UX, response time
3. **Identifying weaknesses** - System automatically detects patterns and issues
4. **Prioritizing improvements** - Data-driven recommendations for what to build next

## 📊 Architecture

```
User → PersonaSimulator → Query Generation → Orchestrator → Recommendations
                               ↓                                    ↓
                         Expected Behavior              PersonaSimulator → Evaluation
                                                                           ↓
                                                                    Test Results
                                                                           ↓
                                                                    Report Generator
```

### Components

1. **TestPersona** - Comprehensive persona definitions with demographics, gift-giving style, psychographics
2. **PersonaSimulator** - Sub-agent that generates realistic queries and evaluates recommendations
3. **PersonaTestHarness** - Runs tests and collects metrics
4. **PersonaReportGenerator** - Creates markdown, JSON, and CSV reports

## 👥 10 Test Personas

### Coverage

- **Age range**: 21-62 years
- **Income levels**: Low, moderate, comfortable, very high
- **Planning styles**: Last-minute, week-before, planned, early-planner
- **Occasions**: Birthday, Christmas, anniversary, graduation, wedding, thank-you, just-because
- **Relationships**: Family (mom, dad, sibling, grandchild), romantic (spouse, partner), friends, colleagues
- **Budget ranges**: $15-40, $25-100, $120-200, $200-500

### Personas

1. **Sarah Chen** - Thoughtful planner, 32, Product Manager
   - Planning: Planned, analytical
   - Budget: $50-150
   - Occasion: Mom's birthday (milestone)
   - Values: Sustainability, quality, uniqueness

2. **Mike Johnson** - Last-minute gifter, 28, Software Engineer
   - Planning: Last-minute, quick-decisive
   - Budget: $30-100
   - Occasion: Dad's Christmas (3 days)
   - Stressors: Time pressure, urgency

3. **Jessica Martinez** - Budget-conscious student, 21
   - Planning: Week-before, thoughtful
   - Budget: $15-40 (strict)
   - Occasion: Best friend's birthday
   - Values: Creativity, value-for-money

4. **David Kim** - Generous executive, 45, VP of Sales
   - Planning: Early planner, decisive
   - Budget: $200-500 (generous)
   - Occasion: Wife's anniversary (milestone)
   - Values: Quality, luxury, exclusivity

5. **Emily Foster** - Anxious new relationship, 26, Graphic Designer
   - Planning: Planned, second-guesser
   - Budget: $40-80
   - Occasion: Boyfriend's birthday (1-2 year relationship)
   - Stressors: Fear of disappointment, overthinking

6. **Linda Thompson** - Practical parent, 38, Teacher
   - Planning: Week-before, thoughtful
   - Budget: $25-60 (value-focused)
   - Occasion: Sister's Christmas (new baby)
   - Values: Practicality, value, quality

7. **Robert Chen** - Corporate gift-giver, 41, Team Lead
   - Planning: Planned, analytical
   - Budget: $30-50 (strict)
   - Occasion: Team member thank-you
   - Values: Professionalism, appropriateness

8. **Alex Rivera** - Trendy Gen-Z, 23, Content Creator
   - Planning: Last-minute, quick-decisive
   - Budget: $35-90
   - Occasion: Close friend just-because
   - Values: Authenticity, sustainability, aesthetics

9. **Barbara Williams** - Empty-nester, 62, Retired
   - Planning: Early planner, thoughtful
   - Budget: $75-200 (generous)
   - Occasion: Grandson's graduation
   - Values: Family, tradition, quality

10. **Raj Patel** - International gifter, 35, Data Scientist
    - Planning: Planned, analytical
    - Budget: $60-120
    - Occasion: Friend's wedding (international)
    - Values: Cultural sensitivity, uniqueness

## 🚀 Quick Start

### List All Personas

```bash
npm run test:personas:list
```

### Run Quick Test (3 personas)

```bash
npm run test:personas:quick
```

This runs a fast test with 3 diverse personas (thoughtful planner, last-minute, budget-conscious) and generates a report.

### Run Single Persona

```bash
npm run test:personas run -- --persona persona-001-sarah
```

### Run Full Batch Test

```bash
# Test all 10 personas
npm run test:personas:batch

# Test specific personas
npm run test:personas batch -- --personas persona-001-sarah persona-002-mike persona-003-jessica

# Run with variations (3 queries per persona)
npm run test:personas batch -- --variations

# Run multiple iterations
npm run test:personas batch -- --iterations 3
```

## 📈 Metrics Collected

### Quality Metrics

1. **Relevance Score** (0-10)
   - Do recommendations match the recipient's interests?
   - Are they appropriate for the occasion?
   - Do they fit the relationship context?

2. **Personalization Score** (0-10)
   - Do recommendations feel tailored to this specific person?
   - Is the reasoning personalized?
   - Do they reflect the gift-giver's style?

3. **UX Score** (0-10)
   - Was the experience smooth?
   - Were explanations helpful?
   - Was the response time acceptable?
   - Did the system meet expectations?

### Technical Metrics

- **Response Time** - Total time to generate recommendations
- **Interest Match Accuracy** - How well interests were extracted and matched
- **Budget Adherence** - % of recommendations within budget
- **Diversity Score** - Variety in recommendations
- **Explanation Quality** - Usefulness of reasoning

### Success Metrics

- **Meets Expectations** - Boolean: Did results meet persona's mustHaves and avoid dealBreakers?
- **Success Rate** - % of tests that meet expectations

## 📊 Reports Generated

### 1. Markdown Report (`*_report.md`)

Comprehensive human-readable report with:
- Executive summary
- Key metrics by persona, occasion, budget
- Strengths and weaknesses
- Per-persona analysis
- Prioritized improvements

### 2. JSON Summary (`*_summary.json`)

Machine-readable summary for dashboards:
```json
{
  "runId": "batch_1234567890",
  "metrics": {
    "totalTests": 10,
    "avgRelevanceScore": 7.2,
    "avgPersonalizationScore": 6.8,
    "avgUXScore": 7.5,
    "successRate": 0.7
  },
  "topImprovements": [...]
}
```

### 3. Full Results (`*.json`)

Complete test results for deep analysis

### 4. CSV Export (`*_results.csv`)

Spreadsheet-friendly format for custom analysis

## 🔍 Interpreting Results

### Score Ranges

| Score | Status | Meaning |
|-------|--------|---------|
| 8.0+ | 🟢 Excellent | System exceeding expectations |
| 7.0-7.9 | 🟢 Good | System performing well |
| 6.0-6.9 | 🟡 Acceptable | Room for improvement |
| 5.0-5.9 | 🟡 Needs Work | Significant issues |
| < 5.0 | 🔴 Poor | Critical problems |

### Success Rate

- **> 75%** - System working well for most personas
- **50-75%** - System needs improvement
- **< 50%** - Critical issues, system not production-ready

## 🎯 Example Workflow

### 1. Initial Assessment

```bash
# Run quick test to get baseline
npm run test:personas:quick
```

Review report:
- What are the overall scores?
- Which personas are satisfied?
- What are the top issues?

### 2. Deep Dive

```bash
# Test all personas with variations
npm run test:personas batch -- --variations
```

Review detailed report:
- Are issues consistent across personas?
- Do specific persona types struggle?
- What patterns emerge?

### 3. Targeted Testing

```bash
# Test personas with specific characteristics
npm run test:personas batch -- --personas persona-003-jessica persona-006-linda

# (Budget-conscious personas to test budget adherence)
```

### 4. Iteration

1. Make improvements based on insights
2. Re-run tests
3. Compare metrics to previous run
4. Validate improvements worked

## 📝 Customizing Personas

### Adding New Personas

Edit `/src/test/personas/test-personas.ts`:

```typescript
{
  id: 'persona-011-custom',
  name: 'Custom Persona',
  demographics: {
    age: 30,
    gender: 'female',
    // ...
  },
  giftGivingStyle: {
    planningStyle: 'planned',
    // ...
  },
  // ...
}
```

### Modifying Scenarios

Each persona can have multiple scenarios:

```typescript
scenarios: [
  {
    id: 'scenario-1',
    occasion: { type: 'birthday', ... },
    recipient: { ... },
    context: { ... },
  },
  {
    id: 'scenario-2',
    occasion: { type: 'christmas', ... },
    // ...
  }
]
```

## 🎓 Understanding PersonaSimulator

The PersonaSimulator is an AI sub-agent that:

### 1. Query Generation

Takes persona + scenario and generates realistic queries:

```
Input:
- Sarah Chen (thoughtful planner, analytical, values sustainability)
- Mom's 60th birthday, 14 days away
- Interests: gardening, cooking, reading, yoga

Output Query:
"I'm looking for a meaningful 60th birthday gift for my mom. She's recently retired
and loves gardening, cooking, and yoga. Budget is $50-150. I want something special
and unique, ideally sustainable or handmade. She's very active and health-conscious."
```

### 2. Recommendation Evaluation

Evaluates recommendations from the persona's perspective:

```
Input:
- Query above
- 5 recommendations received

Output:
- Relevance score: 8.2/10
- Personalization score: 7.5/10
- What worked: "Recommendations matched interests, within budget"
- What didn't work: "Not enough variety, all similar products"
- Would consider: [Product 1, Product 3, Product 4]
```

### 3. Ground Truth

Provides ideal characteristics for validation:

```
Ideal characteristics:
- Related to gardening, cooking, or yoga
- High quality, sustainable
- Practical but special
- $50-150 range

Red flags:
- Generic gifts
- Technology gadgets
- Clutter/decorative items
```

## 🚀 Next Steps

### After Running Tests

1. **Review Prioritized Improvements**
   - Focus on high-impact, medium-effort items first
   - Address critical issues immediately

2. **Analyze Patterns**
   - Do specific persona types struggle?
   - Are certain occasions problematic?
   - Is budget adherence an issue?

3. **Test Specific Hypotheses**
   - Create targeted personas for edge cases
   - Test improvements with before/after metrics

4. **Track Over Time**
   - Run tests regularly (weekly, before releases)
   - Monitor trends in quality metrics
   - Celebrate improvements!

## 🔬 Advanced Usage

### Programmatic Usage

```typescript
import { PersonaTestHarness } from './src/test/persona-test-harness';
import { TEST_PERSONAS } from './src/test/personas/test-personas';

const harness = new PersonaTestHarness();

// Run single test
const persona = TEST_PERSONAS[0];
const result = await harness.runPersonaTest(persona, 0);

// Run batch
const results = await harness.runBatchTest(
  ['persona-001-sarah', 'persona-002-mike'],
  true, // include variations
  2     // iterations
);

await harness.close();
```

### Custom Metrics

Extend `PersonaTestResult` type to add custom metrics:

```typescript
// src/types/persona.ts
export interface PersonaTestResult {
  // ... existing fields
  customMetrics?: {
    myMetric: number;
    anotherMetric: string;
  };
}
```

### Custom Evaluation

Extend `PersonaSimulator` to add custom evaluation logic:

```typescript
// src/services/agents/persona-simulator.ts
async evaluateWithCustomLogic(simulatedQuery, recommendations) {
  // Your custom evaluation logic
}
```

## 📞 Support

Issues with persona testing?

1. Check logs in `logs/combined.log`
2. Verify OpenAI API key is set
3. Ensure database connection is working
4. Check that orchestrator runs successfully with `npm run search`

## 🎉 Benefits

- **Data-driven decisions** - Know exactly what to improve
- **Realistic testing** - Simulates real user diversity
- **Continuous validation** - Track quality over time
- **Fast iteration** - Quick feedback on changes
- **Comprehensive coverage** - Tests edge cases you might miss

---

**Built with**: OpenAI GPT-4o (persona simulation), TypeScript, Commander CLI

**Version**: 1.0.0

**Last Updated**: October 29, 2025
