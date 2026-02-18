# Present Agent2 - Research Index

> Academic foundation for gift recommendation system design

---

## Overview

**14 papers** on gift psychology, AI recommendations, and consumer behavior
**Location:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`
**Date Range:** 2023-2025 (mostly Dec 2024)

---

## Core Papers

### 1. Gift Recommendation Systems: A Review (2025)
**File:** `Gift recommendation systems_ a review _ Electronic Commerce Research.md`
**Authors:** Pouya Mohseni, Hedieh Sajedi, Khalid Hussain
**Journal:** Electronic Commerce Research, Volume 25, pages 3099–3130

**Key Contributions:**
- Framework for gift recommendation systems
- Psychological, marketing, and anthropological research synthesis
- Evaluation metrics for gift RS
- Literature review and gap analysis

**Framework Dimensions:**
1. Gift-giving context (occasion, relationship, culture)
2. Giver constraints (budget, time, knowledge)
3. Recipient modeling (preferences, needs, values)
4. Product space (catalog, attributes, availability)
5. Recommendation algorithm (CF, CB, hybrid, knowledge-based)
6. Explanation and transparency

**Evaluation Metrics:**
- Recommendation accuracy
- Recipient satisfaction
- Giver satisfaction (often overlooked!)
- Appropriateness for context
- Explanation quality

**Implication for Present Agent2:**
→ Must optimize for BOTH giver and receiver
→ Context modeling is critical (not just preferences)
→ Explainability builds trust

---

### 2. Gift Giving in the Age of AI (2024)
**File:** `Gift giving in the age of AI_ The role of social closeness - Fu - 2024.md`
**Authors:** Fu et al.
**Journal:** Psychology & Marketing (2024)

**Key Findings:**
- Social closeness moderates AI tool adoption
- For distant relationships: AI recommendations more accepted
- For close relationships: Personal touch more valued
- Trust in AI depends on gift outcome stakes

**Trust Factors:**
1. System transparency
2. Past accuracy
3. Explanation quality
4. Control (can override)

**Implication for Present Agent2:**
→ Weight AI confidence by relationship closeness
→ For close relationships: provide more context, less automation
→ Always allow human override

---

### 3. An Integrative Review of Gift-Giving Research (2023)
**File:** `An integrative review of gift‐giving research - Givi - 2023.md`
**Authors:** Givi
**Journal:** Journal of Consumer Psychology (2023)

**Key Insights:**
- Gift-giving is identity performance
- Givers optimize for self-expression + recipient joy
- Price-appreciation asymmetry (givers overweight, receivers underweight)
- Symbolic meaning > material value
- Cross-cultural variations in gift norms

**Consumer Behavior Patterns:**
- Risk aversion in gift-giving
- Preference for popular/safe gifts over personalized/risky
- Regret avoidance dominates for distant relationships

**Implication for Present Agent2:**
→ Model giver's identity goals
→ Downweight price in recommendations
→ Offer "safe" baseline + "personalized" stretch options

---

### 4. Give a Piece of You: Gifts That Reflect Givers (ScienceDirect)
**File:** `Give a piece of you_ Gifts that reflect givers promote closeness.md`

**Key Finding:**
- Gifts reflecting giver's identity strengthen bonds
- Recipients value knowing giver better
- Self-reflective gifts > perfectly matched gifts for relationship building

**Mechanism:**
- Vulnerability and authenticity signal
- Shared identity development
- Relationship depth over surface satisfaction

**Implication for Present Agent2:**
→ Consider giver's values/interests in recommendations
→ Suggest gifts that express giver's identity
→ Frame recommendations: "This reflects your love of..."

---

### 5. Giver-Receiver Discrepancy in Probabilistic vs Regular Gifts (2024)
**File:** `Giver‐receiver discrepancy in probabilistic vs regular gifts - Peng - 2024.md`
**Authors:** Peng et al.
**Journal:** Psychology & Marketing (2024)

**Key Findings:**
- Givers prefer guaranteed gifts (risk averse)
- Receivers open to probabilistic gifts (excitement value)
- Discrepancy greatest for high-value gifts
- Context matters: casual vs formal occasions

**Implication for Present Agent2:**
→ Model risk preferences separately for giver/receiver
→ Consider occasion formality
→ Offer gift type options (guaranteed vs surprise)

---

### 6. Power Dynamics: Boss vs Subordinate Gift Choices (ScienceDirect)
**File:** `Your gift choice for your boss versus your subordinate - ScienceDirect.md`

**Key Findings:**
- Upward gifts: more formal, expensive, safe
- Downward gifts: more personal, creative, risky
- Power asymmetry shapes appropriateness judgments
- Gender and culture modulate effects

**Implication for Present Agent2:**
→ Include relationship power dynamic in graph
→ Different recommendation strategies by direction
→ Adjust formality and personalization levels

---

### 7. Self-Gifting Consumer Behavior (Management Review)
**File:** `Self-gifting consumer behavior - Management Review Quarterly.md`

**Systematic Review Findings:**
- Self-gifting as reward, therapy, or exploration
- Different motivations than interpersonal gifting
- Price sensitivity lower for self-gifts
- Impulse vs planned self-gifts

**Implication for Present Agent2:**
→ Consider self-gifting use case (future feature)
→ Different agent logic for self vs other

---

### 8. Understanding AI Impact on Charitable Giving (2024)
**File:** `Understanding the impact of artificial intelligence on the justice of charitable giving - Yang - 2024.md`
**Authors:** Yang et al.
**Journal:** Journal of Consumer Behaviour (2024)

**Key Findings:**
- Perceived fairness of AI allocation
- Trust and regulatory orientation moderate acceptance
- Transparency critical for legitimacy

**Implication for Present Agent2:**
→ Explain recommendation rationale clearly
→ Allow filtering by values (e.g., B-Corp only)
→ Transparent about data sources

---

## Supporting Papers

### 9. Giving Pleasure or Avoiding Risk
**File:** `Giving pleasure or avoiding risk - Asia Pacific Journal.md`

**Focus:** Social closeness shapes gift strategy
- Close relationships: maximize pleasure
- Distant relationships: minimize risk

---

### 10. Attitude-Inconsistent Gifts
**File:** `Your gift, but my attitude - European Journal of Marketing.md`

**Focus:** Giver aversion to gifts misaligned with recipient's stated values/attitudes

---

### 11-14. Recent Technical Papers
- `2410.19744v1.md` (2 versions) - Latest ML approaches
- `2501.12152v2.md` - Recent systems research
- `s10462-025-11189-8.md` - Comprehensive systems review

---

## Key Research Themes

### Theme 1: Giver-Receiver Dual Optimization
**Papers:** 1, 2, 3, 5

**Insight:** Systems must optimize for BOTH parties, not just recipient satisfaction

**System Design:**
- Model giver identity, values, constraints
- Model receiver preferences, needs, values
- Model relationship context
- Balance giver self-expression + receiver joy

---

### Theme 2: Social Closeness Modulates Everything
**Papers:** 2, 6, 9

**Insight:** Relationship depth determines recommendation strategy

**System Design:**
- Score relationships on closeness scale (1-10)
- Close (8-10): Personal, risky, creative, identity-reflective
- Medium (4-7): Mixed safe + personal
- Distant (1-3): Safe, conventional, appropriate

---

### Theme 3: Context > Preferences
**Papers:** 1, 3, 5, 6

**Insight:** Occasion, relationship, culture override individual preferences

**System Design:**
- Occasion type (birthday, wedding, thank you, etc.)
- Formality level
- Cultural norms
- Power dynamics
- Budget expectations

---

### Theme 4: Explainability Builds Trust
**Papers:** 1, 2, 8

**Insight:** Users need to understand WHY, not just WHAT

**System Design:**
- For each recommendation, explain:
  - Why recipient will like it (preferences)
  - Why it's appropriate (context)
  - What it signals (giver identity)
  - Why this over alternatives

---

### Theme 5: Price-Appreciation Asymmetry
**Papers:** 3, 7

**Insight:** Givers overweight price, receivers underweight it

**System Design:**
- Don't optimize on price alone
- Emphasize non-price attributes
- Reframe budget as "investment in relationship"
- Show value beyond cost

---

## Research Gaps (Opportunities)

Based on literature review:

1. **Multi-recipient scenarios** (group gifting)
2. **Longitudinal gift history modeling** (memory agent)
3. **Cultural adaptation at scale**
4. **Real-time trend integration** (NewsAPI)
5. **Feedback loop for learning** (did they like it?)
6. **Ethical sourcing preferences** (B-Corp focus ✓)

---

## Application to Present Agent2

### Agent Design Implications

| Agent | Research Basis | Key Papers |
|-------|----------------|------------|
| **Listener** | Context extraction critical | 1, 5 |
| **Memory** | Gift history informs future | Gap (opportunity) |
| **Relationship** | Closeness + power dynamics | 2, 6, 9 |
| **Constraints** | Budget, time, values | 1, 3 |
| **Explorer** | Hybrid search (preference + context) | 1 |
| **Validator** | Appropriateness > pure match | 1, 5, 6 |
| **Presenter** | Explainability builds trust | 1, 2, 8 |

---

### Database Schema Implications

```cypher
// Relationship node should include
(:Person)-[:KNOWS {
  closeness: 1-10,           // Papers 2, 9
  power_dynamic: "equal"|"up"|"down",  // Paper 6
  formality: 1-10,           // Paper 6
  gift_history: [...]        // Gap
}]->(:Person)

// Context node should include
(:Occasion {
  type: "birthday"|"wedding"|...,
  formality: 1-10,
  cultural_context: "...",   // Paper 3
  expected_price_range: "..."  // Paper 3
})

// Product should include
(:Product {
  personalization_potential: 1-10,  // Paper 4
  risk_level: 1-10,                 // Paper 5
  identity_signal: [...],           // Paper 4
  appropriateness_contexts: [...]   // Paper 1
})
```

---

### Recommendation Algorithm Implications

```python
def score_gift(product, giver, receiver, occasion, relationship):
    """
    Multi-factor scoring based on research insights
    """
    scores = {
        'recipient_match': vector_similarity(product, receiver.preferences),  # Traditional
        'giver_expression': identity_alignment(product, giver.values),        # Paper 4
        'appropriateness': context_fit(product, occasion, relationship),      # Papers 1, 5, 6
        'closeness_fit': closeness_strategy(product, relationship.closeness), # Paper 2, 9
        'risk_balance': risk_alignment(product, relationship.power_dynamic),  # Paper 5, 6
    }

    # Weight by relationship closeness
    if relationship.closeness >= 8:
        weights = {'recipient_match': 0.3, 'giver_expression': 0.3, 'appropriateness': 0.2, 'closeness_fit': 0.1, 'risk_balance': 0.1}
    elif relationship.closeness >= 4:
        weights = {'recipient_match': 0.4, 'giver_expression': 0.2, 'appropriateness': 0.3, 'closeness_fit': 0.05, 'risk_balance': 0.05}
    else:
        weights = {'recipient_match': 0.3, 'giver_expression': 0.1, 'appropriateness': 0.5, 'closeness_fit': 0.05, 'risk_balance': 0.05}

    return weighted_sum(scores, weights)
```

---

### Explanation Template (Based on Research)

```
We recommend [PRODUCT] because:

1. **For [Receiver]:** (preference match - Paper 1)
   - Matches their interests in [X, Y]
   - Aligns with their values: [sustainability, etc.]

2. **For You:** (giver expression - Paper 4)
   - Reflects your shared interest in [Z]
   - Expresses your thoughtfulness

3. **For This Occasion:** (context appropriateness - Papers 1, 5, 6)
   - Appropriate for [birthday/wedding/etc.]
   - Fits [formal/casual] context
   - Within expected range for [relationship type]

4. **Why We're Confident:** (trust building - Paper 2, 8)
   - Based on [data sources]
   - [X]% match to similar successful gifts
   - Allows for personal customization
```

---

## Next Steps for Research Integration

- [ ] Summarize each paper in detail (separate files)
- [ ] Extract specific design principles per paper
- [ ] Map principles to agent implementations
- [ ] Create research-based test scenarios
- [ ] Build evaluation framework from Paper 1
- [ ] Implement explanation templates from Papers 2, 8

---

## Citation Format

When referencing research in code/docs:

```python
# Based on Fu et al. (2024): Social closeness moderates AI adoption
if relationship.closeness >= 8:
    recommendation.confidence_modifier = 0.8  # User prefers personal judgment
```

---

*For full papers, see: `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`*

*Last updated: 2026-02-15*
