# GitHub Commands for Conversational UX Issues

Quick reference for managing the Conversational UX Improvement issues.

---

## Creating Issues

### Create All Issues at Once
```bash
cd /Volumes/Crucial\ X8/Code/Present-Agent2
./scripts/create-conversational-ux-issues.sh
```

### Create Individual Issue
```bash
# Example: Issue #1
gh issue create \
  --title "Core DialogueManager Agent Implementation" \
  --label "P0,size:L,agent,core-feature" \
  --body "$(cat docs/issues/CONVERSATIONAL_UX_ISSUES.md | sed -n '/^## Issue #1/,/^## Issue #2/p')"
```

---

## Viewing Issues

### List All Issues
```bash
gh issue list --label "core-feature"
```

### List by Priority
```bash
# P0 (Critical)
gh issue list --label "P0"

# P1 (High)
gh issue list --label "P1"

# P2 (Medium)
gh issue list --label "P2"
```

### List by Size
```bash
# Large tasks
gh issue list --label "size:L"

# Extra large tasks
gh issue list --label "size:XL"
```

### List by Phase
```bash
# Phase 1: Backend
gh issue list --label "P0"

# Phase 2: Frontend
gh issue list --label "frontend"

# Phase 3: Testing
gh issue list --label "testing"
```

---

## Managing Issues

### View Issue Details
```bash
# By issue number
gh issue view 123

# With comments
gh issue view 123 --comments
```

### Assign Issue
```bash
# Assign to yourself
gh issue edit 123 --add-assignee @me

# Assign to someone else
gh issue edit 123 --add-assignee username
```

### Update Status
```bash
# Mark in progress
gh issue comment 123 --body "🚧 Starting work on this"

# Mark blocked
gh issue comment 123 --body "🚫 Blocked by #124"

# Mark ready for review
gh issue comment 123 --body "✅ Ready for review"
```

### Close Issue
```bash
# Close as completed
gh issue close 123 --reason completed

# Close with comment
gh issue close 123 --comment "Completed in PR #456"
```

---

## Working with Projects

### Create Project Board
```bash
gh project create --owner username --title "Conversational UX v2.3.0"
```

### Add Issues to Project
```bash
# Add issue to project
gh project item-add PROJECT_NUMBER --owner username --url ISSUE_URL
```

### View Project
```bash
gh project view PROJECT_NUMBER --owner username
```

---

## Tracking Progress

### Check All Issue Status
```bash
gh issue list --label "core-feature" --state all --json number,title,state,assignees
```

### Generate Progress Report
```bash
# Count by status
echo "Open: $(gh issue list --label core-feature --state open --json number | jq 'length')"
echo "Closed: $(gh issue list --label core-feature --state closed --json number | jq 'length')"

# Count by priority
echo "P0: $(gh issue list --label P0 --state open --json number | jq 'length') open"
echo "P1: $(gh issue list --label P1 --state open --json number | jq 'length') open"
echo "P2: $(gh issue list --label P2 --state open --json number | jq 'length') open"
```

### Check Dependencies
```bash
# List issues blocked by #123
gh issue list --search "blocked by #123 in:body"

# List issues that block #123
gh issue view 123 --json body --jq '.body' | grep -o "#[0-9]\+" | sort -u
```

---

## Common Workflows

### Starting Work on an Issue
```bash
ISSUE=123

# 1. Assign to yourself
gh issue edit $ISSUE --add-assignee @me

# 2. Create branch
git checkout -b issue-$ISSUE-dialogue-manager

# 3. Comment that you're starting
gh issue comment $ISSUE --body "🚧 Starting implementation"
```

### Submitting Work for Review
```bash
ISSUE=123

# 1. Create PR
gh pr create \
  --title "Fix #$ISSUE: Implement DialogueManager agent" \
  --body "Closes #$ISSUE\n\n## Changes\n- Implemented core logic\n- Added tests\n- Updated docs"

# 2. Request review
gh pr edit --add-reviewer username

# 3. Comment on issue
gh issue comment $ISSUE --body "✅ Ready for review in PR #$(gh pr view --json number --jq '.number')"
```

### Completing an Issue
```bash
ISSUE=123
PR=456

# 1. Merge PR
gh pr merge $PR --squash

# 2. Close issue
gh issue close $ISSUE --comment "Completed in PR #$PR"
```

---

## Reporting

### Weekly Progress Report
```bash
#!/bin/bash
# Save as scripts/weekly-report.sh

echo "=== Conversational UX - Weekly Progress ==="
echo ""
echo "Completed this week:"
gh issue list \
  --label "core-feature" \
  --state closed \
  --search "closed:>=$(date -d '7 days ago' +%Y-%m-%d)" \
  --json number,title \
  --jq '.[] | "- #\(.number): \(.title)"'

echo ""
echo "In Progress:"
gh issue list \
  --label "core-feature" \
  --state open \
  --json number,title,assignees \
  --jq '.[] | select(.assignees | length > 0) | "- #\(.number): \(.title) (@\(.assignees[0].login))"'

echo ""
echo "Blocked:"
gh issue list \
  --label "core-feature" \
  --state open \
  --search "blocked in:body" \
  --json number,title \
  --jq '.[] | "- #\(.number): \(.title)"'

echo ""
echo "Ready to Start:"
gh issue list \
  --label "core-feature" \
  --state open \
  --json number,title,assignees \
  --jq '.[] | select(.assignees | length == 0) | "- #\(.number): \(.title)"'
```

### Phase Completion Report
```bash
# Phase 1 (P0 issues)
echo "Phase 1 (Core Backend):"
echo "  Total: $(gh issue list --label P0 --json number | jq 'length')"
echo "  Completed: $(gh issue list --label P0 --state closed --json number | jq 'length')"
echo "  Remaining: $(gh issue list --label P0 --state open --json number | jq 'length')"

# Phase 2 (P1 issues - frontend)
echo "Phase 2 (Frontend):"
echo "  Total: $(gh issue list --label P1,frontend --json number | jq 'length')"
echo "  Completed: $(gh issue list --label P1,frontend --state closed --json number | jq 'length')"
echo "  Remaining: $(gh issue list --label P1,frontend --state open --json number | jq 'length')"

# Phase 3 (P2 + testing)
echo "Phase 3 (Polish):"
echo "  Total: $(gh issue list --label P2 --json number | jq 'length')"
echo "  Completed: $(gh issue list --label P2 --state closed --json number | jq 'length')"
echo "  Remaining: $(gh issue list --label P2 --state open --json number | jq 'length')"
```

---

## Advanced Queries

### Find Issues Ready to Start
```bash
# No dependencies, not assigned, P0/P1
gh issue list \
  --label "core-feature" \
  --state open \
  --json number,title,labels,assignees,body \
  --jq '.[] | select(
    (.assignees | length == 0) and
    (.body | contains("Dependencies: None") or contains("Dependencies: Issue #") | not) and
    (.labels | map(.name) | contains(["P0"]) or contains(["P1"]))
  ) | "- #\(.number): \(.title)"'
```

### Find Blocked Issues
```bash
gh issue list \
  --label "core-feature" \
  --state open \
  --search "blocked in:body OR depends on in:body"
```

### Estimate Remaining Time
```bash
# Based on issue size labels
gh issue list --label "core-feature" --state open --json labels | \
  jq -r '.[] | .labels | .[] | select(.name | startswith("size:")) | .name' | \
  sort | uniq -c
```

---

## Labels Reference

### Priority
- `P0`: Critical - must have for MVP
- `P1`: High priority - important for full feature
- `P2`: Medium priority - polish and optimization

### Size (Time Estimate)
- `size:S`: Small (1-2 days)
- `size:M`: Medium (2-3 days)
- `size:L`: Large (3-4 days)
- `size:XL`: Extra Large (5-6 days)

### Component
- `agent`: Backend agent implementation
- `frontend`: UI/React components
- `backend`: API/server changes
- `database`: Neo4j schema changes
- `testing`: Testing infrastructure
- `documentation`: Docs and guides

### Type
- `core-feature`: Part of Conversational UX feature
- `orchestrator`: Orchestrator changes
- `ui`: User interface
- `api`: API changes
- `observability`: Logging/metrics/analytics

---

## Quick Checks

### Before Starting Phase 2
```bash
# Verify all Phase 1 (P0) issues are closed
if [ $(gh issue list --label "P0" --state open --json number | jq 'length') -eq 0 ]; then
  echo "✅ Phase 1 complete - ready to start Phase 2"
else
  echo "❌ Phase 1 incomplete - still have P0 issues open:"
  gh issue list --label "P0" --state open
fi
```

### Before Shipping to Production
```bash
# Verify all issues closed
if [ $(gh issue list --label "core-feature" --state open --json number | jq 'length') -eq 0 ]; then
  echo "✅ All issues complete - ready to ship"
else
  echo "❌ Still have open issues:"
  gh issue list --label "core-feature" --state open
fi
```

---

## Troubleshooting

### gh CLI Not Working
```bash
# Check version
gh --version

# Check auth
gh auth status

# Re-authenticate
gh auth login
```

### Can't Find Issues
```bash
# Check repo
gh repo view

# List all labels
gh label list

# Search all issues
gh issue list --search "conversational" --state all
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# List open issues
alias ghi='gh issue list --label core-feature'

# List my issues
alias ghim='gh issue list --assignee @me'

# Create issue
alias ghic='gh issue create'

# View issue
alias ghiv='gh issue view'

# Weekly report
alias ghwr='bash scripts/weekly-report.sh'
```

---

## Related Files

- **Full Issues**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md`
- **Summary**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_SUMMARY.md`
- **Spec**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md`
- **Creation Script**: `/Volumes/Crucial X8/Code/Present-Agent2/scripts/create-conversational-ux-issues.sh`

---

**Last Updated**: 2025-11-18
