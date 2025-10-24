# Claude Code Agent Quick Reference

Quick commands and examples for using the Present-Agent2 multi-agent system.

## 🚀 Quick Start

### Run Full Workflow
```
Build the recommendation engine using the full agent workflow
```

### Single Agent Commands
```
Use the product-manager agent to research [feature]
Use the tickets-manager agent to create issues for [feature]
Use the engineering-manager agent to review issue #5
Use the architect agent to implement [feature]
Use the testing-agent to test [component]
Use the user-simulator agent to validate [feature]
```

## 📝 Agent Quick Reference

| Agent | Use When | Command Example |
|-------|----------|-----------------|
| **Product Manager** | Need feature spec | `Use the product-manager agent to spec out the recommendation scoring algorithm` |
| **Tickets Manager** | Need GitHub issues | `Use the tickets-manager agent to create issues from the feature spec` |
| **Engineering Manager** | Need technical review | `Use the engineering-manager agent to review and enhance issue #10` |
| **Architect** (Coding) | Need implementation | `Use the architect agent to build the Neo4j data ingestion pipeline` |
| **Testing Agent** | Need QA/debugging | `Use the testing-agent to verify the recommendation engine works correctly` |
| **User Simulator** | Need UX validation | `Use the user-simulator agent to test recommendations with realistic personas` |

## 🔄 Common Workflows

### New Feature (Full Cycle)
```
1. Use the product-manager agent to research and spec [feature name]
2. Use the tickets-manager agent to create GitHub issues
3. Use the engineering-manager agent to review the issues
4. Use the architect agent to implement
5. Use the testing-agent to test and verify
6. Use the user-simulator agent to validate experience
```

### Bug Fix
```
1. Use the testing-agent to investigate bug #[number]
2. Use the architect agent to fix the issue
3. Use the testing-agent to verify the fix
```

### Technical Spike
```
1. Use the engineering-manager agent to research [technical approach]
2. Use the architect agent to build a proof of concept
3. Use the testing-agent to validate it works
```

### UX Improvement
```
1. Use the user-simulator agent to identify UX issues in [feature]
2. Use the product-manager agent to propose improvements
3. [Follow full workflow for implementation]
```

## 📊 Project Context

### Current Phase
**Building:** Core recommendation engine prototype
**Priority:** Recommendation quality + observability

### Technology Stack
- **Database:** Neo4j (graph + vector)
- **Language:** TypeScript (strict mode)
- **Embeddings:** OpenAI
- **Re-ranking:** Cohere
- **Testing:** CLI-based with logging

### Data Available
- 41,686 products
- 105,731 facets
- 27 categories

## 🎯 Common Tasks

### Start New Feature
```
Use the product-manager agent to research and create a spec for [feature name].
Consider the product vision in product_vision.md and validate these assumptions:
- [assumption 1]
- [assumption 2]
```

### Review & Implement Issue
```
Use the engineering-manager agent to review issue #X, then have the architect
agent implement it with full logging and tests.
```

### Test Everything
```
Use the testing-agent to run all tests for [component], then use the
user-simulator agent to validate with personas: Sarah, Mike, and Lisa.
```

### Debug Issue
```
Use the testing-agent to investigate why [specific behavior] is happening.
Check logs, trace execution, and identify root cause.
```

## 💡 Pro Tips

1. **Chain agents in one command:**
   ```
   Use product-manager to spec, tickets-manager to create issues,
   and engineering-manager to review for [feature]
   ```

2. **Reference existing work:**
   ```
   Use the architect agent to implement issue #5, following the
   patterns established in [existing file]
   ```

3. **Specify quality requirements:**
   ```
   Use the architect agent to build [feature] with extensive logging,
   edge case handling, and unit tests for all components
   ```

4. **Request specific personas:**
   ```
   Use the user-simulator agent to test with personas: Sarah (thoughtful
   planner) and Mike (last-minute gifter)
   ```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `product_vision.md` | Product requirements and assumptions |
| `AGENTS.md` | Detailed agent documentation |
| `.claude/WORKFLOW.md` | Complete workflow guide |
| `.claude/agents/[agent].md` | Individual agent instructions |
| `.claude/PROJECT_CONTEXT.md` | Current project status |

## 🔍 Finding Information

### Check Project Status
```
What's the current status of the project? Check PROJECT_CONTEXT.md
```

### See Available Agents
```
List all available agents and their roles
```

### Review Workflow
```
Explain the agent workflow for building a new feature
```

## 🛠️ Development Commands

### Setup & Installation
```
Use the architect agent to set up the development environment
```

### Run Tests
```
Use the testing-agent to run all unit and integration tests
```

### Build CLI
```
Use the architect agent to build the CLI testing interface with
extensive logging for debugging
```

### Generate Documentation
```
Use the architect agent to update documentation for [component]
```

## 📈 Measuring Success

### Track Metrics
```
Use the user-simulator agent to measure these metrics:
- Recommendation relevance score
- Time to first recommendation
- User satisfaction rating
- Confidence score accuracy
```

### Validate Assumptions
```
Use the user-simulator agent to validate the assumption that
[specific product assumption from product_vision.md]
```

## 🚨 When Things Go Wrong

### Implementation Issues
```
Use the testing-agent to debug [specific issue]
```

### Architecture Concerns
```
Use the engineering-manager agent to review the architecture
for [component] and suggest improvements
```

### UX Problems
```
Use the user-simulator agent to identify UX issues, then use
the product-manager agent to propose solutions
```

## ⚡ Speed Commands

Ultra-quick commands for common tasks:

```bash
# Full build
"Build recommendation engine - full workflow"

# Quick implement
"Implement issue #5"

# Quick test
"Test recommendations"

# Quick debug
"Debug why recommendations are slow"

# Quick validate
"Validate UX for gift recommendations"
```

## 🎓 Learning More

- Read [`AGENTS.md`](AGENTS.md) for detailed agent documentation
- Read [`.claude/WORKFLOW.md`](.claude/WORKFLOW.md) for workflow details
- Read [`product_vision.md`](product_vision.md) for product context
- Check individual agent files in `.claude/agents/` for specifics

## 🎉 Getting Started

**First time?** Try this:

```
Use the product-manager agent to review product_vision.md and create
a feature spec for the core recommendation engine. Then use the
tickets-manager to break it into GitHub issues.
```

**Ready to code?** Try this:

```
Use the engineering-manager agent to review the issues, then use the
architect agent to start implementing the data ingestion pipeline.
```

**Want to test?** Try this:

```
Use the user-simulator agent to test current recommendations with
all personas and report on quality.
```

---

**Need help?** Just ask: "How do I [specific task] using the agents?"

The agent system is here to help you build better, faster! 🚀
