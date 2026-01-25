# GitHub Issues for v2.3.0 - Graph Coverage & UX Performance

**Created:** 2025-11-24
**Milestone:** v2.3.0 - Graph Coverage & Performance
**Total Issues:** 12 (1 Epic + 11 Implementation Issues)

---

## Table of Contents

1. [Epic Issue](#epic-issue)
2. [Priority 1: Graph Coverage (Critical)](#priority-1-graph-coverage-critical)
   - [Issue 1: Extract Interests for Orphaned Products](#issue-1-extract-interests-for-orphaned-products)
   - [Issue 2: Tag Occasions for Products](#issue-2-tag-occasions-for-products)
   - [Issue 3: Normalize Duplicate Interests](#issue-3-normalize-duplicate-interests)
   - [Issue 4: Validate Graph Coverage Metrics](#issue-4-validate-graph-coverage-metrics)
3. [Priority 2: Performance Quick Wins (High)](#priority-2-performance-quick-wins-high)
   - [Issue 5: Parallelize Agent Execution](#issue-5-parallelize-agent-execution)
   - [Issue 6: Tune Validator Thresholds](#issue-6-tune-validator-thresholds)
   - [Issue 7: Improve DialogueManager Vague Query Handling](#issue-7-improve-dialoguemanager-vague-query-handling)
4. [Priority 3: SSE Progress Indicators (Optional)](#priority-3-sse-progress-indicators-optional)
   - [Issue 8: Implement Backend SSE Endpoint](#issue-8-implement-backend-sse-endpoint)
   - [Issue 9: Add Orchestrator Event Emitters](#issue-9-add-orchestrator-event-emitters)
   - [Issue 10: Frontend EventSource Integration](#issue-10-frontend-eventsource-integration)
   - [Issue 11: Progress UI Component](#issue-11-progress-ui-component)
5. [Implementation Sequence](#implementation-sequence)
6. [Dependency Graph](#dependency-graph)

---

## Epic Issue

**Title:** [EPIC] Graph Coverage & UX Performance Improvements v2.3.0

**Labels:** `epic`, `priority:critical`, `milestone:v2.3.0`

### Description

Present-Agent2's recommendation engine suffers from critical graph coverage gaps that severely limit recommendation quality. With only 0.02% of products having interest edges and 0.04% having occasion edges, the hybrid graph+vector search architecture cannot function effectively. Additionally, 20-50 second response times with no user feedback create a perception of system failure.

This epic tracks the complete implementation of a three-phase approach to address these critical issues.

### Problem Statement

**Graph Coverage Crisis:**
- 41,704 total products in catalog
- **0.02% have interest edges** (8 products) - CRITICAL
- **0.04% have occasion edges** (16 products) - CRITICAL
- 2,308 duplicate interest groups causing inefficiency
- Result: Explorer agent falls back to pure vector search, losing graph intelligence

**Performance Issues:**
- Average response time: 20-50 seconds
- No user feedback during processing
- Users perceive system as "frozen" or "broken"
- High abandonment risk during wait

### Solution Approach

**Phase 1 (Week 1-2): Graph Coverage - CRITICAL**
- Extract interests for 41,696 orphaned products
- Tag occasions for all products
- Normalize duplicate interests
- Validate graph coverage improvements

**Phase 2 (Week 3): Performance Optimization - HIGH**
- Parallelize 3 independent agents (Relationship, Constraints, Meaning)
- Tune Validator thresholds for better candidate pool
- Improve DialogueManager vague query detection

**Phase 3 (Week 4): Progress Indicators - OPTIONAL**
- Implement SSE streaming for backend
- Add orchestrator event emissions
- Create frontend progress UI
- Improve perceived performance

### Success Metrics

**Graph Health:**
- Interest Coverage: 0.02% → 90% (4,400x improvement)
- Occasion Coverage: 0.04% → 80% (2,000x improvement)
- Duplicate Interests: 2,308 → 0 (100% reduction)

**Performance:**
- Response Time: 25s → 12-15s (40-60% faster)
- Perceived Wait: -40% (via progress indicators)

**Recommendation Quality:**
- Graph Score Contribution: 5% → 60%
- Hybrid Score Average: +20-30% increase
- Candidate Pool Size: 5-10 → 15-20 products

### Sub-Issues

**Priority 1 (CRITICAL):**
- #[1] Extract interests for 41,696 orphaned products
- #[2] Tag occasions for products
- #[3] Normalize duplicate interests
- #[4] Validate graph coverage metrics

**Priority 2 (HIGH):**
- #[5] Parallelize agent execution
- #[6] Tune Validator thresholds
- #[7] Improve DialogueManager vague query handling

**Priority 3 (OPTIONAL):**
- #[8] Implement backend SSE endpoint
- #[9] Add orchestrator event emitters
- #[10] Frontend EventSource integration
- #[11] Progress UI component

### Estimated Effort

**Total:** 3-4 weeks (1 full-stack engineer)
- Phase 1: 8-10 days
- Phase 2: 5 days
- Phase 3: 5 days (optional)

### Dependencies

- OpenAI API (GPT-4o-mini) access
- Neo4j Aura database availability
- $50 budget approved for batch processing

### Exit Criteria

- [ ] 90%+ products have interest edges
- [ ] 80%+ products have occasion edges
- [ ] Zero duplicate interest groups
- [ ] 40-60% reduction in response time
- [ ] All persona tests show quality improvement
- [ ] Zero production incidents

---

## Priority 1: Graph Coverage (Critical)

### Issue 1: Extract Interests for Orphaned Products

**Title:** Extract interests for 41,696 orphaned products using InterestExtractor

**Labels:** `priority:critical`, `type:enhancement`, `area:graph-coverage`, `phase:1`

#### Description

Currently only 8 out of 41,704 products (0.02%) have interest edges in the graph. This critical gap prevents the Explorer agent from utilizing graph-based traversal, forcing fallback to pure vector search and severely limiting recommendation quality.

The InterestExtractor service exists and has been validated, but needs to be run at scale against all orphaned products to populate the graph with comprehensive interest data.

#### Problem Statement

**Current State:**
- 41,696 products have zero interest edges
- Explorer agent cannot use graph traversal
- Recommendations fall back to basic vector similarity
- Hybrid graph+vector architecture is ineffective
- Core product vision is BLOCKED

**Impact:**
- Generic recommendations with low personalization
- Low confidence scores (graph score = 0)
- Poor user satisfaction
- System architecture not delivering on promise

#### Proposed Solution

Run the existing `fix-orphaned-products.ts` script against all 41,696 products without interest edges:

1. **Dry Run (100 products):**
   - Test extraction quality
   - Validate output format
   - Estimate costs and timing
   - Manual spot-check for accuracy

2. **Batch Processing (41,696 products):**
   - Process in batches of 1,000
   - Use GPT-4o-mini for cost efficiency
   - Extract 3-10 interests per product
   - Include relevance scores and reasoning
   - Progress logging every 500 products

3. **Validation:**
   - Run `analyze-product-stats.ts` before/after
   - Target: 90%+ coverage (37,533+ products)
   - Target: 4-6 interests per product average
   - Spot-check 20 random products manually

#### Acceptance Criteria

- [ ] Dry run completed on 100 random products with manual quality review
- [ ] Quality validation shows 95%+ accuracy on extracted interests
- [ ] Cost estimation confirmed to be under $45 for full batch
- [ ] Batch processing script runs without errors for 1,000+ products
- [ ] 90%+ of products (37,533+) have at least 1 interest edge
- [ ] Average of 4-6 interests extracted per product
- [ ] Interest extraction uses existing InterestExtractor service (GPT-4o-mini)
- [ ] Batch processing completes within 8 hours for all 41,696 products
- [ ] Progress logging shows updates every 500 products
- [ ] All interests have relevanceScore >= 0.3
- [ ] Zero data corruption or duplicate edges created
- [ ] Pre/post migration stats exported and documented
- [ ] 20 random products manually spot-checked for quality

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/fix-orphaned-products.ts` - Main batch processing script (already exists)
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/analyze-product-stats.ts` - Validation script (already exists)

**Script execution:**
```bash
# Dry run on 100 products
npx tsx scripts/fix-orphaned-products.ts --limit 100

# Export baseline stats
npx tsx scripts/analyze-product-stats.ts --export > stats-before.json

# Full live run
npx tsx scripts/fix-orphaned-products.ts --live

# Export post-migration stats
npx tsx scripts/analyze-product-stats.ts --export > stats-after.json
```

**Graph schema:**
```cypher
(:Product)-[:MATCHES_INTEREST {
  relevance_score: 0.3-1.0,
  confidence: 0.3-1.0,
  reasoning: "...",
  extracted_at: datetime(),
  extraction_method: "llm_v2"
}]->(:Interest)
```

**Dependencies:**
- Blocked by: None
- Blocks: #4 (Validation depends on this data)

**Cost estimate:**
- 41,696 products × $0.0010 per product = ~$41.70
- Model: GPT-4o-mini
- Budget: $45 approved

**Testing requirements:**
- Manual quality review of 100 dry-run products
- Automated validation using analyze-product-stats.ts
- Spot-check 20 random products post-migration
- Verify no data corruption (relationship counts match)

#### Estimated Effort

**8 story points (3-4 days)**
- Day 1: Dry run + quality validation
- Day 2-3: Full batch processing (8 hours)
- Day 4: Validation and documentation

#### Notes

- Run during low-traffic window (midnight-4am) for safety
- Monitor OpenAI costs in real-time during batch
- Keep backup of pre-migration graph state
- Kill switch if costs exceed $60 or errors > 1%

---

### Issue 2: Tag Occasions for Products

**Title:** Tag occasions for all products using heuristic + LLM approach

**Labels:** `priority:critical`, `type:enhancement`, `area:graph-coverage`, `phase:1`

#### Description

Currently only 16 out of 41,704 products (0.04%) have occasion edges. Occasions are critical for contextual recommendations (e.g., "birthday gift for mom", "anniversary", "christmas"). The `tag-occasions.ts` script exists with a proven heuristic + optional LLM approach that needs to be deployed at scale.

#### Problem Statement

**Current State:**
- 41,688 products have zero occasion tags
- Cannot filter recommendations by occasion
- Queries like "christmas gift" cannot use graph filtering
- Occasion-based personalization is impossible

**Impact:**
- Generic recommendations regardless of context
- Cannot leverage 13 canonical occasions in system
- Missed opportunity for high-relevance matches
- User queries about specific occasions fail

#### Proposed Solution

Run the existing `tag-occasions.ts` script against all products:

1. **Test Run (500 products):**
   - Dry run to validate quality
   - Review occasion distribution
   - Check for bias (e.g., over-tagging "christmas")
   - Decide if --use-llm flag needed

2. **Full Batch Processing:**
   - Process all 41,704 products
   - Use heuristic matching first (free)
   - Optional: Add --use-llm for uncertain cases
   - Tag 1-3 occasions per product
   - Monitor distribution for balance

3. **Validation:**
   - Target: 80%+ coverage (33,363+ products)
   - Ensure balanced occasion distribution
   - Verify no single occasion dominates (>40%)
   - Spot-check 20 random products

#### Acceptance Criteria

- [ ] Dry run completed on 500 random products with quality review
- [ ] Occasion distribution analysis shows balanced tagging (no occasion >40%)
- [ ] Decision made on --use-llm flag based on dry-run quality
- [ ] 80%+ of products (33,363+) have at least 1 occasion edge
- [ ] Products match 1-3 occasions from canonical list (13 occasions)
- [ ] Heuristic + LLM approach implemented per tag-occasions.ts specification
- [ ] Batch processing completes within 4 hours
- [ ] Progress logging shows updates every 500 products
- [ ] No single occasion tagged to >40% of products (avoid bias)
- [ ] Occasion edges include suitability_score (0.6-1.0)
- [ ] Zero data corruption or duplicate edges created
- [ ] Pre/post migration stats exported and documented
- [ ] 20 random products manually spot-checked for occasion accuracy

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/tag-occasions.ts` - Occasion tagging script (already exists)
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/analyze-product-stats.ts` - Validation script

**Script execution:**
```bash
# Dry run on 500 products
npm run tag:occasions -- --limit 500

# Dry run with LLM fallback (if needed)
npm run tag:occasions -- --limit 500 --use-llm

# Full live run (heuristic only)
npm run tag:occasions -- --live

# Full live run with LLM (if quality requires)
npm run tag:occasions -- --limit 10000 --live --use-llm
```

**Canonical occasions list (13 total):**
- Birthday
- Anniversary
- Wedding
- Christmas
- Valentine's Day
- Mother's Day
- Father's Day
- Graduation
- Housewarming
- Thank You
- Congratulations
- Get Well Soon
- Just Because

**Graph schema:**
```cypher
(:Product)-[:SUITABLE_FOR {
  suitability_score: 0.6-1.0,
  tagged_at: datetime(),
  tagging_method: "heuristic" | "llm"
}]->(:Occasion)
```

**Dependencies:**
- Blocked by: None (can run parallel with #1)
- Blocks: #4 (Validation depends on this data)

**Cost estimate:**
- Heuristic only: $0
- With --use-llm: +$20-40 (optional fallback)
- Total budget: $0-40

**Testing requirements:**
- Dry run quality validation on 500 products
- Occasion distribution analysis (avoid bias)
- Spot-check 20 random products for accuracy
- Verify suitability scores are reasonable

#### Estimated Effort

**3 story points (1-2 days)**
- Day 1: Dry run + distribution analysis + decision
- Day 2: Full batch (2-4 hours) + validation

#### Notes

- Can run in parallel with Issue #1 (independent data)
- Heuristic-first approach minimizes costs
- Use --use-llm only if dry-run shows poor quality
- Monitor for occasion bias (some occasions more common)

---

### Issue 3: Normalize Duplicate Interests

**Title:** Merge 2,308 duplicate interest groups to canonical names

**Labels:** `priority:critical`, `type:enhancement`, `area:graph-coverage`, `phase:1`

#### Description

The graph currently has 2,308 duplicate interest groups (e.g., "wine", "Wine", "wines", "WINE") that fragment graph connectivity. Normalizing these to canonical names will reduce graph size by 30-40% while dramatically improving traversal efficiency and recommendation quality.

The `normalize-interests.ts` script exists with a manually-reviewed duplicate mapping ready to execute.

#### Problem Statement

**Current State:**
- 2,308 duplicate interest variants exist
- Graph queries fail to match related interests
- "wine" and "Wine" treated as completely different
- 30-40% graph size inefficiency
- Product connections fragmented across duplicates

**Impact:**
- Graph traversal misses related products
- Search for "wine" doesn't find "Wine" products
- Inefficient graph storage and queries
- Lower recommendation relevance
- Wasted computation on duplicate nodes

#### Proposed Solution

Run the existing `normalize-interests.ts` script with manually-reviewed duplicate mapping:

1. **Review Phase:**
   - Review duplicate-analysis.json (manually curated)
   - Verify canonical name choices are correct
   - Ensure no false positives (e.g., "wine" vs "wine_making")
   - Validate merge plan before execution

2. **Dry Run:**
   - Test on staging database first
   - Show changes without applying
   - Verify relationship preservation
   - Estimate impact on graph size

3. **Live Execution:**
   - Run as Neo4j transaction (atomic)
   - Merge duplicate Interest nodes to canonical
   - Redirect all MATCHES_INTEREST relationships
   - Delete orphaned interest nodes
   - Verify zero data loss

4. **Validation:**
   - Confirm 2,308 duplicates reduced to 0
   - Verify graph size reduced by 30-40%
   - Spot-check 20 products for intact relationships
   - Ensure query performance improves

#### Acceptance Criteria

- [ ] duplicate-analysis.json reviewed and validated (manual review)
- [ ] No false positive merges identified (e.g., "wine" and "wine_making" kept separate)
- [ ] Dry run on staging database shows expected changes
- [ ] Test confirms zero data loss (relationship counts preserved)
- [ ] All 2,308 duplicate interest groups merged to canonical names
- [ ] All MATCHES_INTEREST relationships redirected to canonical interests
- [ ] Orphaned interest nodes deleted (zero dangling nodes)
- [ ] Graph size reduced by 30-40% (interests only)
- [ ] Zero data loss - all product relationships preserved
- [ ] Query performance improves (measure before/after)
- [ ] Run during low-traffic window (midnight-4am)
- [ ] Backup of pre-migration graph state maintained
- [ ] 20 random products spot-checked for relationship integrity
- [ ] analyze-product-stats.ts shows correct counts post-migration

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/normalize-interests.ts` - Normalization script (already exists)
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/duplicate-analysis.json` - Canonical mapping (manually reviewed)

**Script execution:**
```bash
# Dry run (shows changes without applying)
npx tsx scripts/normalize-interests.ts

# Backup graph first (export snapshot)
# Run analyze-product-stats.ts before
npx tsx scripts/analyze-product-stats.ts --export > stats-before-normalize.json

# Live run (applies changes)
npx tsx scripts/normalize-interests.ts --live

# Validate after
npx tsx scripts/analyze-product-stats.ts --export > stats-after-normalize.json
```

**Normalization logic:**
```cypher
// Example: Merge "wine", "Wine", "wines" -> "wine"
MATCH (dup:Interest {name: "Wine"})
MATCH (canonical:Interest {name: "wine"})
MATCH (p:Product)-[r:MATCHES_INTEREST]->(dup)
MERGE (p)-[new:MATCHES_INTEREST]->(canonical)
SET new = properties(r)
DELETE r
WITH dup
MATCH (dup)
WHERE NOT (dup)<-[:MATCHES_INTEREST]-()
DELETE dup
```

**Dependencies:**
- Blocked by: #1 (should merge interests after extraction complete)
- Blocks: #4 (validation includes normalized graph)

**Rollback plan:**
- Neo4j transaction for atomicity
- Pre-migration graph snapshot export
- Can restore from backup if issues found

**Testing requirements:**
- Dry run on staging database first
- Verify relationship counts before/after match
- Test graph query performance before/after
- Spot-check 20 random products for correctness

#### Estimated Effort

**2 story points (1 day)**
- Morning: Review + dry run on staging
- Afternoon: Live execution + validation (1 hour)
- Evening: Monitoring and documentation

#### Notes

- Run AFTER Issue #1 completes (let extraction finish first)
- Use transaction for atomic changes (all-or-nothing)
- Run during low-traffic window for safety
- Expected 30-40% reduction in Interest node count
- Graph queries should be faster after normalization

---

### Issue 4: Validate Graph Coverage Metrics

**Title:** Validate graph coverage improvements and measure recommendation quality impact

**Labels:** `priority:critical`, `type:validation`, `area:graph-coverage`, `phase:1`

#### Description

After completing interest extraction, occasion tagging, and interest normalization, we need comprehensive validation to confirm the graph coverage improvements and measure the impact on recommendation quality.

This issue tracks the validation framework execution, data collection, and reporting to declare Phase 1 success.

#### Problem Statement

**Current State:**
- No validation framework to measure improvements
- Cannot quantify recommendation quality changes
- Need before/after comparison across all metrics
- Unclear if 90%/80% coverage targets achieved

**Required Validation:**
- Confirm graph coverage targets met
- Measure recommendation quality improvements
- Validate graph query performance unchanged
- Ensure zero data corruption occurred
- Spot-check sample products for quality

#### Proposed Solution

Execute comprehensive validation using existing tooling:

1. **Graph Coverage Validation:**
   - Run analyze-product-stats.ts before and after
   - Compare interest coverage (target: 90%+)
   - Compare occasion coverage (target: 80%+)
   - Verify duplicate count reduced to 0
   - Calculate average edges per product

2. **Recommendation Quality Testing:**
   - Run persona testing framework with 20 queries
   - Compare hybrid scores before vs after
   - Measure graph score contribution (target: 60%+)
   - Track candidate pool size (target: 15-20)
   - Measure text fallback usage (target: <30%)

3. **Spot-Check Quality Review:**
   - Manually review 20 random products
   - Verify interest accuracy and relevance
   - Verify occasion appropriateness
   - Check for nonsensical extractions
   - Validate relationship integrity

4. **Performance Validation:**
   - Measure graph query latency before/after
   - Ensure no regression in query performance
   - Validate Explorer agent success rate
   - Check for any error rate increases

5. **Report Generation:**
   - Export comprehensive validation report
   - Include all metrics and comparisons
   - Document sample products reviewed
   - Provide recommendations for Phase 2

#### Acceptance Criteria

- [ ] analyze-product-stats.ts run before and after all migrations
- [ ] Validation report generated showing before/after comparison
- [ ] Interest coverage: 0.02% → 90%+ (achieved)
- [ ] Occasion coverage: 0.04% → 80%+ (achieved)
- [ ] Duplicate count: 2,308 → 0 (achieved)
- [ ] Average edges per product: 0.06 → 5-7+ (achieved)
- [ ] Persona testing shows 20-30% improvement in hybrid scores
- [ ] Graph score contribution increased from 5% to 60%+ for recommendations
- [ ] Candidate pool size increased from 5-10 to 15-20 products
- [ ] Text fallback usage decreased from 95% to <30%
- [ ] Graph query performance unchanged (<100ms for hybrid search)
- [ ] 20 random products manually spot-checked with 95%+ accuracy
- [ ] Zero data corruption detected (relationship counts match)
- [ ] No increase in system error rates
- [ ] Comprehensive validation report exported and documented
- [ ] Phase 1 exit criteria validated and approved

#### Technical Details

**Files to use:**
- `/Volumes/Crucial X8/Code/Present-Agent2/scripts/analyze-product-stats.ts` - Coverage metrics
- Persona testing framework (existing CLI tests)
- Manual spot-check process (random sampling)

**Validation commands:**
```bash
# Export baseline (before migrations)
npx tsx scripts/analyze-product-stats.ts --export > baseline-stats.json

# After all migrations complete
npx tsx scripts/analyze-product-stats.ts --export > final-stats.json

# Run persona tests (before)
npm run test:personas:list > baseline-personas.txt

# Run persona tests (after)
npm run test:personas:list > final-personas.txt

# Compare results
diff baseline-stats.json final-stats.json
diff baseline-personas.txt final-personas.txt
```

**Spot-check process:**
```bash
# Generate 20 random product IDs
# For each product, verify:
# 1. Interests are relevant and accurate
# 2. Occasions are appropriate
# 3. Relationships are intact
# 4. No duplicate edges exist
```

**Report structure:**
```markdown
# Graph Coverage Validation Report - v2.3.0 Phase 1

## Coverage Metrics
- Interest Coverage: Before vs After
- Occasion Coverage: Before vs After
- Duplicate Count: Before vs After
- Average Edges: Before vs After

## Recommendation Quality
- Hybrid Score: Before vs After (+20-30% expected)
- Graph Score: Before vs After (5% → 60% expected)
- Candidate Pool: Before vs After (5-10 → 15-20 expected)
- Text Fallback: Before vs After (95% → 30% expected)

## Performance
- Graph Query Latency: Before vs After
- Explorer Success Rate: Before vs After
- Error Rate: Before vs After

## Spot-Check Results
- 20 random products reviewed
- Accuracy: X%
- Issues found: [list]

## Conclusion
- Exit criteria met: Yes/No
- Recommendation for Phase 2: Proceed/Fix issues
```

**Dependencies:**
- Blocked by: #1, #2, #3 (all migrations must complete first)
- Blocks: #5, #6, #7 (Phase 2 can't start until Phase 1 validated)

**Testing requirements:**
- Automated: analyze-product-stats.ts
- Automated: Persona testing framework
- Manual: 20-product spot-check review
- Manual: Report generation and analysis

#### Estimated Effort

**2 story points (1 day)**
- Morning: Run all validation scripts
- Afternoon: Manual spot-checks (20 products)
- Evening: Generate report and analyze results

#### Notes

- This is the Phase 1 gate - must pass before Phase 2
- If targets not met, iterate on Issues #1-3
- Report will inform Phase 2 priorities
- Critical for measuring ROI of graph coverage work

---

## Priority 2: Performance Quick Wins (High)

### Issue 5: Parallelize Agent Execution

**Title:** Parallelize Relationship, Constraints, and Meaning agents for 40-60% speedup

**Labels:** `priority:high`, `type:performance`, `area:orchestrator`, `phase:2`

#### Description

Currently, all 10 agents execute sequentially, taking 20-50 seconds per query. However, 3 agents (Relationship, Constraints, Meaning) have no data dependencies and can run in parallel. Research shows this could reduce execution time by 40-60% (from ~25s to ~12-15s).

This issue implements parallel execution using `Promise.all()` while maintaining output consistency and data integrity.

#### Problem Statement

**Current State:**
```
Listener (2s) → Memory (3s) →
Relationship (5s) → Constraints (3s) → Meaning (8s) →
Explorer (4s) → Validator (2s) → Storyteller (3s) → Presenter (2s)
Total: ~32s sequential
```

**Opportunity:**
- Relationship, Constraints, and Meaning have no shared dependencies
- All three read from MemoryOutput (immutable)
- Can execute in parallel using Promise.all()
- Parallel block = max(5s, 3s, 8s) = 8s
- Savings: (5 + 3 + 8) - 8 = 8 seconds (25% improvement)

**Impact:**
- Faster response times improve user satisfaction
- Reduced server load (shorter request duration)
- Better resource utilization
- Foundation for further parallelization

#### Proposed Solution

Refactor orchestrator.ts to execute 3 agents in parallel:

1. **Code Changes:**
   ```typescript
   // Before (sequential)
   const relationshipOutput = await relationshipAgent.execute(memoryOutput);
   const constraintsOutput = await constraintsAgent.execute(memoryOutput);
   const meaningOutput = await meaningAgent.execute(memoryOutput);

   // After (parallel)
   const [relationshipOutput, constraintsOutput, meaningOutput] =
     await Promise.all([
       relationshipAgent.execute(memoryOutput),
       constraintsAgent.execute(memoryOutput),
       meaningAgent.execute(memoryOutput)
     ]);
   ```

2. **Timing Instrumentation:**
   - Add performance.now() before/after parallel block
   - Log individual agent timings
   - Log total parallel block timing
   - Compare to baseline sequential timing

3. **Testing:**
   - Unit tests for race conditions
   - Integration tests with 100 concurrent requests
   - Load testing with realistic traffic
   - Validate output consistency (parallel vs sequential)
   - Measure actual speedup achieved

4. **Deployment:**
   - Canary deploy to 10% traffic first
   - Monitor error rates and latency P50/P95/P99
   - Gradual rollout to 100% if metrics stable
   - Rollback capability if issues detected

#### Acceptance Criteria

- [ ] Orchestrator refactored to use Promise.all() for 3 agents
- [ ] Relationship, Constraints, and Meaning agents execute in parallel
- [ ] Total execution time reduced by 40-60% (from ~25s baseline to ~12-15s)
- [ ] No race conditions or data corruption detected
- [ ] All agent outputs remain identical to sequential execution (deterministic)
- [ ] Performance metrics logged: individual timings + parallel block timing
- [ ] Unit tests verify no shared mutable state between parallel agents
- [ ] Integration tests with 100+ concurrent requests pass
- [ ] Load testing shows no increase in error rates
- [ ] Canary deployment to 10% traffic successful
- [ ] P50/P95/P99 latency improvements documented
- [ ] Full rollout to 100% traffic completed
- [ ] Monitoring dashboard shows 40-60% reduction in agent execution time

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/src/services/orchestrator.ts` - Main orchestration logic
- `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/base.ts` - May need thread-safety review
- `/Volumes/Crucial X8/Code/Present-Agent2/src/lib/logger.ts` - Add parallel execution logging

**Code changes:**
```typescript
// In orchestrator.ts
async execute(userMessage: string, userId: string) {
  const start = performance.now();

  // Sequential agents
  const listenerOutput = await this.listener.execute({...});
  const memoryOutput = await this.memory.execute({...});

  // PARALLEL AGENTS - New block
  logger.info('Executing parallel agent block', {
    agents: ['Relationship', 'Constraints', 'Meaning']
  });

  const parallelStart = performance.now();
  const [relationshipOutput, constraintsOutput, meaningOutput] =
    await Promise.all([
      this.relationship.execute(memoryOutput),
      this.constraints.execute(memoryOutput),
      this.meaning.execute(memoryOutput)
    ]);
  const parallelDuration = performance.now() - parallelStart;

  logger.info('Parallel agent block completed', {
    duration: parallelDuration,
    agents: {
      relationship: relationshipOutput.metrics.duration,
      constraints: constraintsOutput.metrics.duration,
      meaning: meaningOutput.metrics.duration
    }
  });

  // Continue with Explorer (needs all 3 outputs)
  const explorerOutput = await this.explorer.execute({
    relationship: relationshipOutput,
    constraints: constraintsOutput,
    meaning: meaningOutput
  });

  // Remaining sequential agents...
}
```

**Dependencies:**
- Blocked by: #4 (Phase 1 must complete and validate first)
- Blocks: None (independent)

**Testing requirements:**
```bash
# Unit tests
npm run test -- orchestrator.test.ts

# Integration tests
npm run test:integration -- --parallel-agents

# Load testing
artillery run load-test.yml --target http://localhost:3000

# Measure before/after
# Run 20 queries sequentially, measure avg time
# Deploy parallel version
# Run 20 queries with parallelization, measure avg time
# Calculate % improvement
```

**Rollback plan:**
- Feature flag: ENABLE_PARALLEL_AGENTS=true/false
- Can revert to sequential execution immediately
- Monitor error rates in real-time
- Rollback if error rate >0.5% or latency increases

#### Estimated Effort

**5 story points (3 days)**
- Day 1: Implementation + unit tests
- Day 2: Integration testing + load testing
- Day 3: Canary deployment + monitoring + rollout

#### Notes

- This is the highest-impact performance improvement
- Research (Halo paper) shows 18.6x speedup is possible with batching
- Our 40-60% improvement is conservative (3 agents only)
- Future: Could parallelize more agents after validation
- Requires careful testing to avoid race conditions

---

### Issue 6: Tune Validator Thresholds

**Title:** Optimize Validator thresholds to increase candidate pool from 5-8 to 10-15 products

**Labels:** `priority:high`, `type:optimization`, `area:validator`, `phase:2`

#### Description

The Validator agent currently uses strict thresholds that filter out too many valid candidates, resulting in only 5-8 products passing validation. With improved graph coverage from Phase 1, we can tune thresholds to pass 10-15 products while maintaining quality.

This issue implements empirical threshold tuning based on real query data and user satisfaction metrics.

#### Problem Statement

**Current Thresholds:**
```typescript
STRICT_THRESHOLDS: {
  hybridScore: 0.50,
  interestMatch: 0.40,
  archetypeMatch: 0.30,
  personalizationScore: 0.50,
}
```

**Impact:**
- 80%+ of candidates filtered out
- Small candidate pool (5-8 products)
- Limited variety in recommendations
- May filter out high-quality niche products

**With Phase 1 Graph Coverage:**
- Graph scores now meaningful (60% contribution)
- Interest matches more accurate
- Can relax thresholds without quality loss
- Opportunity to increase candidate pool

#### Proposed Solution

Implement empirical threshold tuning:

1. **Baseline Analysis:**
   - Run 50 diverse queries through current system
   - Track pass/reject rates at each threshold
   - Identify which thresholds are bottlenecks
   - Measure current candidate pool size

2. **Threshold Testing:**
   - Test relaxed thresholds on same 50 queries
   - Proposed relaxed thresholds:
     ```typescript
     RELAXED_THRESHOLDS: {
       hybridScore: 0.45,        // was 0.50
       interestMatch: 0.35,      // was 0.40
       archetypeMatch: 0.25,     // was 0.30
       personalizationScore: 0.45 // was 0.50
     }
     ```
   - Measure new candidate pool size (target: 10-15)
   - Manually review recommendations for quality

3. **User Testing:**
   - A/B test with 20 test users or personas
   - Compare satisfaction with old vs new thresholds
   - Ensure no degradation in perceived quality
   - Track metrics: relevance, confidence, satisfaction

4. **Deploy Updated Thresholds:**
   - Update STRICT_THRESHOLDS constants
   - Deploy to production
   - Monitor candidate pool size
   - Monitor user satisfaction metrics

#### Acceptance Criteria

- [ ] Current threshold performance documented (50+ queries)
- [ ] Pass/reject rates analyzed for each threshold
- [ ] Bottleneck thresholds identified (which filters most)
- [ ] Relaxed thresholds tested on same 50 queries
- [ ] Candidate pool size increases from 5-8 to 10-15 products
- [ ] User testing (20 personas) shows no quality degradation
- [ ] A/B testing shows maintained or improved satisfaction scores
- [ ] Updated threshold constants deployed to production
- [ ] Monitoring dashboard tracks candidate pool size over time
- [ ] Quality metrics show no regression (hybrid scores maintained)
- [ ] Documentation updated with new thresholds and rationale

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/validator.ts` - Update threshold constants

**Code changes:**
```typescript
// In validator.ts
private readonly STRICT_THRESHOLDS = {
  hybridScore: 0.45,            // Relaxed from 0.50
  interestMatch: 0.35,          // Relaxed from 0.40
  archetypeMatch: 0.25,         // Relaxed from 0.30
  personalizationScore: 0.45,   // Relaxed from 0.50
};

// Add monitoring
logger.info('Validator thresholds applied', {
  thresholds: this.STRICT_THRESHOLDS,
  candidatesIn: candidates.length,
  candidatesOut: passedCandidates.length,
  filterRate: (1 - passedCandidates.length / candidates.length) * 100
});
```

**Testing script:**
```bash
# Create test query set
cat > test-queries.txt <<EOF
Gift for wine-loving mom
Anniversary gift for husband
Birthday gift for 10 year old
Christmas gift for coworker
EOF

# Run with current thresholds
npm run test:validator -- --queries test-queries.txt --output baseline.json

# Update thresholds in validator.ts

# Run with new thresholds
npm run test:validator -- --queries test-queries.txt --output relaxed.json

# Compare results
node scripts/compare-validator-results.js baseline.json relaxed.json
```

**Dependencies:**
- Blocked by: #4 (need Phase 1 graph coverage for meaningful scores)
- Blocks: None (independent)

**Testing requirements:**
- 50+ diverse queries covering different scenarios
- Manual quality review of recommendations
- Persona testing for satisfaction validation
- A/B testing if possible (or before/after comparison)

#### Estimated Effort

**2 story points (1-2 days)**
- Day 1: Analysis + threshold testing + quality review
- Day 2: User testing + deployment + monitoring

#### Notes

- Depends on Phase 1 success (graph coverage improves scores)
- Conservative relaxation (5-10% reduction per threshold)
- Can iterate further if quality remains high
- Monitor user satisfaction closely after deployment
- Rollback capability if quality degrades

---

### Issue 7: Improve DialogueManager Vague Query Handling

**Title:** Enhance DialogueManager to detect and clarify vague queries 80%+ of the time

**Labels:** `priority:high`, `type:enhancement`, `area:dialogue-manager`, `phase:2`

#### Description

The DialogueManager currently struggles to detect vague or under-specified queries (e.g., "I need a gift"), allowing them to proceed to the recommendation engine where they produce poor results. Improving vague query detection and triggering clarifying questions can reduce "bad recommendations from vague input" by 50%.

This issue enhances detection heuristics and ensures appropriate clarifying questions are asked.

#### Problem Statement

**Current Behavior:**
- Vague queries like "I need a gift" proceed to recommendations
- System generates generic recommendations with low confidence
- User dissatisfaction due to lack of personalization
- Missed opportunity to collect more context

**Examples of Vague Queries:**
- "I need a gift"
- "Something nice"
- "A present"
- "Gift ideas"
- "I don't know what to get"

**Impact:**
- Poor recommendation quality
- Low user satisfaction
- Wasted agent execution time
- Negative product impression

#### Proposed Solution

Enhance DialogueManager with improved vague query detection:

1. **Test Current Behavior:**
   - Create test set of 20 vague queries
   - Run through current system
   - Identify failure patterns
   - Document detection gaps

2. **Improve Detection Heuristics:**
   ```typescript
   // Enhanced vague query detection
   const vagueIndicators = [
     // Minimal queries
     /^(gift|present|something)$/i,

     // Unspecified requests
     /\b(i need|i want|looking for)\s+(a|an|some)?\s*(gift|present)\s*$/i,

     // Open-ended queries
     /^(help|ideas|suggestions)\s*(for)?\s*(gift|present)?s?\s*$/i,

     // Uncertainty expressions
     /\b(don't know|not sure|uncertain|no idea)\b/i,

     // Too generic
     /^(nice|good|great|amazing)\s+(gift|present|thing)$/i
   ];
   ```

3. **Implement Missing Context Detection:**
   - Check for recipient info (who is it for?)
   - Check for occasion info (what's the event?)
   - Check for interests/hobbies mentioned
   - If 2+ missing, trigger clarifying questions

4. **Add Targeted Clarifying Questions:**
   ```typescript
   // Question templates based on missing context
   if (!hasRecipient) {
     return "Who are you shopping for? (e.g., mom, friend, coworker)";
   }
   if (!hasOccasion) {
     return "What's the occasion? (e.g., birthday, anniversary, thank you)";
   }
   if (!hasInterests) {
     return "What are they interested in? (e.g., hobbies, passions, style)";
   }
   ```

5. **Testing:**
   - Test with 20 vague queries
   - Verify 80%+ trigger clarifying questions
   - Ensure non-vague queries still proceed
   - Validate question quality and relevance

#### Acceptance Criteria

- [ ] Test set of 20 diverse vague queries created
- [ ] Current behavior documented showing detection gaps
- [ ] Failure patterns identified and categorized
- [ ] Enhanced vague query detection heuristics implemented
- [ ] Missing context detection logic added (recipient, occasion, interests)
- [ ] Targeted clarifying question templates implemented
- [ ] Testing shows 80%+ of vague queries trigger clarifying questions
- [ ] Non-vague queries still proceed to recommendations (no false positives)
- [ ] Clarifying questions are relevant and helpful
- [ ] "Bad recommendations from vague input" reduced by 50%
- [ ] Unit tests added for all detection patterns
- [ ] Integration tests verify end-to-end clarification flow
- [ ] Documentation updated with vague query handling logic

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/dialogue-manager.ts` - Main detection logic
- `/Volumes/Crucial X8/Code/Present-Agent2/src/lib/question-templates.ts` - Clarifying question templates

**Code changes:**
```typescript
// In dialogue-manager.ts
async detectVagueQuery(userMessage: string): Promise<VagueQueryResult> {
  const vagueIndicators = [
    /^(gift|present|something)$/i,
    /\b(i need|i want|looking for)\s+(a|an|some)?\s*(gift|present)\s*$/i,
    /^(help|ideas|suggestions)\s*(for)?\s*(gift|present)?s?\s*$/i,
    /\b(don't know|not sure|uncertain|no idea)\b/i,
    /^(nice|good|great|amazing)\s+(gift|present|thing)$/i
  ];

  const isVague = vagueIndicators.some(regex => regex.test(userMessage));

  if (isVague) {
    const missingContext = this.detectMissingContext(userMessage);
    const clarifyingQuestion = this.generateClarifyingQuestion(missingContext);

    return {
      isVague: true,
      reason: 'Under-specified query',
      missingContext,
      clarifyingQuestion
    };
  }

  return { isVague: false };
}

private detectMissingContext(message: string): string[] {
  const missing = [];

  if (!this.hasRecipientMention(message)) missing.push('recipient');
  if (!this.hasOccasionMention(message)) missing.push('occasion');
  if (!this.hasInterestMention(message)) missing.push('interests');

  return missing;
}

private generateClarifyingQuestion(missingContext: string[]): string {
  const templates = {
    recipient: "Who are you shopping for? (e.g., mom, friend, coworker)",
    occasion: "What's the occasion? (e.g., birthday, anniversary, just because)",
    interests: "What are they interested in? (e.g., hobbies, passions, style)"
  };

  // Return question for most critical missing context
  return templates[missingContext[0]] || templates.recipient;
}
```

**Test queries:**
```typescript
// Vague queries (should trigger clarification)
const vagueQueries = [
  "I need a gift",
  "Something nice",
  "A present",
  "Gift ideas",
  "I don't know what to get",
  "Help me find a gift",
  "Looking for something",
  "I want to buy a present",
  "Not sure what to get",
  "Need suggestions"
];

// Valid queries (should NOT trigger clarification)
const validQueries = [
  "Gift for my wine-loving mom's birthday",
  "Anniversary gift for my husband who loves golf",
  "Birthday present for 10 year old who likes science",
  "Christmas gift for coworker, budget $30"
];
```

**Dependencies:**
- Blocked by: None (can implement independently)
- Blocks: None (independent)

**Testing requirements:**
```bash
# Unit tests
npm run test -- dialogue-manager.test.ts

# Integration tests with vague queries
npm run test:vague-queries

# Measure improvement
# Before: X% vague queries detected
# After: 80%+ vague queries detected
```

#### Estimated Effort

**2 story points (1 day)**
- Morning: Test current behavior + identify gaps
- Afternoon: Implement improved detection
- Evening: Testing + validation + deployment

#### Notes

- Quick win with high user satisfaction impact
- Reduces wasted agent execution on vague queries
- Builds trust through intelligent clarification
- Foundation for more sophisticated dialogue management
- Can iterate on detection patterns based on real usage

---

## Priority 3: SSE Progress Indicators (Optional)

### Issue 8: Implement Backend SSE Endpoint

**Title:** Add SSE streaming support to /api/chat for real-time agent progress updates

**Labels:** `priority:medium`, `type:enhancement`, `area:backend`, `phase:3`

#### Description

Implement Server-Sent Events (SSE) streaming in the `/api/chat` endpoint to push real-time progress updates as agents execute. This enables the frontend to display live progress indicators, reducing perceived wait time by 40% even though actual execution time remains the same.

SSE is preferred over WebSocket due to simpler implementation, built-in reconnection, and perfect fit for one-way server-to-client updates.

#### Problem Statement

**Current State:**
- `/api/chat` endpoint returns single JSON response after 20-50s
- No way to stream progress updates during execution
- Frontend shows static "Processing..." message
- Users perceive system as frozen or broken

**Desired State:**
- Backend streams progress events via SSE
- Frontend receives real-time agent start/complete events
- Users see live progress updates (1/10, 2/10, etc.)
- Maintains backward compatibility for non-SSE clients

#### Proposed Solution

Add SSE streaming capability to the chat API route:

1. **SSE Event Format:**
   ```typescript
   // Agent start event
   event: agent_start
   data: {"agent":"Listener","step":1,"total":10,"timestamp":1234567890}

   // Agent complete event
   event: agent_complete
   data: {"agent":"Listener","step":1,"total":10,"duration":1200}

   // Final recommendations event
   event: final
   data: {"recommendations":[...],"metadata":{...}}

   // Error event
   event: error
   data: {"message":"Agent execution failed","error":{...}}
   ```

2. **Endpoint Implementation:**
   - Detect SSE support via Accept header
   - If SSE: Stream events as agents execute
   - If not SSE: Return JSON response (backward compatible)
   - Use ReadableStream for SSE data transmission
   - Include reconnection logic and sequence numbers

3. **Error Handling:**
   - Send error events if agent fails
   - Include timeout after 60s with error message
   - Graceful degradation if SSE connection drops
   - Ensure proper cleanup of resources

4. **Testing:**
   - Unit tests for SSE event formatting
   - Integration tests for full agent workflow
   - Test reconnection scenarios
   - Test backward compatibility (non-SSE clients)
   - Load testing to ensure SSE doesn't degrade performance

#### Acceptance Criteria

- [ ] `/api/chat` endpoint supports SSE streaming via Accept: text/event-stream header
- [ ] Agent start events emitted for each of 10 agents with metadata
- [ ] Agent complete events emitted with duration and step number
- [ ] Final event contains complete recommendations data
- [ ] Error events sent for failures (don't leave client hanging)
- [ ] Events include: agent name, step number, total steps, duration, timestamp
- [ ] Backward compatible: returns JSON for non-SSE requests
- [ ] SSE connection includes reconnection support with sequence numbers
- [ ] Timeout after 60s with error event if execution hangs
- [ ] Proper resource cleanup (close streams, clear timers)
- [ ] Unit tests for SSE event formatting and transmission
- [ ] Integration tests verify end-to-end streaming
- [ ] Load testing shows no performance degradation
- [ ] Documentation added for SSE API specification

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/app/api/chat/route.ts` - Main API route

**Implementation:**
```typescript
// In frontend/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message, userId } = await request.json();
  const acceptsSSE = request.headers.get('accept')?.includes('text/event-stream');

  if (acceptsSSE) {
    // SSE streaming
    const encoder = new TextEncoder();
    let sequenceNumber = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create event emitter callback
          const emitEvent = (eventType: string, data: any) => {
            const event = `event: ${eventType}\ndata: ${JSON.stringify({
              ...data,
              seq: sequenceNumber++
            })}\n\n`;
            controller.enqueue(encoder.encode(event));
          };

          // Execute orchestrator with event callbacks
          const result = await orchestrator.execute(message, userId, {
            onAgentStart: (agent, step, total) => {
              emitEvent('agent_start', { agent, step, total, timestamp: Date.now() });
            },
            onAgentComplete: (agent, step, total, duration) => {
              emitEvent('agent_complete', { agent, step, total, duration });
            }
          });

          // Send final results
          emitEvent('final', result);

          controller.close();
        } catch (error) {
          // Send error event
          emitEvent('error', { message: error.message, error });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } else {
    // Regular JSON response (backward compatible)
    const result = await orchestrator.execute(message, userId);
    return NextResponse.json(result);
  }
}
```

**Dependencies:**
- Blocked by: #9 (orchestrator must emit events first)
- Blocks: #10 (frontend needs SSE endpoint to consume)

**Testing:**
```bash
# Test SSE endpoint
curl -H "Accept: text/event-stream" -H "Content-Type: application/json" \
  -d '{"message":"Gift for wine-loving mom","userId":"test"}' \
  http://localhost:3000/api/chat

# Should stream events in real-time

# Test backward compatibility
curl -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"message":"Gift for wine-loving mom","userId":"test"}' \
  http://localhost:3000/api/chat

# Should return single JSON response
```

#### Estimated Effort

**3 story points (1-2 days)**
- Day 1: Implementation + unit tests
- Day 2: Integration tests + backward compatibility validation

#### Notes

- SSE is simpler than WebSocket for this use case
- Built-in reconnection in SSE protocol
- One-way server-to-client is perfect fit
- Next.js 13+ supports SSE via ReadableStream
- Must coordinate with Issue #9 (orchestrator events)

---

### Issue 9: Add Orchestrator Event Emitters

**Title:** Refactor orchestrator to emit agent lifecycle events for SSE streaming

**Labels:** `priority:medium`, `type:enhancement`, `area:orchestrator`, `phase:3`

#### Description

Refactor the orchestrator to accept event callback functions and emit agent lifecycle events (start, complete) during execution. This provides the event data needed by the SSE endpoint (Issue #8) to stream progress updates to the frontend.

The refactor must be non-breaking and support both callback-based (SSE) and callback-less (traditional) execution modes.

#### Problem Statement

**Current State:**
- Orchestrator executes agents sequentially/parallel
- No visibility into individual agent progress
- Cannot emit events during execution
- All logic is internal until final return

**Desired State:**
- Orchestrator accepts optional event callbacks
- Emits agent_start event before each agent
- Emits agent_complete event after each agent
- Maintains backward compatibility (callbacks optional)

#### Proposed Solution

Add event callback support to orchestrator:

1. **Define Event Callback Interface:**
   ```typescript
   interface OrchestratorCallbacks {
     onAgentStart?: (agent: string, step: number, total: number) => void;
     onAgentComplete?: (agent: string, step: number, total: number, duration: number) => void;
     onError?: (error: Error, agent?: string) => void;
   }
   ```

2. **Refactor Execute Method:**
   ```typescript
   async execute(
     userMessage: string,
     userId: string,
     callbacks?: OrchestratorCallbacks
   ): Promise<OrchestratorResult> {
     const totalSteps = 10;
     let currentStep = 0;

     // Listener
     callbacks?.onAgentStart?.('Listener', ++currentStep, totalSteps);
     const start = performance.now();
     const listenerOutput = await this.listener.execute({...});
     callbacks?.onAgentComplete?.('Listener', currentStep, totalSteps,
       performance.now() - start);

     // Repeat for all 10 agents...
   }
   ```

3. **Testing:**
   - Verify callbacks are invoked correctly
   - Test with callbacks (SSE mode)
   - Test without callbacks (traditional mode)
   - Validate timing accuracy
   - Ensure no performance overhead

#### Acceptance Criteria

- [ ] OrchestratorCallbacks interface defined with onAgentStart, onAgentComplete, onError
- [ ] execute() method accepts optional callbacks parameter
- [ ] Callbacks invoked before and after each agent execution
- [ ] Event data includes: agent name, step number, total steps, duration
- [ ] Backward compatible: works without callbacks (existing behavior)
- [ ] No performance overhead when callbacks not provided
- [ ] All 10 agents emit start/complete events
- [ ] Error events emitted when agent execution fails
- [ ] Timing measurements accurate (performance.now())
- [ ] Unit tests verify callback invocations
- [ ] Integration tests verify end-to-end event flow
- [ ] Works correctly with parallel agent execution (Issue #5)

#### Technical Details

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/src/services/orchestrator.ts` - Add callback support
- `/Volumes/Crucial X8/Code/Present-Agent2/src/types/agents.ts` - Add callback interface

**Implementation:**
```typescript
// In src/types/agents.ts
export interface OrchestratorCallbacks {
  onAgentStart?: (agent: string, step: number, total: number) => void;
  onAgentComplete?: (agent: string, step: number, total: number, duration: number) => void;
  onError?: (error: Error, agent?: string) => void;
}

// In src/services/orchestrator.ts
export class Orchestrator {
  private readonly TOTAL_AGENTS = 10;

  async execute(
    userMessage: string,
    userId: string,
    callbacks?: OrchestratorCallbacks
  ): Promise<OrchestratorResult> {
    let currentStep = 0;

    try {
      // Helper to emit events
      const emitStart = (agent: string) => {
        callbacks?.onAgentStart?.(agent, ++currentStep, this.TOTAL_AGENTS);
      };

      const emitComplete = (agent: string, duration: number) => {
        callbacks?.onAgentComplete?.(agent, currentStep, this.TOTAL_AGENTS, duration);
      };

      // Listener
      emitStart('Listener');
      const t0 = performance.now();
      const listenerOutput = await this.listener.execute({...});
      emitComplete('Listener', performance.now() - t0);

      // Memory
      emitStart('Memory');
      const t1 = performance.now();
      const memoryOutput = await this.memory.execute({...});
      emitComplete('Memory', performance.now() - t1);

      // Parallel block (if Issue #5 merged)
      emitStart('Relationship');
      emitStart('Constraints');
      emitStart('Meaning');
      const t2 = performance.now();
      const [rel, con, mean] = await Promise.all([...]);
      emitComplete('Relationship', performance.now() - t2);
      emitComplete('Constraints', performance.now() - t2);
      emitComplete('Meaning', performance.now() - t2);

      // Continue for remaining agents...

      return result;

    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  }
}
```

**Dependencies:**
- Blocked by: None (can implement independently)
- Blocks: #8 (SSE endpoint needs these events)

**Testing:**
```typescript
// Unit test
it('should invoke callbacks for each agent', async () => {
  const callbacks = {
    onAgentStart: jest.fn(),
    onAgentComplete: jest.fn(),
    onError: jest.fn()
  };

  await orchestrator.execute('test message', 'user123', callbacks);

  expect(callbacks.onAgentStart).toHaveBeenCalledTimes(10);
  expect(callbacks.onAgentComplete).toHaveBeenCalledTimes(10);
  expect(callbacks.onError).not.toHaveBeenCalled();

  // Verify event data
  expect(callbacks.onAgentStart).toHaveBeenCalledWith('Listener', 1, 10);
  expect(callbacks.onAgentComplete).toHaveBeenCalledWith(
    'Listener', 1, 10, expect.any(Number)
  );
});

// Backward compatibility test
it('should work without callbacks', async () => {
  const result = await orchestrator.execute('test message', 'user123');
  expect(result).toBeDefined();
  expect(result.recommendations).toBeDefined();
});
```

#### Estimated Effort

**2 story points (1 day)**
- Morning: Implement callback interface and refactor
- Afternoon: Testing + validation + documentation

#### Notes

- Must maintain backward compatibility (callbacks optional)
- Timing measurements should be accurate (use performance.now())
- Works with both sequential and parallel execution
- Foundation for real-time progress indicators
- No performance overhead when callbacks not provided

---

### Issue 10: Frontend EventSource Integration

**Title:** Implement EventSource client to consume SSE progress events from /api/chat

**Labels:** `priority:medium`, `type:enhancement`, `area:frontend`, `phase:3`

#### Description

Implement an EventSource client in the frontend to connect to the SSE-enabled `/api/chat` endpoint and consume real-time agent progress events. This handles event parsing, reconnection logic, error handling, and state management for progress display.

#### Problem Statement

**Current State:**
- Frontend makes POST request to /api/chat
- Waits for single JSON response
- No way to receive progress updates
- Static "Processing..." message

**Desired State:**
- Frontend opens SSE connection to /api/chat
- Receives real-time agent events
- Updates progress state as events arrive
- Handles reconnection and errors gracefully

#### Proposed Solution

Implement EventSource client with React hooks:

1. **Create useSSEChat Hook:**
   ```typescript
   export function useSSEChat() {
     const [progress, setProgress] = useState<ProgressState>({
       currentAgent: null,
       step: 0,
       total: 10,
       isComplete: false
     });

     const sendMessage = async (message: string, userId: string) => {
       const eventSource = new EventSource(
         `/api/chat?message=${encodeURIComponent(message)}&userId=${userId}`
       );

       eventSource.addEventListener('agent_start', (e) => {
         const data = JSON.parse(e.data);
         setProgress({ currentAgent: data.agent, step: data.step, total: data.total });
       });

       eventSource.addEventListener('final', (e) => {
         const data = JSON.parse(e.data);
         setProgress({ ...progress, isComplete: true });
         setRecommendations(data.recommendations);
         eventSource.close();
       });

       // Error handling, etc.
     };

     return { progress, sendMessage };
   }
   ```

2. **Error Handling:**
   - Detect connection errors
   - Implement exponential backoff for reconnection
   - Timeout after 60s if no events
   - Fallback to regular JSON request if SSE fails
   - Display error messages to user

3. **State Management:**
   - Track current agent and step
   - Calculate progress percentage
   - Store final recommendations
   - Handle loading and error states

4. **Testing:**
   - Unit tests for event parsing
   - Integration tests with mock SSE server
   - Test reconnection scenarios
   - Test error handling
   - Test fallback to JSON

#### Acceptance Criteria

- [ ] useSSEChat() hook created for SSE connection management
- [ ] EventSource client connects to /api/chat with Accept: text/event-stream
- [ ] agent_start events parsed and update progress state
- [ ] agent_complete events parsed and update progress state
- [ ] final event parsed and populates recommendations
- [ ] error events handled gracefully with user-friendly messages
- [ ] Automatic reconnection on connection drop (exponential backoff)
- [ ] Timeout after 60s with error message if no response
- [ ] Graceful fallback to JSON request if SSE unsupported
- [ ] Progress state includes: currentAgent, step, total, duration
- [ ] Loading and error states managed correctly
- [ ] Unit tests for event parsing and state updates
- [ ] Integration tests with mock SSE server
- [ ] Works in all target browsers (Chrome, Firefox, Safari, Edge)

#### Technical Details

**Files to create:**
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/hooks/useSSEChat.ts` - SSE hook
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/types/progress.ts` - Progress types

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/app/page.tsx` - Use new hook
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/components/chat-loading.tsx` - Update to use progress data

**Implementation:**
```typescript
// frontend/hooks/useSSEChat.ts
import { useState, useCallback } from 'react';

interface ProgressState {
  currentAgent: string | null;
  step: number;
  total: number;
  duration?: number;
  isComplete: boolean;
  error?: string;
}

export function useSSEChat() {
  const [progress, setProgress] = useState<ProgressState>({
    currentAgent: null,
    step: 0,
    total: 10,
    isComplete: false
  });
  const [recommendations, setRecommendations] = useState(null);

  const sendMessage = useCallback(async (message: string, userId: string) => {
    setProgress({ currentAgent: null, step: 0, total: 10, isComplete: false });

    // Check SSE support
    if (typeof EventSource === 'undefined') {
      return fallbackToJSON(message, userId);
    }

    try {
      const eventSource = new EventSource(
        `/api/chat?message=${encodeURIComponent(message)}&userId=${userId}`
      );

      // Timeout after 60s
      const timeout = setTimeout(() => {
        eventSource.close();
        setProgress(prev => ({
          ...prev,
          error: 'Request timed out. Please try again.'
        }));
      }, 60000);

      eventSource.addEventListener('agent_start', (e) => {
        const data = JSON.parse(e.data);
        setProgress({
          currentAgent: data.agent,
          step: data.step,
          total: data.total,
          isComplete: false
        });
      });

      eventSource.addEventListener('agent_complete', (e) => {
        const data = JSON.parse(e.data);
        setProgress(prev => ({
          ...prev,
          duration: data.duration
        }));
      });

      eventSource.addEventListener('final', (e) => {
        clearTimeout(timeout);
        const data = JSON.parse(e.data);
        setProgress(prev => ({ ...prev, isComplete: true }));
        setRecommendations(data.recommendations);
        eventSource.close();
      });

      eventSource.addEventListener('error', (e) => {
        clearTimeout(timeout);
        const data = e.data ? JSON.parse(e.data) : {};
        setProgress(prev => ({
          ...prev,
          error: data.message || 'An error occurred'
        }));
        eventSource.close();
      });

      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        // Fallback to JSON
        fallbackToJSON(message, userId);
      };

    } catch (error) {
      console.error('SSE error:', error);
      fallbackToJSON(message, userId);
    }
  }, []);

  const fallbackToJSON = async (message: string, userId: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId })
    });
    const data = await response.json();
    setRecommendations(data.recommendations);
    setProgress(prev => ({ ...prev, isComplete: true }));
  };

  return { progress, recommendations, sendMessage };
}
```

**Dependencies:**
- Blocked by: #8 (needs SSE endpoint)
- Blocks: #11 (progress UI needs this data)

**Testing:**
```typescript
// Unit test
import { renderHook, act } from '@testing-library/react-hooks';
import { useSSEChat } from './useSSEChat';

it('should update progress on agent_start events', async () => {
  const { result } = renderHook(() => useSSEChat());

  // Mock EventSource
  const mockEventSource = {
    addEventListener: jest.fn(),
    close: jest.fn()
  };
  global.EventSource = jest.fn(() => mockEventSource);

  await act(async () => {
    result.current.sendMessage('test', 'user123');
  });

  // Simulate agent_start event
  const agentStartHandler = mockEventSource.addEventListener.mock.calls
    .find(call => call[0] === 'agent_start')[1];

  act(() => {
    agentStartHandler({
      data: JSON.stringify({ agent: 'Listener', step: 1, total: 10 })
    });
  });

  expect(result.current.progress.currentAgent).toBe('Listener');
  expect(result.current.progress.step).toBe(1);
});
```

#### Estimated Effort

**3 story points (1-2 days)**
- Day 1: Implement hook + error handling
- Day 2: Testing + integration + fallback logic

#### Notes

- EventSource API is well-supported in modern browsers
- Automatic reconnection built into EventSource
- Graceful degradation for older browsers
- Must handle partial event sequences (reconnection)
- Timeout is critical to avoid infinite loading

---

### Issue 11: Progress UI Component

**Title:** Create real-time progress UI component showing agent workflow execution

**Labels:** `priority:medium`, `type:enhancement`, `area:frontend`, `phase:3`

#### Description

Create a polished progress UI component that displays the 10-agent workflow in real-time as agents execute. This component consumes progress state from the useSSEChat hook (Issue #10) and provides smooth animations, clear status indicators, and a professional appearance to reduce perceived wait time by 40%.

#### Problem Statement

**Current State:**
- Static "Processing..." message
- No visibility into execution progress
- Users perceive 20-50s wait as system freeze
- High abandonment risk

**Desired State:**
- Live progress bar showing X/10 agents complete
- Current agent name and status displayed
- Smooth animations and transitions
- Professional, polished appearance
- Users understand work is happening

#### Proposed Solution

Create comprehensive progress UI component:

1. **Progress Bar Component:**
   ```tsx
   <ProgressIndicator
     currentAgent={progress.currentAgent}
     step={progress.step}
     total={progress.total}
     duration={progress.duration}
   />
   ```

2. **Visual Elements:**
   - Progress bar (0-100% based on step/total)
   - Current agent name with friendly labels
   - Step counter (1/10, 2/10, etc.)
   - Duration/timing estimate
   - Smooth animations between steps
   - Loading spinner or pulse effect

3. **Agent Labels:**
   ```typescript
   const agentLabels = {
     Listener: "Understanding your request",
     Memory: "Recalling preferences",
     Relationship: "Analyzing relationships",
     Constraints: "Checking requirements",
     Meaning: "Interpreting context",
     Explorer: "Searching 41K products",
     Validator: "Validating quality",
     Storyteller: "Crafting reasoning",
     Presenter: "Preparing results"
   };
   ```

4. **Animations:**
   - Fade in/out between agent transitions
   - Progress bar fills smoothly (CSS transition)
   - Pulse effect on current agent
   - Checkmark on completed agents
   - Success animation on final completion

5. **Responsive Design:**
   - Mobile-friendly layout
   - Accessible (ARIA labels, screen reader support)
   - Works in all target browsers
   - Graceful degradation for no-animation mode

#### Acceptance Criteria

- [ ] ProgressIndicator component created with clean, professional design
- [ ] Progress bar displays completion percentage (0-100%)
- [ ] Current agent name shown with friendly, user-facing label
- [ ] Step counter displayed (e.g., "1/10", "2/10", etc.)
- [ ] Duration estimate shown (optional: "~15 seconds remaining")
- [ ] Smooth animations between agent transitions (fade in/out, progress fill)
- [ ] Completed agents marked with checkmark or success indicator
- [ ] Progress indicator appears within 500ms of query submission
- [ ] Updates at least every 2 seconds (tied to agent completion)
- [ ] Final results render smoothly with no jarring transition
- [ ] Mobile responsive design (works on 320px+ width)
- [ ] Accessible: ARIA labels, keyboard navigation, screen reader support
- [ ] Works in all target browsers (Chrome, Firefox, Safari, Edge)
- [ ] User testing shows improved perceived performance
- [ ] Abandonment rate during wait reduced by 50%+

#### Technical Details

**Files to create:**
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/components/progress-indicator.tsx` - Main progress UI component
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/lib/agent-labels.ts` - User-friendly agent labels

**Files to modify:**
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/components/chat-loading.tsx` - Replace with ProgressIndicator
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/app/page.tsx` - Integrate progress UI

**Implementation:**
```tsx
// frontend/components/progress-indicator.tsx
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentAgent: string | null;
  step: number;
  total: number;
  duration?: number;
}

const agentLabels = {
  Listener: "Understanding your request",
  Memory: "Recalling preferences",
  Relationship: "Analyzing relationships",
  Constraints: "Checking requirements",
  Meaning: "Interpreting context",
  Explorer: "Searching 41K products",
  Validator: "Validating quality",
  Storyteller: "Crafting reasoning",
  Presenter: "Preparing results"
};

export function ProgressIndicator({
  currentAgent,
  step,
  total,
  duration
}: ProgressIndicatorProps) {
  const percentage = (step / total) * 100;
  const label = currentAgent ? agentLabels[currentAgent] || currentAgent : "Processing";

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-4">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <motion.p
          key={currentAgent}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-lg font-medium text-gray-900"
        >
          {label}
        </motion.p>

        <p className="text-sm text-gray-500">
          Step {step} of {total}
        </p>

        {duration && (
          <p className="text-xs text-gray-400">
            ~{Math.round((total - step) * (duration / 1000))}s remaining
          </p>
        )}
      </div>

      {/* Agent list (optional) */}
      <div className="space-y-1 text-sm">
        {Object.keys(agentLabels).map((agent, idx) => (
          <div
            key={agent}
            className={`flex items-center space-x-2 ${
              idx < step ? 'text-green-600' :
              idx === step ? 'text-blue-600 font-medium' :
              'text-gray-400'
            }`}
          >
            {idx < step && <CheckIcon className="w-4 h-4" />}
            {idx === step && <SpinnerIcon className="w-4 h-4 animate-spin" />}
            {idx > step && <DotIcon className="w-4 h-4" />}
            <span>{agentLabels[agent]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Dependencies:**
- Blocked by: #10 (needs progress state from useSSEChat hook)
- Blocks: None (final UI component)

**Testing:**
```typescript
// Component test
import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from './progress-indicator';

it('should display current agent and progress', () => {
  render(
    <ProgressIndicator
      currentAgent="Listener"
      step={1}
      total={10}
    />
  );

  expect(screen.getByText(/Understanding your request/i)).toBeInTheDocument();
  expect(screen.getByText(/Step 1 of 10/i)).toBeInTheDocument();

  // Progress bar should be 10% filled
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toHaveStyle({ width: '10%' });
});

// User testing
// - 10 participants watch progress indicator during 20s query
// - Ask: "Did you feel informed about what was happening?"
// - Measure: abandonment rate before vs after
// - Target: 50%+ reduction in abandonment
```

#### Estimated Effort

**3 story points (1-2 days)**
- Day 1: Component design + implementation
- Day 2: Animations + accessibility + testing

#### Notes

- Consider using framer-motion for smooth animations
- Keep animations subtle (avoid distracting from content)
- Agent labels should be user-friendly, not technical
- Progress bar should feel continuous (no jumping)
- Optional: Add estimated time remaining
- Accessibility is critical (ARIA labels, keyboard nav)
- User testing will validate perceived performance improvement

---

## Implementation Sequence

Recommended order for implementing issues to minimize risk and maximize early wins:

### Week 1: Graph Coverage Foundation
1. **Issue #1** (Days 1-3): Extract interests for orphaned products
   - Run dry-run and validate quality
   - Execute full batch processing
   - Critical foundation for all other improvements

2. **Issue #2** (Days 4-5): Tag occasions for products
   - Can run parallel with #1 after day 1
   - Quick win with high impact

3. **Issue #3** (Day 6): Normalize duplicate interests
   - MUST run after #1 completes
   - Fast execution (1 hour actual work)

4. **Issue #4** (Day 7): Validate graph coverage metrics
   - Gate for Phase 2 - must pass before continuing
   - Generate comprehensive validation report

### Week 2: Performance Optimization
5. **Issue #5** (Days 8-10): Parallelize agent execution
   - Highest-impact performance improvement
   - Requires careful testing for race conditions

6. **Issue #7** (Day 11): Improve DialogueManager vague query handling
   - Quick win with high UX impact
   - Can implement while #5 is in testing

7. **Issue #6** (Day 12): Tune Validator thresholds
   - Benefits from #5 being in production
   - Empirical tuning based on real data

### Week 3-4: Progress Indicators (Optional)
8. **Issue #9** (Day 13): Add orchestrator event emitters
   - Foundation for SSE - must come first
   - Non-breaking change with backward compatibility

9. **Issue #8** (Days 14-15): Implement backend SSE endpoint
   - Depends on #9
   - Backend infrastructure for progress updates

10. **Issue #10** (Days 16-17): Frontend EventSource integration
    - Depends on #8
    - Client-side SSE consumption

11. **Issue #11** (Days 18-19): Progress UI component
    - Depends on #10
    - Final polish for user experience

## Dependency Graph

```
[Epic: v2.3.0 Graph Coverage & Performance]
    |
    ├─── Priority 1: Graph Coverage (CRITICAL) ───┐
    |    |                                         |
    |    ├─── #1: Extract Interests ───┐          |
    |    |                              |          |
    |    ├─── #2: Tag Occasions         ├─── #3: Normalize Interests ─── #4: Validate
    |    |                              |
    |    └────────────────────────────┘
    |
    ├─── Priority 2: Performance (HIGH) ──────────┐
    |    |                                         |
    |    ├─── #5: Parallelize Agents              |
    |    |                                         |
    |    ├─── #6: Tune Validator Thresholds       ├─── [Phase 2 Complete]
    |    |                                         |
    |    └─── #7: DialogueManager Improvements    |
    |                                              |
    └─── Priority 3: Progress (OPTIONAL) ─────────┘
         |
         ├─── #9: Orchestrator Events ─── #8: Backend SSE ─── #10: Frontend SSE ─── #11: Progress UI
         |
         └─── [Phase 3 Complete]

Critical Path: #1 → #3 → #4 → #5 → [Deployment]
Parallel Paths: #2 can run with #1, #7 can run with #5
Optional Path: #9 → #8 → #10 → #11 (only if time permits)
```

### Blocking Dependencies

**Must Complete Before Phase 2:**
- Issue #4 validates Phase 1 success
- If coverage targets not met, iterate on #1-3

**Can Run in Parallel:**
- Issue #1 + Issue #2 (independent data)
- Issue #5 testing + Issue #7 implementation
- Issue #9 + Issue #6 (different areas)

**Sequential Requirements:**
- #1 must complete before #3 (normalize after extraction)
- #3 must complete before #4 (validate final state)
- #9 must complete before #8 (events before SSE)
- #8 must complete before #10 (backend before frontend)
- #10 must complete before #11 (data before UI)

### Risk Mitigation

**High-Risk Issues:**
- #1: Large batch processing - validate with dry-run first
- #3: Graph mutation - test on staging, backup production
- #5: Parallel execution - extensive race condition testing

**Low-Risk Issues:**
- #2: Heuristic-based (no LLM if not needed)
- #7: Isolated to DialogueManager
- #6: Threshold tuning (easily reverted)

**Optional Issues (Can Cut if Time Constrained):**
- #8, #9, #10, #11: Progress indicators are "nice-to-have"
- Phase 2 performance gains provide most UX benefit
- SSE adds transparency but not required for v2.3.0

---

## Ready-to-Paste GitHub Issue Bodies

Each issue above is formatted with complete details ready to paste into GitHub:

1. Copy the issue content from "**Title:**" through "**Notes:**"
2. Create new GitHub issue
3. Paste content as issue description
4. Add labels as specified
5. Set milestone to "v2.3.0 - Graph Coverage & Performance"
6. Assign to engineering team
7. Link dependencies using GitHub's "blocked by" feature

### Example Labels to Create

```
priority:critical
priority:high
priority:medium
type:enhancement
type:performance
type:validation
type:optimization
area:graph-coverage
area:orchestrator
area:validator
area:dialogue-manager
area:backend
area:frontend
phase:1
phase:2
phase:3
milestone:v2.3.0
```

---

**Document Status:** READY FOR REVIEW
**Total Estimated Effort:** 27 story points (3-4 weeks, 1 engineer)
**Next Steps:**
1. Review all issues with engineering team
2. Create GitHub milestone "v2.3.0"
3. Create issues in GitHub using this document
4. Set up labels and dependencies
5. Begin Sprint 1: Graph Coverage (Week 1)

---

*Created by Tickets Manager Agent - 2025-11-24*
