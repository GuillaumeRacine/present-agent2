# GitHub Agent Integration Guide

Complete guide for agents to use GitHub issues for all development work.

## 🎯 Core Rules

1. **NO CODE WITHOUT ISSUE** - Coding Agent cannot write code without approved GitHub issue
2. **NO ISSUE WITHOUT SPEC** - Implementation tasks require approved feature spec
3. **ALL COLLABORATION IN ISSUES** - Research, review, questions happen in issue comments
4. **AGENTS USE `gh` CLI** - All GitHub interactions through GitHub CLI commands

## 🤖 Quick Command Reference

### Product Manager
```bash
# Create research spike
gh issue create -t "[RESEARCH] Topic" -l research,spike

# Create feature spec
gh issue create -t "[SPEC] Feature" -l spec,needs-review

# Mark research complete
gh issue comment [#] -b "/research-complete"
```

### Tickets Manager
```bash
# Review spec
gh issue comment [#] -b "/reviewed-by tickets-manager"

# Create implementation task
gh issue create -t "[IMPL] Task" -l implementation,needs-eng-review

# Link issues
gh issue comment [#] -b "Implements #[spec] Depends on #[other]"
```

### Engineering Manager
```bash
# Review spec
gh issue comment [#] -b "/reviewed-by engineering-manager"

# Approve spec
gh issue comment [#] -b "/approved"

# Complete technical review
gh issue comment [#] -b "/eng-review-complete

[Technical details added]"
```

### Coding Agent
```bash
# MUST read issue first
gh issue view [#] --comments

# Ask questions if unclear
gh issue comment [#] -b "Question: [question]"

# Confirm ready
gh issue comment [#] -b "/ready-to-code"

# Mark complete
gh issue comment [#] -b "/code-complete"
```

### Testing Agent
```bash
# Create bug report
gh issue create -t "[BUG] Description" -l bug,critical

# Mark testing complete
gh issue comment [#] -b "/testing-complete"

# Mark bug investigated
gh issue comment [#] -b "/investigated"

# Verify bug fix
gh issue comment [#] -b "/verified"
```

### User Simulation Agent
```bash
# Mark UX validated
gh issue comment [#] -b "/ux-validated"

# Mark done
gh issue comment [#] -b "/done"
gh issue close [#]
```

## 🔄 Complete Workflow Example

```bash
# 1. PM creates spec
gh issue create -t "[SPEC] Recommendation Engine" -l spec,needs-review
# → Issue #10

# 2. TM reviews
gh issue comment 10 -b "/reviewed-by tickets-manager"

# 3. EM reviews & approves
gh issue comment 10 -b "/reviewed-by engineering-manager"
gh issue comment 10 -b "/approved"

# 4. TM creates tasks
gh issue create -t "[IMPL] Neo4j Schema" -l implementation,needs-eng-review
# → Issue #11

# 5. EM reviews task
gh issue comment 11 -b "/eng-review-complete [details]"

# 6. Coding agent implements
gh issue view 11 --comments
gh issue comment 11 -b "/ready-to-code"
# ... code ...
gh issue comment 11 -b "/code-complete"

# 7. Testing agent tests
gh issue comment 11 -b "/testing-complete"

# 8. User simulation validates
gh issue comment 11 -b "/ux-validated"
gh issue comment 11 -b "/done"
gh issue close 11
```

## 📋 Issue Templates

All templates are in `.github/ISSUE_TEMPLATE/`:
- `feature-spec.md` - Feature specifications
- `implementation-task.md` - Implementation tasks
- `bug-report.md` - Bug reports
- `research-spike.md` - Research spikes

## 🚨 Coding Agent Rules

**BEFORE ANY CODE:**
1. ✅ Read issue with `gh issue view [#] --comments`
2. ✅ Verify `/eng-review-complete` exists
3. ✅ Ask questions if unclear
4. ✅ Comment `/ready-to-code`

**NEVER:**
- ❌ Code without reading issue
- ❌ Code without `/eng-review-complete`
- ❌ Skip `/ready-to-code` confirmation
- ❌ Implement features not in issue

## 🔍 Monitoring

```bash
# All open work
gh issue list

# Specs needing review
gh issue list -l spec,needs-review

# Tasks ready for coding
gh issue list -l implementation,ready

# In testing
gh issue list -l testing

# Bugs
gh issue list -l bug

# Completed work
gh issue list --state closed
```

## 📖 Full Documentation

See [`.claude/GITHUB_WORKFLOW.md`](.claude/GITHUB_WORKFLOW.md) for complete workflow documentation with detailed examples for each agent.

## 🚀 Start Using

```
Use the product-manager agent to create a GitHub spec issue for [feature]
```

All development will flow through GitHub issues with complete traceability!
