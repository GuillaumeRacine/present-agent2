# GitHub-First Development Workflow

**IMPORTANT:** All code development MUST go through GitHub issues. No code is written without an approved issue.

## 🎯 Core Principle

```
NO CODE WITHOUT ISSUE → NO ISSUE WITHOUT SPEC → NO SPEC WITHOUT RESEARCH
```

Every line of code must be traceable back to:
1. A GitHub issue (implementation task)
2. An approved feature spec
3. Validated product research

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. RESEARCH (if needed)                                     │
│     Product Manager creates Research Spike issue            │
│     → Investigates, documents findings                      │
│     → Comment: /research-complete                           │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  2. FEATURE SPEC                                             │
│     Product Manager creates Feature Spec issue              │
│     → Defines requirements, metrics, acceptance criteria    │
│     → Tickets Manager reviews: /reviewed-by tickets-manager │
│     → Engineering Manager reviews: /reviewed-by eng-manager │
│     → Final approval: /approved                             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  3. TASK BREAKDOWN                                           │
│     Tickets Manager creates Implementation Task issues      │
│     → One issue per logical component                       │
│     → Links to parent spec                                  │
│     → Sets dependencies and priorities                      │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. TECHNICAL REVIEW                                         │
│     Engineering Manager reviews each Implementation Task    │
│     → Adds architecture guidance                            │
│     → Defines interfaces and contracts                      │
│     → Specifies logging and testing requirements            │
│     → Comment: /eng-review-complete                         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  5. PRE-CODE REVIEW                                          │
│     Coding Agent reviews issue BEFORE writing ANY code      │
│     → Reads full issue and linked specs                    │
│     → Asks clarifying questions in comments                 │
│     → Confirms understanding                                │
│     → Comment: /ready-to-code                               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  6. IMPLEMENTATION                                           │
│     Coding Agent implements ONLY after /ready-to-code       │
│     → Follows architecture guidance                         │
│     → Implements all requirements                           │
│     → Adds logging and error handling                       │
│     → Writes unit tests                                     │
│     → Comment: /code-complete                               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  7. TESTING & QA                                             │
│     Testing Agent reviews implementation                    │
│     → Runs all tests                                        │
│     → Verifies edge cases                                   │
│     → If bugs found: Create Bug Report issue                │
│     → If bugs: Back to step 6                               │
│     → If pass: Comment /testing-complete                    │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  8. UX VALIDATION                                            │
│     User Simulation Agent validates                         │
│     → Tests with personas                                   │
│     → Measures success metrics                              │
│     → Validates assumptions                                 │
│     → Comment: /ux-validated                                │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  9. DONE                                                     │
│     → All checkboxes marked                                 │
│     → Comment: /done                                        │
│     → Issue closed ✅                                        │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Issue Structure

### **RECOMMENDED: Single Tracking Issue per Feature**

For better workflow visibility, use **ONE issue per feature** with all agent collaboration in comments.

### Master Tracking Issue (`[FEATURE]`)
**When:** Starting any new feature
**Who creates:** Product Manager
**Purpose:** Complete workflow tracking in one place

**Structure:**
```bash
# Create master tracking issue
gh issue create --title "[FEATURE] Feature Name - Full Implementation"

# All agent outputs go as comments:
# 1. Product Manager: Research findings
# 2. Product Manager: Feature spec
# 3. Tickets Manager: Review + task breakdown
# 4. Engineering Manager: Technical review + approval
# 5. Engineering Manager: Phase-by-phase technical specs
# 6. Coding Agent: Ready-to-code confirmations
# 7. Coding Agent: Implementation progress updates
# 8. Testing Agent: Test results
# 9. User Simulation: UX validation
```

**Benefits:**
- ✅ Complete timeline in one place
- ✅ Easy to follow agent workflow
- ✅ All context visible at a glance
- ✅ Simpler to track progress

### Alternative: Separate Issues (for very complex features)

Only use separate issues when feature is so complex it needs multiple independent tracking threads.

### 1. Research Spike (if using separate issues)
**When:** Technical or product unknowns need investigation
**Who creates:** Product Manager or Engineering Manager

**Workflow:**
```bash
gh issue create --template implementation-task.md --title "[IMPL] Task Name"
# Engineering Manager reviews and adds technical details
gh issue comment [#] --body "/eng-review-complete"
# Coding Agent confirms understanding
gh issue comment [#] --body "/ready-to-code"
# Implementation happens
gh issue comment [#] --body "/code-complete"
# Testing
gh issue comment [#] --body "/testing-complete"
# UX validation
gh issue comment [#] --body "/ux-validated"
# Done
gh issue comment [#] --body "/done"
gh issue close [#]
```

### 4. Bug Report (`[BUG]`)
**When:** Testing Agent finds a bug
**Who creates:** Testing Agent
**Labels:** `bug`, `needs-investigation`

**Workflow:**
```bash
gh issue create --template bug-report.md --title "[BUG] Issue Description"
# Investigation
gh issue comment [#] --body "/investigated"
# Fix
gh issue comment [#] --body "/fix-ready"
# Verification
gh issue comment [#] --body "/verified"
# Close
gh issue comment [#] --body "/bug-fixed"
gh issue close [#]
```

## 🚫 Code Approval Gates

### Gate 1: No Code Without Approved Issue
❌ **BLOCKED:** Coding Agent tries to write code
✅ **ALLOWED:** Only after issue has `/eng-review-complete` AND `/ready-to-code`

### Gate 2: No Issue Without Reviewed Spec
❌ **BLOCKED:** Creating implementation task
✅ **ALLOWED:** Only after spec has `/approved`

### Gate 3: No Spec Without Research (if needed)
❌ **BLOCKED:** Creating spec for unknown area
✅ **ALLOWED:** Only after research spike is `/research-complete`

## 🤖 Agent Responsibilities

### Product Manager
**Creates:**
- Research Spike issues (when needed)
- Feature Spec issues

**Reviews:**
- None (creates specs for others to review)

**GitHub Commands:**
```bash
# Create research spike
gh issue create -t research-spike.md -l research,spike

# Create feature spec
gh issue create -t feature-spec.md -l spec,needs-review

# Mark research complete
gh issue comment [#] -b "/research-complete"
```

### Tickets Manager
**Creates:**
- Implementation Task issues (from approved specs)

**Reviews:**
- Feature Spec issues

**GitHub Commands:**
```bash
# Review spec
gh issue comment [#] -b "/reviewed-by tickets-manager

[Detailed review comments]"

# Create implementation tasks
gh issue create -t implementation-task.md -l implementation,needs-eng-review

# Link to spec
gh issue comment [#] -b "Implements #[spec-number]"
```

### Engineering Manager
**Creates:**
- Research Spike issues (for technical unknowns)

**Reviews:**
- Feature Spec issues
- Implementation Task issues (adds technical details)

**GitHub Commands:**
```bash
# Review spec
gh issue comment [#] -b "/reviewed-by engineering-manager

[Technical concerns/approval]"

# Complete technical review of implementation task
gh issue comment [#] -b "/eng-review-complete

## Technical Review Added
- Architecture guidance
- Interfaces defined
- Logging requirements
- Testing requirements"

# Approve spec
gh issue comment [#] -b "/approved - Ready for implementation"
```

### Coding Agent (Architect)
**Creates:**
- Nothing (only implements from issues)

**Reviews:**
- Implementation Task issues (before coding)

**GitHub Commands:**
```bash
# Read issue before coding
gh issue view [#]

# Ask clarifying questions
gh issue comment [#] -b "Question: [specific question about requirement]"

# Confirm ready to code
gh issue comment [#] -b "/ready-to-code

I understand:
- [Requirement 1]
- [Requirement 2]
- [Architecture approach]"

# Mark code complete
gh issue comment [#] -b "/code-complete

Implemented:
- [Component 1] in src/path/file.ts
- [Component 2] in src/path/file2.ts
- Unit tests in src/__tests__/
- Logging added for [events]"
```

### Testing Agent
**Creates:**
- Bug Report issues

**Reviews:**
- Implementation Task issues (after code complete)

**GitHub Commands:**
```bash
# Create bug report
gh issue create -t bug-report.md -l bug,critical

# Mark testing complete
gh issue comment [#] -b "/testing-complete

Test Results:
✅ Unit tests: 15/15 passing
✅ Integration tests: 5/5 passing
✅ Edge cases: All handled
✅ Logging: Verified
⏱️ Performance: 1.8s avg (target < 2s)"

# Mark bug investigated
gh issue comment [#] -b "/investigated

Root cause: [description]
Fix required in: [files]"

# Verify bug fix
gh issue comment [#] -b "/verified

Original issue no longer reproduces.
No regressions detected."
```

### User Simulation Agent
**Creates:**
- Nothing (provides UX feedback on implementation issues)

**Reviews:**
- Implementation Task issues (final validation)

**GitHub Commands:**
```bash
# Mark UX validated
gh issue comment [#] -b "/ux-validated

## Test Results
Tested with personas: Sarah, Mike, Lisa

Metrics:
- Relevance: 8.5/10 ✅
- Rationale Quality: 8/10 ✅
- User Experience: 9/10 ✅

Product assumptions validated:
✅ Assumption 1
✅ Assumption 2"
```

## 📊 Issue States & Labels

### Labels
- `spec` - Feature specification
- `implementation` - Implementation task
- `bug` - Bug report
- `research` - Research spike
- `needs-review` - Awaiting review
- `needs-eng-review` - Awaiting engineering manager
- `ready` - Ready for coding
- `in-progress` - Being worked on
- `testing` - In QA
- `blocked` - Waiting on dependency

### Workflow States (via comments)
- `/reviewed-by [agent]` - Agent has reviewed
- `/approved` - Spec approved for implementation
- `/eng-review-complete` - Technical review complete
- `/ready-to-code` - Coding agent ready to implement
- `/code-complete` - Implementation finished
- `/testing-complete` - QA passed
- `/ux-validated` - User experience validated
- `/done` - All criteria met, ready to close

## 🔍 Enforcing the Workflow

### Pre-Code Hook
A hook will check before any code is written:

```bash
# .claude/hooks/pre-code-check.sh
# Ensures there's an approved issue for any code changes
```

### Agent Instructions
All coding agents are instructed:
1. Read issue FIRST
2. Ask questions in comments
3. Confirm understanding with `/ready-to-code`
4. ONLY THEN start coding
5. Update issue throughout implementation
6. Mark `/code-complete` when done

## 📈 Benefits

### Traceability
- Every line of code → GitHub issue
- Every issue → Feature spec
- Every spec → Product research
- Complete audit trail

### Quality
- Multiple review stages
- Technical review before coding
- Testing before UX validation
- No shortcuts possible

### Collaboration
- All discussion in issue comments
- Agents collaborate asynchronously
- Clear handoffs between stages
- Transparent decision-making

### Visibility
- See all work in GitHub Issues
- Track progress with labels
- Measure cycle time
- Identify bottlenecks

## 🚀 Quick Start

### Start New Feature
```bash
# 1. Product Manager creates spec
"Use the product-manager agent to create a GitHub issue spec for [feature]"

# 2. Review process
"Use the tickets-manager agent to review spec issue #X"
"Use the engineering-manager agent to review spec issue #X"

# 3. Approve
"Use the engineering-manager agent to approve spec #X"

# 4. Create tasks
"Use the tickets-manager agent to create implementation issues from spec #X"

# 5. Technical review
"Use the engineering-manager agent to review and enhance issue #Y"

# 6. Implement
"Use the coding agent to implement issue #Y"

# 7. Test
"Use the testing-agent to verify issue #Y"

# 8. Validate
"Use the user-simulator agent to validate issue #Y"
```

### Check Status
```bash
# See all open issues
gh issue list

# See specific issue
gh issue view [#]

# See issue comments
gh issue view [#] --comments
```

## 📚 Next Steps

See [`GITHUB_AGENT_GUIDE.md`](GITHUB_AGENT_GUIDE.md) for detailed agent-by-agent instructions on using GitHub issues.
