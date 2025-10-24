# 🎉 GitHub-First Workflow Complete!

Your Present-Agent2 project now enforces a **GitHub-first development workflow** where all code must go through approved issues with full agent collaboration.

## ✅ What's Been Set Up

### 📝 GitHub Issue Templates (`.github/ISSUE_TEMPLATE/`)
1. **`feature-spec.md`** - Product specifications with review checkboxes
2. **`implementation-task.md`** - Implementation tasks with technical review
3. **`bug-report.md`** - Bug reports with investigation workflow
4. **`research-spike.md`** - Research and technical spikes

### 📚 Complete Documentation
| File | Purpose |
|------|---------|
| `.claude/GITHUB_WORKFLOW.md` | Complete workflow with all stages |
| `.claude/GITHUB_AGENT_GUIDE.md` | Quick command reference for agents |
| Updated `architect.md` | Coding agent now requires approved issues |

### 🔒 Workflow Enforcement

**The Golden Rule:**
```
NO CODE WITHOUT APPROVED GITHUB ISSUE
```

Every agent now follows GitHub-first workflow:
- ✅ Product Manager creates specs in issues
- ✅ Tickets Manager creates implementation tasks
- ✅ Engineering Manager reviews via comments
- ✅ **Coding Agent MUST read issue before ANY code**
- ✅ Testing Agent creates bug reports as issues
- ✅ User Simulation validates in issue comments

## 🔄 How It Works

### 1. Research Phase (Optional)
```bash
Product Manager creates: [RESEARCH] issue
→ Investigates and documents findings
→ Comments: /research-complete
```

### 2. Specification Phase
```bash
Product Manager creates: [SPEC] issue
→ Tickets Manager reviews: /reviewed-by tickets-manager
→ Engineering Manager reviews: /reviewed-by engineering-manager
→ Approval: /approved
```

### 3. Task Creation
```bash
Tickets Manager creates: [IMPL] issues (one per component)
→ Links to spec and dependencies
→ Sets priorities
```

### 4. Technical Review
```bash
Engineering Manager reviews [IMPL] issue
→ Adds architecture guidance
→ Defines interfaces and data models
→ Specifies logging and testing
→ Comments: /eng-review-complete
```

### 5. Pre-Code Review 🚨 **NEW REQUIREMENT**
```bash
Coding Agent MUST:
1. Read issue: gh issue view [#] --comments
2. Verify /eng-review-complete exists
3. Ask questions if anything unclear
4. Confirm: /ready-to-code
```

### 6. Implementation
```bash
Coding Agent implements (ONLY after /ready-to-code)
→ Follows all technical guidance
→ Adds logging and tests
→ Comments: /code-complete
```

### 7. Testing
```bash
Testing Agent verifies
→ Runs all tests
→ If bugs: Creates [BUG] issues
→ If pass: Comments /testing-complete
```

### 8. UX Validation
```bash
User Simulation Agent validates
→ Tests with personas
→ Measures metrics
→ Comments: /ux-validated
→ Comments: /done and closes issue ✅
```

## 🚨 Critical: Coding Agent Rules

### BEFORE ANY CODE:

**MUST DO:**
1. ✅ `gh issue view [#] --comments` - Read full issue
2. ✅ Verify `/eng-review-complete` exists in comments
3. ✅ Ask questions in comments if unclear
4. ✅ Comment `/ready-to-code` with understanding

**NEVER:**
- ❌ Write code without reading issue
- ❌ Code without `/eng-review-complete`
- ❌ Skip `/ready-to-code` confirmation
- ❌ Implement features not in issue

### Example Session:

```
User: "Build the recommendation engine"

❌ WRONG (Old Way):
Coding Agent: [Starts writing code immediately]

✅ CORRECT (GitHub-First):
Product Manager: Creates issue #10 [SPEC] Recommendation Engine
Tickets Manager: Reviews #10, comments /reviewed-by tickets-manager
Engineering Manager: Reviews #10, comments /approved
Tickets Manager: Creates issues #11-14 for implementation
Engineering Manager: Reviews #11, adds technical details, comments /eng-review-complete
Coding Agent:
  1. gh issue view 11 --comments
  2. Reads full issue and tech guidance
  3. Comments "Question: Should I use class or functions?"
  4. Engineering Manager answers
  5. Comments "/ready-to-code - I understand all requirements"
  6. NOW implements code
  7. Comments "/code-complete"
Testing Agent: Tests, comments /testing-complete
User Simulation: Validates, comments /ux-validated, /done, closes #11
```

## 🎯 Benefits

### Full Traceability
```
Code file → Issue #11 → Spec #10 → Research #9
```
Every line of code traces back to product decisions.

### Quality Gates
- ✅ Product Manager validates requirements
- ✅ Tickets Manager validates task breakdown
- ✅ Engineering Manager validates technical approach
- ✅ Coding Agent confirms understanding
- ✅ Testing Agent validates quality
- ✅ User Simulation validates experience

### Collaboration
All agents collaborate asynchronously in issue comments:
- Questions and answers documented
- Decisions traceable
- Progress visible
- Handoffs explicit

### No Surprises
All work visible in GitHub:
```bash
gh issue list  # See everything
```

## 🚀 Quick Start Commands

### See All Work
```bash
gh issue list
```

### Product Manager: Start New Feature
```
Use the product-manager agent to create a GitHub issue spec
for the recommendation engine
```

### Tickets Manager: Create Tasks
```
Use the tickets-manager agent to create implementation issues
from spec #10
```

### Engineering Manager: Review
```
Use the engineering-manager agent to review and add technical
details to issue #11
```

### Coding Agent: Implement
```
Use the architect agent to implement issue #11
```
(Agent will automatically read issue, confirm understanding, then code)

### Testing Agent: Test
```
Use the testing-agent to verify issue #11
```

### User Simulation: Validate
```
Use the user-simulator agent to validate issue #11 with all personas
```

## 📊 Monitoring Progress

```bash
# See specs needing review
gh issue list -l spec,needs-review

# See tasks ready for coding
gh issue list -l implementation,ready

# See work in progress
gh issue list -l in-progress

# See completed work
gh issue list --state closed

# See specific issue
gh issue view [#] --comments
```

## 📖 Documentation

| File | Purpose |
|------|---------|
| `.claude/GITHUB_WORKFLOW.md` | Complete workflow guide (READ THIS FIRST) |
| `.claude/GITHUB_AGENT_GUIDE.md` | Quick command reference |
| `.github/ISSUE_TEMPLATE/` | Issue templates (4 types) |
| `architect.md` (updated) | Coding agent GitHub requirements |

## 💡 Example: Full Feature Development

**Goal:** Build recommendation engine

```bash
# 1. Create spec
"Use product-manager agent to create GitHub spec for recommendation engine"
# → Creates issue #10

# 2. Review process
"Use tickets-manager to review spec #10"
# → Comments /reviewed-by tickets-manager

"Use engineering-manager to review spec #10"
# → Comments /reviewed-by engineering-manager
# → Comments /approved

# 3. Break into tasks
"Use tickets-manager to create implementation issues from spec #10"
# → Creates issues #11, #12, #13, #14

# 4. Technical review first task
"Use engineering-manager to review issue #11"
# → Adds architecture, interfaces, logging requirements
# → Comments /eng-review-complete

# 5. Implement
"Use architect agent to implement issue #11"
# → Reads issue automatically
# → Asks questions if needed
# → Comments /ready-to-code
# → Implements code
# → Comments /code-complete

# 6. Test
"Use testing-agent to test issue #11"
# → Runs tests, verifies
# → Comments /testing-complete

# 7. Validate
"Use user-simulator to validate issue #11"
# → Tests with personas
# → Comments /ux-validated
# → Comments /done
# → Closes issue

# Repeat steps 4-7 for issues #12, #13, #14
# Feature complete! All tracked in GitHub ✅
```

## 🎓 Learning the Workflow

### First Time?
1. Read: `.claude/GITHUB_WORKFLOW.md` (comprehensive guide)
2. Try: Create a simple spec issue
3. Walk through: Complete workflow for one feature
4. Reference: `.claude/GITHUB_AGENT_GUIDE.md` for quick commands

### Key Concepts
- **Spec → Tasks → Implementation** (always this flow)
- **Multiple reviews before code** (quality gates)
- **All collaboration in issues** (async, traceable)
- **No code without approval** (enforced)

## ⚡ What Makes This Powerful

### Traditional Approach
```
User: "Build feature"
Claude: [Writes code]
Result: Code with unclear requirements, no traceability
```

### GitHub-First Approach
```
User: "Build feature"
PM: [Creates spec #10 with requirements]
TM: [Reviews, breaks into tasks #11-14]
EM: [Reviews #11, adds architecture]
Architect: [Reads #11, confirms, implements]
Testing: [Verifies, reports results]
UX: [Validates, measures metrics]
Result: Production-quality code with full traceability ✅
```

## 🔒 Enforcement

The **Coding Agent** now has hard requirements:
1. Cannot code without reading issue
2. Cannot code without `/eng-review-complete`
3. Must comment `/ready-to-code` first
4. Must comment `/code-complete` after

This is **enforced in the agent instructions** - the agent will refuse to code without following the workflow.

## 🎉 You're Ready!

Your development workflow is now:
- ✅ Fully traceable through GitHub
- ✅ Quality-gated at every stage
- ✅ Collaborative across agents
- ✅ Enforced (no shortcuts possible)

**Try it now:**
```
Use the product-manager agent to create a GitHub spec issue for
building the Neo4j data ingestion pipeline
```

The agents will handle everything through GitHub issues! 🚀

---

**Questions?**
- Read `.claude/GITHUB_WORKFLOW.md` for complete guide
- Check `.claude/GITHUB_AGENT_GUIDE.md` for quick commands
- Ask: "How does the GitHub workflow work?"
