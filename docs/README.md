# Present-Agent2 Documentation

**Version**: 2.4.0 - Enrichment Automation | **Last Updated**: December 8, 2025

Complete documentation hub for the Present-Agent2 AI gift recommendation system.

---

## Quick Start

| Document | Description | Audience |
|----------|-------------|----------|
| [QUICKSTART.md](QUICKSTART.md) | Get running in 5 minutes | New developers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design overview | Technical team |
| [API.md](API.md) | API reference | Frontend devs |
| [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | Frontend development | UI developers |
| [SECURITY.md](SECURITY.md) | Security guidelines | All team |
| [../ENRICHMENT_STATUS.md](../ENRICHMENT_STATUS.md) | Active enrichment monitoring | Operations |

---

## Documentation by Category

### 📚 Development Guides
**[guides/](guides/)** - Complete guide collection with README index

**Getting Started**:
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [DIALOGUE_MANAGER_QUICKSTART.md](guides/DIALOGUE_MANAGER_QUICKSTART.md) - Conversation system
- [USER_TESTING_GUIDE.md](guides/USER_TESTING_GUIDE.md) - Manual testing

**Data Operations**:
- [COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md](guides/COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md) - 100-attribute enrichment
- [CUSTOMIZABLE_SOURCES_AND_INGESTION.md](guides/CUSTOMIZABLE_SOURCES_AND_INGESTION.md) - Product ingestion
- [EXPERIENCE_SOURCES_AND_INGESTION.md](guides/EXPERIENCE_SOURCES_AND_INGESTION.md) - Experience data
- [NEXT_PRODUCT_INGESTION_PLAN.md](guides/NEXT_PRODUCT_INGESTION_PLAN.md) - Future improvements

**Testing**:
- [TESTING_GUIDE.md](guides/TESTING_GUIDE.md) - Testing strategies
- [TESTING_GUIDE_E2E.md](guides/TESTING_GUIDE_E2E.md) - End-to-end tests
- [PERSONA_TESTING_FRAMEWORK.md](guides/PERSONA_TESTING_FRAMEWORK.md) - Persona testing

**Deployment & Operations**:
- [BATCHED_DEPLOYMENT.md](guides/BATCHED_DEPLOYMENT.md) - Gradual rollout
- [MONITORING.md](guides/MONITORING.md) - System monitoring

---

### 📋 Operational Runbooks
**[runbooks/](runbooks/)** - Step-by-step operational procedures with README index

**Available Runbooks**:
- [new-product-ingestion-subagents.md](runbooks/new-product-ingestion-subagents.md) - Product ingestion pipeline
- [hybrid-enrichment.md](runbooks/hybrid-enrichment.md) - Data enrichment procedures
- [maintenance.md](runbooks/maintenance.md) - System maintenance tasks

**Quick Reference**:
```bash
/ingest full --source "data/raw/products.json"  # Product ingestion
./scripts/monitor-enrichment.sh                  # Monitor enrichment
npm run env:check                                # System health check
```

---

### 📊 System Reports & Analysis
**[reports/](reports/)** - Comprehensive system metrics with README index

**Current Status**:
- [DATA_STATUS_CURRENT.md](reports/DATA_STATUS_CURRENT.md) - Latest data metrics
- [system-quality-report.md](reports/system-quality-report.md) - System quality overview

**Performance & Quality**:
- [AGENT_PERFORMANCE_ANALYSIS.md](reports/AGENT_PERFORMANCE_ANALYSIS.md) - Agent metrics & optimization
- [ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md](reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) - 99.7% coverage validation
- [ENRICHMENT_IMPACT_REPORT.md](reports/ENRICHMENT_IMPACT_REPORT.md) - Enrichment ROI analysis
- [ENRICHMENT_VERIFICATION_REPORT.md](reports/ENRICHMENT_VERIFICATION_REPORT.md) - Process validation

**Testing Results**:
- [TESTING_EXECUTIVE_SUMMARY.md](reports/TESTING_EXECUTIVE_SUMMARY.md) - Executive test summary
- [TEST_REPORT.md](reports/TEST_REPORT.md) - Detailed test results
- [TEST_SUMMARY.md](reports/TEST_SUMMARY.md) - Component test summary
- [USER_TESTING_REPORT.md](reports/USER_TESTING_REPORT.md) - Manual testing outcomes

---

### 🎨 Attribute System Documentation
**[attributes/](attributes/)** - 100-attribute LLM inference system

**Overview**:
- [README.md](attributes/README.md) - Complete attribute system guide
- [ATTRIBUTE_SYSTEM_V2_SUMMARY.md](attributes/ATTRIBUTE_SYSTEM_V2_SUMMARY.md) - Executive summary
- [COMPREHENSIVE_ATTRIBUTE_TAXONOMY.md](attributes/COMPREHENSIVE_ATTRIBUTE_TAXONOMY.md) - All 100 attributes

**Implementation**:
- [LLM_ATTRIBUTE_INFERENCE_QUICK_START.md](attributes/LLM_ATTRIBUTE_INFERENCE_QUICK_START.md) - Quick start
- [LLM_ATTRIBUTE_INFERENCE_IMPLEMENTATION.md](attributes/LLM_ATTRIBUTE_INFERENCE_IMPLEMENTATION.md) - Technical details
- [EXPANDED_ATTRIBUTES_IMPLEMENTATION.md](attributes/EXPANDED_ATTRIBUTES_IMPLEMENTATION.md) - Implementation guide

**Optimization**:
- [ATTRIBUTE_OPTIMIZATION_SUMMARY.md](attributes/ATTRIBUTE_OPTIMIZATION_SUMMARY.md) - Optimization overview
- [ATTRIBUTE_OPTIMIZATION_ANALYSIS.md](attributes/ATTRIBUTE_OPTIMIZATION_ANALYSIS.md) - 7 optimization strategies
- [ATTRIBUTE_OPTIMIZATION_RESULTS.md](attributes/ATTRIBUTE_OPTIMIZATION_RESULTS.md) - Before/after comparison
- [ATTRIBUTE_OPTIMIZATION_EXAMPLES.md](attributes/ATTRIBUTE_OPTIMIZATION_EXAMPLES.md) - Real examples

---

### ✅ Validation & Quality Reports
**[validation/](validation/)** - Comprehensive UX validation with README

**Validation Reports**:
- [README.md](validation/README.md) - Validation overview
- [USER_SIMULATOR_REPORT.md](validation/USER_SIMULATOR_REPORT.md) - UX validation (8.5/10 score)
- [TESTING_AGENT_REPORT.md](validation/TESTING_AGENT_REPORT.md) - Automated testing validation
- [EXECUTIVE_SUMMARY.md](validation/EXECUTIVE_SUMMARY.md) - Executive overview

**Dialogue Manager Validation**:
- [DIALOGUE_MANAGER_TEST_REPORT.md](validation/DIALOGUE_MANAGER_TEST_REPORT.md) - Test report
- [DIALOGUE_MANAGER_UX_VALIDATION_REPORT.md](validation/DIALOGUE_MANAGER_UX_VALIDATION_REPORT.md) - UX validation
- [DIALOGUE_MANAGER_EXECUTIVE_SUMMARY.md](validation/DIALOGUE_MANAGER_EXECUTIVE_SUMMARY.md) - Executive summary
- [DIALOGUE_MANAGER_METRICS_COMPARISON.md](validation/DIALOGUE_MANAGER_METRICS_COMPARISON.md) - Metrics comparison
- [DIALOGUE_MANAGER_ACTION_PLAN.md](validation/DIALOGUE_MANAGER_ACTION_PLAN.md) - Action plan

---

### 🔧 Quality Assurance
**[quality/](quality/)** - Quality testing and UX reports

**Reports**:
- [FRONTEND_UX_BUG_REPORT.md](quality/FRONTEND_UX_BUG_REPORT.md) - Known UX issues
- [FRONTEND_UX_QUALITY_REPORT.md](quality/FRONTEND_UX_QUALITY_REPORT.md) - UX quality assessment
- [QUALITY_IMPROVEMENTS.md](quality/QUALITY_IMPROVEMENTS.md) - Improvement tracking
- [QUALITY_TESTING_GUIDE.md](quality/QUALITY_TESTING_GUIDE.md) - QA strategies
- [UX_TEST_PLAN.md](quality/UX_TEST_PLAN.md) - Test planning
- [UX_TEST_RESULTS.md](quality/UX_TEST_RESULTS.md) - Test results

---

### 🎯 Specifications & Planning
**[specs/](specs/)** - Feature specifications

**Feature Specs**:
- [CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md](specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md) - UX improvements
- [GRAPH_COVERAGE_UX_PERFORMANCE_SPEC.md](specs/GRAPH_COVERAGE_UX_PERFORMANCE_SPEC.md) - Performance spec
- [PRIORITY_2_PHASE_1_QUICK_WINS_SPEC.md](specs/PRIORITY_2_PHASE_1_QUICK_WINS_SPEC.md) - Quick wins

---

### 🚀 Phase Documentation
**[phases/](phases/)** - Development phase tracking

**Completed Phases**:
- [PHASE_A_B_COMPLETE.md](phases/PHASE_A_B_COMPLETE.md) - Phase A & B completion
- [PHASE_C_DEPLOYING.md](phases/PHASE_C_DEPLOYING.md) - Phase C deployment

---

### 🔗 Relationships & Matching
**[relationships/](relationships/)** - Relationship system documentation

**Relationship Features**:
- [GIVER_RECIPIENT_IMPLEMENTATION.md](relationships/GIVER_RECIPIENT_IMPLEMENTATION.md) - Giver/recipient dynamics
- [VALUE_BASED_MATCHING.md](relationships/VALUE_BASED_MATCHING.md) - Value-based matching

---

### ⚡ Performance Optimization
**[performance/](performance/)** - Performance improvements

**Caching**:
- [cache/CACHE_IMPLEMENTATION_SUMMARY.md](performance/cache/CACHE_IMPLEMENTATION_SUMMARY.md) - Cache overview
- [cache/CACHE_USAGE_GUIDE.md](performance/cache/CACHE_USAGE_GUIDE.md) - Usage guide
- [cache/CACHING_IMPLEMENTATION.md](performance/cache/CACHING_IMPLEMENTATION.md) - Implementation details

**Agent Optimization**:
- [explorer/EXPLORER_PERFORMANCE_OPTIMIZATION.md](performance/explorer/EXPLORER_PERFORMANCE_OPTIMIZATION.md) - Explorer agent optimization

---

### 🐛 Issues & Tracking
**[issues/](issues/)** - Issue tracking and resolution

**Issue Documents**:
- [CONVERSATIONAL_UX_ISSUES.md](issues/CONVERSATIONAL_UX_ISSUES.md) - UX issue tracking
- [CONVERSATIONAL_UX_SUMMARY.md](issues/CONVERSATIONAL_UX_SUMMARY.md) - UX summary
- [DIALOGUE_MANAGER_BUGS.md](issues/DIALOGUE_MANAGER_BUGS.md) - Known bugs
- [GITHUB_COMMANDS.md](issues/GITHUB_COMMANDS.md) - GitHub workflow commands
- [PRIORITY_1_UX_IMPROVEMENTS_IMPLEMENTATION.md](issues/PRIORITY_1_UX_IMPROVEMENTS_IMPLEMENTATION.md) - Priority 1 fixes
- [PRIORITY_2_PHASE_1_ISSUES.md](issues/PRIORITY_2_PHASE_1_ISSUES.md) - Priority 2 issues
- [TECHNICAL_ENHANCEMENTS.md](issues/TECHNICAL_ENHANCEMENTS.md) - Technical improvements

---

### 👥 Contributor Documentation
**[contributor/](contributor/)** - Contribution guidelines

**Guidelines**:
- [AGENTS.md](contributor/AGENTS.md) - Repository workflow and standards

---

### 📦 Archive
**[archive/](archive/)** - Historical documentation with README index

**Archived Categories**:
- `implementations/` - Completed implementations
- `sessions/` - Development sessions
- `phase-ab/` - Phase A & B reports
- `agent-enhancements/` - Agent improvement history
- `improvements/` - System improvements
- `issues/` - Historical issues

See [archive/README.md](archive/README.md) for complete archive index.

---

## Additional Documentation

### Root-Level Documents
- [ENRICHMENT_QUICK_START.md](ENRICHMENT_QUICK_START.md) - Quick enrichment guide
- [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md) - System evolution
- [ENRICHMENT_BUG_FIXES.md](ENRICHMENT_BUG_FIXES.md) - Enrichment fixes
- [subagents-improvement-plan.md](subagents-improvement-plan.md) - Subagent improvements

### Review Documents
**[reviews/](reviews/)** - Code and implementation reviews

**Review Reports**:
- [DIALOGUE_MANAGER_IMPLEMENTATION_SUMMARY.md](reviews/DIALOGUE_MANAGER_IMPLEMENTATION_SUMMARY.md)
- [ENGINEERING_MANAGER_REVIEW.md](reviews/ENGINEERING_MANAGER_REVIEW.md)
- [ENGINEERING_MANAGER_TECHNICAL_REVIEW.md](reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md)
- [IMPLEMENTATION_SUMMARY.md](reviews/IMPLEMENTATION_SUMMARY.md)

---

## Quick Commands

### Development
```bash
npm run dev              # Start full stack
npm run chat             # CLI chat interface
npm run server           # Backend only
```

### Testing
```bash
npm test                           # Full test suite (190 tests)
npm run test:personas:quick        # Quick persona test
npm run test:real-users:easy       # Real user scenarios
```

### Data Operations
```bash
npm run env:check                  # Verify configuration
npm run setup:schema               # Initialize database
npm run ingest:products            # Load products
npm run attributes:status          # Check coverage
```

### Enrichment
```bash
./scripts/monitor-enrichment.sh                # Real-time monitoring
npx tsx scripts/analyze-product-stats.ts       # Database stats
./scripts/run-enrichment-with-retry.sh         # Start enrichment
```

---

## Current Status (December 8, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| Products | 88,674 | ✅ |
| Interest Coverage | 99.3% (88,053 products) | ✅ |
| Occasion Coverage | 84.6% (75,060 products) | ✅ |
| Attribute Coverage | 53.2% (47,139 products) | ⚡ **ENRICHING** |
| Tests | 190/190 passing | ✅ |
| Agent Quality | 7/10 average | 🎯 Target: 8/10 |

**Active enrichment in progress** - Monitor: `./scripts/monitor-enrichment.sh`

---

## Documentation Quick Links

### For New Developers
1. [QUICKSTART.md](QUICKSTART.md) - Setup in 5 minutes
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand the system
3. [API.md](API.md) - API reference
4. [USER_TESTING_GUIDE.md](guides/USER_TESTING_GUIDE.md) - Test the system

### For Operations
1. [runbooks/](runbooks/) - Operational procedures
2. [reports/DATA_STATUS_CURRENT.md](reports/DATA_STATUS_CURRENT.md) - Current metrics
3. [../ENRICHMENT_STATUS.md](../ENRICHMENT_STATUS.md) - Live enrichment status
4. [MONITORING.md](guides/MONITORING.md) - Monitoring setup

### For Product/QA
1. [reports/TESTING_EXECUTIVE_SUMMARY.md](reports/TESTING_EXECUTIVE_SUMMARY.md) - Quality overview
2. [validation/](validation/) - Validation reports
3. [quality/](quality/) - Quality assessments
4. [PERSONA_TESTING_FRAMEWORK.md](guides/PERSONA_TESTING_FRAMEWORK.md) - Automated testing

### For Data Team
1. [attributes/](attributes/) - Attribute system
2. [COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md](guides/COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md) - Enrichment guide
3. [reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md](reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) - Quality metrics
4. [runbooks/hybrid-enrichment.md](runbooks/hybrid-enrichment.md) - Enrichment procedures

---

## Navigation

- **[Main README](../README.md)** - Project overview and setup
- **[.claude/README.md](../.claude/README.md)** - Claude Code configuration
- **[Frontend README](../frontend/README.md)** - Frontend documentation

---

**Version**: 2.4.0 - Enrichment Automation
**Last Updated**: December 8, 2025
**Maintainers**: Present-Agent2 Team
