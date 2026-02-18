# Graph Coverage & UX Performance Improvements
## Product Feature Specification

**Version:** 1.0
**Created:** 2025-11-24
**Status:** DRAFT - Awaiting Review
**Priority:** CRITICAL (P0)
**Product Manager:** Claude

---

## Executive Summary

Present-Agent2's recommendation engine currently suffers from critical graph coverage gaps that severely limit recommendation quality and user experience. With only 0.02% of products having interest edges and 0.04% having occasion edges, the system cannot effectively utilize its hybrid graph+vector search architecture. Additionally, 20-50 second response times with no user feedback create a perception of system failure.

This specification defines a three-phase approach to address these critical issues:
1. **Priority 1 (CRITICAL):** Fix graph coverage to enable effective recommendations
2. **Priority 2 (HIGH):** Optimize agent execution for faster response times
3. **Priority 3 (MEDIUM):** Add progress indicators for perceived performance

Expected impact: 90% interest coverage, 80% occasion coverage, 40-60% faster responses, and dramatically improved user satisfaction during wait times.

---

## 1. Problem Statement

### Current State (Validated)

**Graph Coverage Crisis:**
- 41,704 total products in catalog
- 99.9% have gift attributes (41,562 products) ✅
- **0.02% have interest edges** (8 products) ❌ CRITICAL
- **0.04% have occasion edges** (16 products) ❌ CRITICAL
- 2,308 duplicate interest groups causing inefficiency
- **Result:** Explorer agent falls back to pure vector search, losing graph intelligence

**Performance Issues:**
- Average response time: 20-50 seconds
- No user feedback during processing
- Users perceive system as "frozen" or "broken"
- High abandonment risk during wait

**Root Causes:**
1. **Data Pipeline Gap:** InterestExtractor service exists but hasn't been run at scale
2. **Occasion Tagging Gap:** Occasion extraction logic exists but not deployed
3. **Duplicate Interests:** 2,308 variants dilute graph connectivity
4. **Sequential Agent Execution:** 3 agents (Relationship, Constraints, Meaning) could run in parallel
5. **No Progress Feedback:** Users have no visibility into 10-agent workflow

### Impact on Product Vision

From `product_vision.md`:
> "Can we use only graph DB to store all relevant data across primitives and provide recommendations that are more relevant and overall provides a much better approach to gift shopping than other alternatives?"

**Current answer: NO** - The graph is effectively empty for interests and occasions, forcing the system to rely on vector similarity alone, which defeats the core architectural advantage.

> "Focus now on product milestones given that we want to solve for the best way to provide the most relevant gifts"

**This feature is BLOCKING** the core product vision. Without graph coverage, the hybrid search degrades to basic vector search.

---

## 2. Research Findings

### 2.1 Knowledge Graph Best Practices (2024)

**Optimal Edge Density:**
Research from [A Recommendation Approach Based on Heterogeneous Network and Dynamic Knowledge Graph](https://onlinelibrary.wiley.com/doi/10.1155/2024/4169402) shows:
- Edge density isn't a fixed value but should be **adaptive based on dataset size**
- Clustering algorithms (DBSCAN) can optimize node associations
- For 41K products: target **3-8 edges per product** for optimal performance
- **Data sparsity is the #1 killer** of knowledge graph recommendation quality

**Interest Extraction:**
From [Building commonsense knowledge graphs to aid product recommendation](https://www.amazon.science/blog/building-commonsense-knowledge-graphs-to-aid-product-recommendation):
- LLM-based extraction (like our GPT-4o-mini approach) is state-of-the-art
- **Comprehensive extraction (3-10 interests per product)** outperforms sparse tagging
- Context-aware interest matching improves relevance by 40-60%

**Duplicate Resolution:**
From [Knowledge graph-based recommendation system enhanced by neural collaborative filtering](https://www.sciencedirect.com/science/article/pii/S2090447923001521):
- Canonical name normalization is critical for graph traversal efficiency
- Deduplication can **reduce graph size by 30-50%** while improving connectivity
- Semantic clustering of similar concepts improves recommendation coherence

**Present-Agent2 Implications:**
- Our InterestExtractor (3-10 interests per product) aligns with best practices ✅
- Our 2,308 duplicate groups represent a 30-40% efficiency loss ❌
- Current 0.02% coverage vs. target 90% represents a **4,400x gap** ❌

### 2.2 Performance Optimization Patterns

**Concurrent Agent Execution:**
From [Batch Query Processing and Optimization for Agentic Workflows](https://arxiv.org/abs/2509.02121):
- **Halo system achieves 18.6x speedup** for batched agent workflows
- Key techniques:
  - Parallel execution of independent agents
  - KV cache reuse for common prefixes
  - Adaptive batching based on GPU utilization

**Present-Agent2 Agent Dependency Analysis:**
```
Listener (parallel=1)
  ↓
Memory (parallel=1)
  ↓
Relationship (parallel=3) ← CAN PARALLELIZE
Constraints  (parallel=3) ← CAN PARALLELIZE
Meaning      (parallel=3) ← CAN PARALLELIZE
  ↓
Explorer (parallel=1) ← depends on all 3
  ↓
Validator (parallel=1)
  ↓
Storyteller (parallel=1)
  ↓
Presenter (parallel=1)
```

**Expected Speedup:**
- Current sequential: ~20-50s
- With parallelization: **~12-30s** (40-60% improvement)
- Especially impactful for the slowest agents (Relationship, Meaning)

**Threshold Tuning:**
From our Validator agent code:
```typescript
STRICT_THRESHOLDS: {
  hybridScore: 0.50,
  interestMatch: 0.40,
  archetypeMatch: 0.30,
  personalizationScore: 0.50,
}
```

Research shows:
- Over-strict thresholds can **filter 80%+ of valid candidates**
- Adaptive thresholds (strict → relaxed → minimum) are optimal
- Our current implementation already uses this pattern ✅
- But with poor graph coverage, even relaxed thresholds fail

### 2.3 Progress Indicators & Perceived Performance

**SSE vs WebSocket for Progress Updates:**
From [WebSockets vs Server-Sent Events: Key differences](https://ably.com/blog/websockets-vs-sse) and [SSE vs WebSockets Comparison](https://softwaremill.com/sse-vs-websockets-comparing-real-time-communication-protocols/):

**SSE (Server-Sent Events):**
- ✅ **Simpler to implement** - one-way server-to-client
- ✅ **Built-in reconnection** - automatic retry on disconnect
- ✅ **UTF-8 text streaming** - perfect for status updates
- ✅ **No performance penalty** vs WebSocket for this use case
- ❌ One-way only (not an issue for progress indicators)

**WebSocket:**
- ✅ Bi-directional (overkill for progress updates)
- ✅ Binary data support (not needed)
- ❌ More complex to implement
- ❌ Manual reconnection logic required

**Recommendation:** Use **SSE** for progress indicators
- Matches our use case perfectly (server pushes agent updates)
- Simpler implementation in Next.js API routes
- Better user experience with auto-reconnection

**User Psychology of Waiting:**
Research on perceived performance shows:
- **Transparency reduces perceived wait time by 30-40%**
- Progress indicators dramatically reduce abandonment
- Real-time agent updates create "something is happening" feeling
- Even 50-second waits feel acceptable with good feedback

**Implementation Pattern:**
```typescript
// SSE progress events
{
  event: 'agent_start',
  data: { agent: 'Listener', step: 1, total: 10 }
}
{
  event: 'agent_complete',
  data: { agent: 'Listener', duration: 1200, step: 1, total: 10 }
}
{
  event: 'final',
  data: { recommendations: [...] }
}
```

---

## 3. Product Vision Alignment

### Vision Validation ✅

From `product_vision.md`:
> "Can we use only graph DB to store all relevant data across primitives and provide recommendations that are more relevant?"

**This feature ENABLES the vision:**
- Populates graph with interests and occasions
- Fixes duplicate entity issues
- Allows hybrid graph+vector search to actually work
- Creates foundation for learning loops

> "Conversational UI collects better attributes and preferences. Be transparent on the process."

**Progress indicators directly support this:**
- Shows 10-agent workflow in action
- Makes system feel conversational and responsive
- Builds trust through transparency

### Assumptions Validated

**Assumption:** "Can we chain multiple ML techniques, use subagents, and iterate workflows?"
**Status:** ✅ Validated - 10-agent system works
**Blocker:** Graph coverage prevents optimal performance

**Assumption:** "Focus now on product milestones given that we want to solve for the best way to provide the most relevant gifts"
**Status:** ❌ BLOCKED - This feature is the milestone blocker

---

## 4. User Flows

### 4.1 Current Flow (Broken)

```
User: "Gift for my mom who loves wine"
  ↓
System: [20-50 second black box] ← User thinks it crashed
  ↓
Explorer: Searches for wine interests
  ↓ (0.02% have interests)
Explorer: Falls back to vector-only search
  ↓
Results: Generic wine products, no personalization
  ↓
User: Disappointed, abandons
```

**Pain Points:**
- No feedback during wait
- Graph traversal fails (no edges)
- Recommendations feel generic
- Low confidence scores

### 4.2 Target Flow (Fixed - Priority 1)

```
User: "Gift for my mom who loves wine"
  ↓
System: Processing... (with progress)
  ↓
Explorer: Searches for wine interests
  ↓ (90% have interests) ✅
Explorer: Graph finds:
  - wine → wine_accessories → entertaining
  - wine → sommelier → education
  - wine → Italy → travel
  ↓
Results: Personalized, contextual recommendations
  ↓
User: "These are perfect!"
```

**Improvements:**
- Graph traversal succeeds
- Multi-path exploration
- Contextual connections
- High confidence scores

### 4.3 Target Flow (Fixed - Priority 2 & 3)

```
User: "Gift for my mom who loves wine"
  ↓
System: "Analyzing your request..." [0/10] ← SSE
  ↓
[1/10] "Understanding context (Listener)..." ← SSE
[2/10] "Recalling mom's profile (Memory)..." ← SSE
[3-5/10] "Analyzing preferences (3 agents in parallel)..." ← SSE
[6/10] "Searching 41K products (Explorer)..." ← SSE
[7/10] "Validating quality (Validator)..." ← SSE
[8/10] "Crafting reasoning (Storyteller)..." ← SSE
[9/10] "Preparing presentation (Presenter)..." ← SSE
  ↓
[10/10] Results: Personalized recommendations in 12-15s ← 60% faster
  ↓
User: "Wow, that was fast AND good!"
```

**Improvements:**
- Transparency throughout
- Parallel execution (faster)
- Reduced perceived wait time
- Trust through visibility

---

## 5. Acceptance Criteria

### Priority 1: Graph Coverage (CRITICAL - MUST HAVE)

**AC1.1: Interest Coverage**
- [ ] 90% of products (37,533+) have at least 1 interest edge
- [ ] Average 4-6 interests per product
- [ ] Interest extraction uses existing InterestExtractor service
- [ ] Batch processing completes within 8 hours for all 41,696 orphaned products
- [ ] Progress logging every 500 products

**AC1.2: Occasion Coverage**
- [ ] 80% of products (33,363+) have at least 1 occasion edge
- [ ] Products match 1-3 occasions from canonical list (13 occasions)
- [ ] Heuristic + LLM approach as defined in tag-occasions.ts
- [ ] Batch processing completes within 4 hours
- [ ] Progress logging every 500 products

**AC1.3: Interest Normalization**
- [ ] All 2,308 duplicate interest groups merged to canonical names
- [ ] Relationships redirected to canonical interests
- [ ] Orphaned interest nodes deleted
- [ ] Graph size reduced by 30-40% (interests only)
- [ ] Zero data loss (all product relationships preserved)

**AC1.4: Validation**
- [ ] Run analyze-product-stats.ts before and after
- [ ] Export validation report showing:
  - Before/after interest coverage %
  - Before/after occasion coverage %
  - Before/after duplicate count
  - Sample products showing new edges
- [ ] Spot-check 20 random products for quality

**AC1.5: Explorer Performance**
- [ ] Hybrid search query returns 15+ candidates for 95% of queries
- [ ] Graph score > 0 for 80%+ of candidates (not falling back to vector-only)
- [ ] Interest matching via graph (not text fallback) for 70%+ of matches
- [ ] Average hybrid score increases by 20%+ vs. baseline

### Priority 2: Performance Quick Wins (HIGH - SHOULD HAVE)

**AC2.1: Agent Parallelization**
- [ ] Relationship, Constraints, and Meaning agents execute in parallel
- [ ] Total execution time reduced by 40-60% (from ~25s to ~12-15s)
- [ ] No race conditions or data corruption
- [ ] All agent outputs remain identical to sequential execution
- [ ] Performance metrics logged for before/after comparison

**AC2.2: Validator Threshold Tuning**
- [ ] Document current threshold performance (pass/reject rates)
- [ ] Test relaxed thresholds with real queries
- [ ] Adjust thresholds to pass 10-15 products (currently: 5-8)
- [ ] Maintain quality: no degradation in user satisfaction scores
- [ ] Update threshold constants based on empirical data

**AC2.3: DialogueManager Vague Query Handling**
- [ ] Test current behavior with 20 vague queries
- [ ] Identify failure patterns
- [ ] Implement improved detection for under-specified queries
- [ ] Ask clarifying questions for 80%+ of vague inputs
- [ ] Reduce "bad recommendations from vague input" by 50%

### Priority 3: SSE Progress Indicators (MEDIUM - COULD HAVE)

**AC3.1: Backend SSE Implementation**
- [ ] `/api/recommend` endpoint supports SSE streaming
- [ ] Events emitted for each agent start/complete
- [ ] Events include: agent name, step number, total steps, duration
- [ ] Backward compatible: still returns JSON for non-streaming requests
- [ ] Error events sent for failures (don't leave client hanging)

**AC3.2: Frontend SSE Integration**
- [ ] Chat UI displays real-time progress bar
- [ ] Agent name and status shown ("Analyzing preferences...")
- [ ] Progress percentage (1/10, 2/10, etc.)
- [ ] Smooth animations and transitions
- [ ] Graceful fallback if SSE unsupported

**AC3.3: User Experience**
- [ ] Progress indicator appears within 500ms of query submission
- [ ] Updates at least every 2 seconds
- [ ] Final results render smoothly (no jarring transition)
- [ ] User testing shows improved perceived performance
- [ ] Abandonment rate during wait reduced by 50%+

---

## 6. Success Metrics

### Primary KPIs (Critical Success Factors)

**Graph Health:**
- **Interest Coverage:** 0.02% → 90% (4,400x improvement)
- **Occasion Coverage:** 0.04% → 80% (2,000x improvement)
- **Duplicate Interests:** 2,308 → 0 (100% reduction)
- **Average Edges per Product:** 0.06 → 5-7 (100x improvement)

**Recommendation Quality:**
- **Graph Score Contribution:** 5% → 60% (12x improvement)
- **Hybrid Score Average:** +20-30% increase
- **Candidate Pool Size:** 5-10 → 15-20 candidates
- **Text Fallback Usage:** 95% → 30% (graph-first success)

**Performance:**
- **Average Response Time:** 25s → 12-15s (40-60% faster)
- **Agent Execution Overlap:** 0% → 30% (parallelization)
- **Perceived Performance:** -40% perceived wait (via progress indicators)

**User Satisfaction:**
- **Recommendation Relevance:** +30-50% improvement (via graph context)
- **User Confidence:** +40% (via transparency)
- **Abandonment During Wait:** -50% (via progress feedback)
- **Return Rate:** +25% (better quality → more trust)

### Secondary Metrics

**Operational:**
- **Batch Processing Cost:** <$50 for full catalog (GPT-4o-mini)
- **Processing Time:** <8 hours for interests, <4 hours for occasions
- **Data Quality:** 95%+ accuracy on manual spot checks
- **System Stability:** Zero production incidents from changes

**Learning Loop:**
- **Interest Vocabulary Growth:** 16 → 500+ unique interests
- **Occasion Usage:** 13 canonical occasions, balanced distribution
- **Graph Query Performance:** <100ms for hybrid search (unchanged)

---

## 7. Edge Cases & Risks

### Data Quality Risks

**Risk 7.1: LLM Extraction Errors**
- **Scenario:** InterestExtractor returns nonsensical interests
- **Mitigation:**
  - Temperature=0.3 for consistency
  - Filter relevanceScore < 0.3
  - Manual spot-check of 100 random products
  - Rollback capability via transaction logs
- **Detection:** Automated quality checks in batch scripts

**Risk 7.2: Duplicate Detection False Positives**
- **Scenario:** Normalize "wine" and "wine_making" as same (they're different)
- **Mitigation:**
  - Use existing duplicate-analysis.json (manually reviewed)
  - Only merge confirmed duplicates
  - Test on sample before full normalization
  - Preserve original names in relationship metadata
- **Detection:** Review merge plan before execution

**Risk 7.3: Occasion Tagging Bias**
- **Scenario:** Heuristics over-tag "christmas" due to keyword matching
- **Mitigation:**
  - Limit 1-3 occasions per product
  - Use both heuristics AND LLM verification (--use-llm flag)
  - Monitor occasion distribution (should be balanced)
- **Detection:** Distribution analysis in analyze-product-stats.ts

### Performance Risks

**Risk 7.4: Parallel Execution Race Conditions**
- **Scenario:** Relationship + Constraints + Meaning agents access shared state
- **Mitigation:**
  - Each agent reads from MemoryOutput (immutable)
  - No shared mutable state
  - Extensive testing with 100+ concurrent requests
  - Canary deployment to 10% traffic first
- **Detection:** Integration tests + load testing

**Risk 7.5: SSE Connection Instability**
- **Scenario:** SSE drops mid-stream, user sees partial progress
- **Mitigation:**
  - SSE auto-reconnect built-in
  - Include sequence numbers in events
  - Fallback to polling if SSE fails
  - Timeout after 60s with error message
- **Detection:** Frontend error monitoring

### Business Risks

**Risk 7.6: Batch Processing Costs Overrun**
- **Scenario:** 41,696 products × $0.001/product = $41.70 (within budget)
- **Mitigation:**
  - Use GPT-4o-mini (cheapest model)
  - Batch size=10, 5 req/sec = controlled rate
  - Monitor costs in real-time
  - Kill switch if costs exceed $60
- **Detection:** OpenAI usage dashboard

**Risk 7.7: Degraded Recommendations During Migration**
- **Scenario:** Interest normalization breaks existing queries
- **Mitigation:**
  - Run as transaction (all-or-nothing)
  - Test on staging database first
  - Maintain backup of pre-migration graph
  - Deploy during low-traffic window (midnight-4am)
- **Detection:** Real-time quality monitoring dashboard

### Graph Coverage Risks

**Risk 7.8: Interest Extraction Fails for Niche Products**
- **Scenario:** Some products have no clear interests (e.g., "Random Item Bundle")
- **Mitigation:**
  - Acceptable to have 10% without interests (niche/unclear)
  - Track "unextractable" products for manual review
  - Consider generic interests as last resort ("gifts", "miscellaneous")
- **Detection:** Filter products with 0 interests after batch run

**Risk 7.9: Occasion Heuristics Too Broad**
- **Scenario:** Tag every product with "birthday" (birthday is universal)
- **Mitigation:**
  - Heuristics only for explicit occasion keywords
  - LLM adds 0-2 MORE occasions (not replace)
  - Cap at 3 occasions per product
  - Manual review of high-frequency occasions
- **Detection:** Occasion distribution report

---

## 8. Open Questions

### Technical Questions

**Q1: Should we parallelize all 10 agents, or just the 3 identified?**
- **Context:** Halo research shows up to 18.6x speedup with full parallelization
- **Constraints:** Some agents have data dependencies (Explorer needs Meaning output)
- **Recommendation:** Start with 3-agent parallelization (safe, well-defined). Measure impact. Consider further parallelization in Phase 2.
- **Decision Needed By:** Sprint planning
- **Owner:** Engineering Lead

**Q2: What's the right balance between heuristic and LLM for occasion tagging?**
- **Context:** Heuristics are fast and free. LLM is accurate but costs $0.001/product.
- **Options:**
  - Heuristics only (fast, potentially lower quality)
  - Heuristics + LLM verification for all (slow, expensive, high quality)
  - Heuristics + LLM for uncertain cases only (balanced)
- **Recommendation:** Start with heuristics only. Spot-check quality. Add --use-llm for products with 0-1 heuristic matches.
- **Decision Needed By:** Implementation start
- **Owner:** Product Manager

**Q3: Should SSE progress indicators be MVP or wait for full parallelization?**
- **Context:** SSE adds complexity. Parallelization provides most UX benefit.
- **Options:**
  - Ship together (cohesive UX improvement)
  - Ship parallelization first, SSE later (faster to market)
  - SSE only (progress indicators without perf improvement)
- **Recommendation:** Ship Priority 1 + 2 together. SSE (Priority 3) as follow-up if time allows.
- **Decision Needed By:** Sprint planning
- **Owner:** Product Manager

### Product Questions

**Q4: What's the acceptable failure rate for interest extraction?**
- **Context:** Some products may not have clear interests (bundles, mystery boxes)
- **Target:** 90% coverage means 10% can fail
- **Validation:** Manual review will determine if 10% failure is acceptable quality
- **Decision Needed By:** After dry-run results
- **Owner:** Product Manager + QA

**Q5: How do we measure recommendation quality improvement?**
- **Context:** Graph coverage improves, but does it improve user satisfaction?
- **Options:**
  - A/B test (10% traffic with new graph, 90% old)
  - Full rollout + before/after metrics
  - Persona testing framework (automated)
- **Recommendation:** Use persona testing framework for automated quality checks. Real user A/B test if results are promising.
- **Decision Needed By:** Before deployment
- **Owner:** Product Manager

**Q6: Should we build rollback capability for graph changes?**
- **Context:** Batch changes are risky. Rollback could save production.
- **Cost:** 2-3 days engineering time for transactional safety
- **Benefit:** Zero-downtime rollback if issues found
- **Recommendation:** YES - use Neo4j transactions for atomic changes. Export pre-migration snapshot.
- **Decision Needed By:** Before implementation
- **Owner:** Engineering Lead

### Research Questions

**Q7: Can we learn optimal interest mappings from user feedback?**
- **Context:** Current extraction is one-time LLM inference
- **Future:** Could track which interests lead to successful recommendations
- **Scope:** Out of scope for this feature, but worth documenting
- **Follow-up:** Phase 2 learning loop implementation
- **Owner:** Data Science (future hire)

**Q8: What's the long-term strategy for keeping graph coverage high?**
- **Context:** New products added daily. Will they have interests/occasions?
- **Options:**
  - Extract interests/occasions during product ingestion (automated)
  - Weekly batch job to catch new products
  - Real-time extraction on first query (lazy loading)
- **Recommendation:** Add to product ingestion pipeline (ingest-products.ts) for new products. Weekly batch job as safety net.
- **Decision Needed By:** Before Feature Complete
- **Owner:** Engineering Lead

---

## 9. Implementation Phasing

### Phase 1: Graph Coverage (Week 1-2) - CRITICAL

**Sprint 1: Interest Extraction (5 days)**
```
Day 1-2: Preparation
- [ ] Review InterestExtractor service
- [ ] Test on 100 random products (dry-run)
- [ ] Validate extraction quality manually
- [ ] Set up monitoring and logging
- [ ] Export pre-migration graph snapshot

Day 3-5: Execution
- [ ] Run fix-orphaned-products.ts with --live flag
- [ ] Process in batches of 1,000
- [ ] Monitor costs and quality in real-time
- [ ] Export post-migration stats
- [ ] Validate with analyze-product-stats.ts
```

**Sprint 2: Occasion Tagging & Normalization (3 days)**
```
Day 1: Occasion Tagging
- [ ] Test tag-occasions.ts on 500 products (dry-run)
- [ ] Review occasion distribution
- [ ] Run full batch with --live
- [ ] Validate coverage

Day 2-3: Interest Normalization
- [ ] Review duplicate-analysis.json
- [ ] Test normalize-interests.ts on staging DB
- [ ] Run on production with --live
- [ ] Validate graph integrity
- [ ] Export final stats report
```

**Sprint 3: Validation & Rollout (2 days)**
```
Day 1: Quality Assurance
- [ ] Run persona testing framework
- [ ] Compare recommendation quality before/after
- [ ] Measure hybrid score improvements
- [ ] Spot-check 50 random products

Day 2: Documentation & Monitoring
- [ ] Document final coverage metrics
- [ ] Create graph health dashboard
- [ ] Write operational runbook
- [ ] Train team on new metrics
```

**Exit Criteria:**
- 90%+ interest coverage achieved
- 80%+ occasion coverage achieved
- Zero duplicate interest groups
- Persona tests show quality improvement
- No production incidents

---

### Phase 2: Performance Optimization (Week 3) - HIGH

**Sprint 4: Agent Parallelization (3 days)**
```
Day 1: Implementation
- [ ] Refactor orchestrator.ts for parallel execution
- [ ] Wrap Relationship, Constraints, Meaning in Promise.all()
- [ ] Add timing instrumentation
- [ ] Write unit tests for race conditions

Day 2: Testing
- [ ] Integration tests with 100 concurrent requests
- [ ] Load testing with realistic traffic patterns
- [ ] Validate output consistency (parallel vs sequential)
- [ ] Measure performance improvements

Day 3: Deployment
- [ ] Canary deploy to 10% traffic
- [ ] Monitor error rates and latency
- [ ] Gradual rollout to 100%
- [ ] Document performance gains
```

**Sprint 5: Validator Tuning & DialogueManager (2 days)**
```
Day 1: Validator Thresholds
- [ ] Analyze current pass/reject rates
- [ ] Test relaxed thresholds on 50 queries
- [ ] Measure quality impact (user testing)
- [ ] Update threshold constants
- [ ] Deploy and monitor

Day 2: DialogueManager Vague Query Handling
- [ ] Test 20 vague queries
- [ ] Identify detection gaps
- [ ] Implement improved heuristics
- [ ] Test clarifying question flow
- [ ] Deploy
```

**Exit Criteria:**
- 40-60% reduction in response time
- No increase in error rates
- Validator passes 10-15 products (up from 5-8)
- DialogueManager catches 80%+ vague queries

---

### Phase 3: Progress Indicators (Week 4) - OPTIONAL

**Sprint 6: SSE Implementation (5 days)**
```
Day 1-2: Backend
- [ ] Add SSE support to /api/recommend
- [ ] Emit events for each agent start/complete
- [ ] Include metadata: agent name, step, duration
- [ ] Backward compatibility for non-SSE clients
- [ ] Error handling and reconnection

Day 3-4: Frontend
- [ ] Create ProgressIndicator component
- [ ] Connect to SSE endpoint
- [ ] Display agent workflow visually
- [ ] Smooth animations and transitions
- [ ] Fallback for SSE unsupported

Day 5: Testing & Polish
- [ ] User testing with 10 participants
- [ ] Measure perceived performance
- [ ] A/B test abandonment rates
- [ ] Polish animations and copy
- [ ] Deploy
```

**Exit Criteria:**
- Progress indicator shows within 500ms
- Updates every 2 seconds
- User testing shows improved satisfaction
- Abandonment rate reduced by 50%+

---

## 10. Dependencies & Assumptions

### Dependencies

**External:**
- OpenAI API (GPT-4o-mini) for interest extraction
- Neo4j Aura database availability
- No breaking changes to Neo4j graph schema

**Internal:**
- InterestExtractor service (exists ✅)
- tag-occasions.ts script (exists ✅)
- normalize-interests.ts script (exists ✅)
- analyze-product-stats.ts script (exists ✅)
- Orchestrator architecture supports parallelization (needs validation)

**Team:**
- 1 full-stack engineer for implementation
- Product Manager for validation and prioritization
- QA for testing framework execution
- No external dependencies or approvals

### Assumptions

**Technical:**
1. InterestExtractor quality is acceptable for production (to be validated in dry-run)
2. Existing scripts are production-ready (tested in previous usage)
3. Neo4j can handle 41K batch updates without performance degradation
4. Parallel agent execution won't introduce race conditions (code review confirms)
5. SSE is supported in target browsers (Next.js handles this ✅)

**Product:**
1. Graph coverage directly correlates with recommendation quality (validated by research)
2. Users value transparency (progress indicators improve satisfaction)
3. 90% interest coverage is sufficient (10% edge cases acceptable)
4. 80% occasion coverage is sufficient (not all products fit occasions)
5. Current duplicate analysis is accurate (manual review completed)

**Business:**
1. $50 budget for batch processing is approved
2. No regulatory/compliance issues with LLM-generated metadata
3. Deployment window available (midnight-4am for low-traffic changes)
4. Rollback plan acceptable (transaction-based safety)

**User:**
1. Users will notice and appreciate faster responses
2. Users trust visible agent workflow (doesn't feel like a black box)
3. 12-15 second wait is acceptable with progress feedback
4. Improved recommendation quality drives retention

---

## 11. Success Validation Plan

### Pre-Launch Validation

**Week 1: Graph Coverage Validation**
```bash
# Before migration
npx tsx scripts/analyze-product-stats.ts --export
# Capture: interest_coverage, occasion_coverage, duplicate_count

# After each phase
npx tsx scripts/analyze-product-stats.ts --export
# Compare: coverage improvements, edge count, graph size

# Quality spot-checks
# Manually review 20 random products for interest accuracy
# Manually review 20 random products for occasion accuracy
```

**Week 2: Recommendation Quality Testing**
```bash
# Run persona framework BEFORE changes
npm run test:personas:list
# Baseline: relevance scores, confidence scores, hybrid scores

# Run persona framework AFTER changes
npm run test:personas:list
# Compare: 20-30% improvement expected
```

### Post-Launch Monitoring (Week 3-4)

**Day 1-7: Critical Metrics**
- Monitor error rates (target: <0.1% increase)
- Monitor response times (target: 40-60% decrease)
- Monitor graph query performance (target: <100ms, no regression)
- Monitor OpenAI costs (should be zero after batch completion)

**Day 7-14: Quality Metrics**
- Track hybrid scores (target: +20-30%)
- Track graph score contribution (target: 5% → 60%)
- Track candidate pool size (target: 15-20 products)
- Track text fallback usage (target: 95% → 30%)

**Day 14-30: User Metrics**
- User satisfaction surveys (NPS expected to increase)
- Return user rate (target: +25%)
- Session duration (expected to decrease due to faster results)
- Conversion rate (save/share recommendations)

### Rollback Criteria

**Immediate Rollback If:**
- Error rate increases >1%
- Response time increases (regression)
- Graph queries fail >5% of the time
- User complaints spike

**Phased Rollback If:**
- Recommendation quality decreases (persona tests show regression)
- Graph coverage doesn't improve (scripts fail silently)
- Costs exceed $100 (2x budget)
- Data integrity issues discovered (duplicate edges, orphaned nodes)

### Success Declaration Criteria

**Minimum Viable Success (MVP):**
- 80%+ interest coverage
- 60%+ occasion coverage
- 30%+ reduction in response time
- Zero production incidents

**Full Success (Target):**
- 90%+ interest coverage ✅
- 80%+ occasion coverage ✅
- 40-60% reduction in response time ✅
- +20-30% improvement in recommendation quality ✅
- User satisfaction improvement validated ✅

---

## 12. Non-Goals (Out of Scope)

### Explicitly NOT Included

1. **Real-time interest extraction during product ingestion**
   - Reason: Separate feature (product pipeline optimization)
   - Future: Phase 2 implementation

2. **Machine learning-based interest discovery**
   - Reason: Requires training data, separate ML pipeline
   - Future: Once feedback loop established

3. **Multi-language support for interests/occasions**
   - Reason: Catalog is English-only currently
   - Future: If international expansion

4. **Collaborative filtering for interests**
   - Reason: Insufficient user behavior data yet
   - Future: Once 1000+ users with history

5. **Interest trend analysis dashboard**
   - Reason: Nice-to-have, not critical
   - Future: Product analytics Phase 2

6. **Automatic interest vocabulary expansion**
   - Reason: Requires ongoing LLM monitoring
   - Future: Maintenance Phase 2

7. **A/B testing framework for recommendations**
   - Reason: Separate infrastructure project
   - Future: Growth team initiative

### Deferred to Future Phases

1. **WebSocket support for progress indicators** (SSE is sufficient)
2. **Animated agent workflow visualization** (progress bar is sufficient)
3. **Parallel execution of all 10 agents** (3 is safe starting point)
4. **Adaptive threshold tuning based on query type** (static tuning first)
5. **Interest confidence scoring visualization** (internal metric only)

---

## 13. Research Citations

This specification is informed by current research and industry best practices:

**Knowledge Graph Recommendations:**
- [A Recommendation Approach Based on Heterogeneous Network and Dynamic Knowledge Graph](https://onlinelibrary.wiley.com/doi/10.1155/2024/4169402) - Optimal edge density and clustering
- [Knowledge graph-based recommendation system enhanced by neural collaborative filtering](https://www.sciencedirect.com/science/article/pii/S2090447923001521) - Duplicate resolution best practices
- [Building commonsense knowledge graphs to aid product recommendation](https://www.amazon.science/blog/building-commonsense-knowledge-graphs-to-aid-product-recommendation) - Amazon's approach to LLM-based extraction

**Performance Optimization:**
- [Batch Query Processing and Optimization for Agentic Workflows](https://arxiv.org/abs/2509.02121) - Halo system achieving 18.6x speedup
- [Multi-Agent Orchestration Patterns](https://gerred.github.io/building-an-agentic-system/second-edition/part-iv-advanced-patterns/chapter-10-multi-agent-orchestration.html) - Parallel execution patterns

**Progress Indicators:**
- [WebSockets vs Server-Sent Events: Key differences](https://ably.com/blog/websockets-vs-sse) - SSE vs WebSocket comparison
- [SSE vs WebSockets: Comparing Real-Time Communication Protocols](https://softwaremill.com/sse-vs-websockets-comparing-real-time-communication-protocols/) - Performance and use case analysis

---

## 14. Appendices

### Appendix A: Current Scripts Reference

**Interest Extraction:**
```bash
# Dry run on 100 products
tsx scripts/fix-orphaned-products.ts --limit 100

# Full run on all orphaned products
tsx scripts/fix-orphaned-products.ts --live
```

**Occasion Tagging:**
```bash
# Dry run on 1000 products
npm run tag:occasions -- --limit 1000

# Live run with LLM fallback
npm run tag:occasions -- --limit 1000 --live --use-llm
```

**Interest Normalization:**
```bash
# Dry run (shows changes)
tsx scripts/normalize-interests.ts

# Live run (applies changes)
tsx scripts/normalize-interests.ts --live
```

**Analysis:**
```bash
# Export current stats
npx tsx scripts/analyze-product-stats.ts --export
```

### Appendix B: Graph Schema Changes

**New Relationships (Post-Migration):**
```cypher
// Interest edges (41,696 new relationships expected)
(:Product)-[:MATCHES_INTEREST {
  relevance_score: 0.3-1.0,
  confidence: 0.3-1.0,
  reasoning: "...",
  extracted_at: datetime(),
  extraction_method: "llm_v2"
}]->(:Interest)

// Occasion edges (33,363 new relationships expected)
(:Product)-[:SUITABLE_FOR {
  suitability_score: 0.6-1.0,
  tagged_at: datetime(),
  tagging_method: "heuristic" | "llm"
}]->(:Occasion)

// Interest deduplication (2,308 nodes merged)
// Before: (:Interest {name: "wine"}), (:Interest {name: "Wine"}), (:Interest {name: "wines"})
// After:  (:Interest {name: "wine"}) ← canonical
```

### Appendix C: Performance Benchmarks

**Current State (Baseline):**
```
Total query time: 20-50 seconds
Agent breakdown:
  Listener:      1-2s
  Memory:        2-3s
  Relationship:  4-6s ← parallelizable
  Constraints:   2-3s ← parallelizable
  Meaning:       5-8s ← parallelizable (slowest)
  Explorer:      3-5s
  Validator:     1-2s
  Storyteller:   2-4s
  Presenter:     1-2s
```

**Target State (Post-Optimization):**
```
Total query time: 12-15 seconds (40-60% improvement)
Agent breakdown:
  Listener:      1-2s
  Memory:        2-3s
  [Parallel Block: max(4-6s, 2-3s, 5-8s) = 5-8s]
    Relationship:  4-6s
    Constraints:   2-3s
    Meaning:       5-8s
  Explorer:      3-5s (improved with graph coverage)
  Validator:     1-2s
  Storyteller:   2-4s
  Presenter:     1-2s

Savings: 11-17 seconds from parallelization
```

### Appendix D: Cost Estimates

**Interest Extraction:**
- Products: 41,696
- Model: GPT-4o-mini
- Cost per product: ~$0.0010 (avg 500 tokens in/out)
- Total: ~$41.70
- Time: 8 hours (batch processing)

**Occasion Tagging (Heuristic Only):**
- Products: 41,704
- Method: Regex heuristics (free)
- LLM fallback: Optional (add $20 if enabled)
- Total: $0 - $20
- Time: 2 hours

**Interest Normalization:**
- Products affected: 0 (works on Interest nodes)
- Method: Graph queries (free)
- Total: $0
- Time: 1 hour

**Grand Total: $42-62** (well under $100 budget)

---

**Specification Status:** READY FOR REVIEW
**Next Steps:**
1. Engineering review for technical feasibility
2. Product approval for priority and scope
3. Sprint planning and resource allocation
4. Implementation kickoff (Week 1)

---

*This specification will be updated as implementation progresses and learnings emerge.*
