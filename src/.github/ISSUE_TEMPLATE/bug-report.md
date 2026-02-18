---
name: Bug Report
about: Testing Agent reports bugs found during QA
title: '[BUG] '
labels: bug, needs-investigation
assignees: ''
---

## 🐛 Bug Report

**Reported by:** Testing Agent
**Found in:** #[implementation issue number]
**Status:** 🔍 Needs Investigation

---

## Severity
- [ ] Critical (system broken, blocking)
- [ ] High (major feature broken)
- [ ] Medium (workaround exists)
- [ ] Low (minor issue, cosmetic)

## Description
<!-- What's wrong? What's expected? -->

**What's Wrong:**


**Expected Behavior:**


## Reproduction Steps

1. Step 1
2. Step 2
3. Step 3

**Result:** [What actually happens]

## Logs

```
[Relevant log excerpts showing the error]
```

## Environment
- Node version:
- Neo4j version:
- OS:
- Branch:

## Root Cause Analysis
<!-- Testing Agent or Coding Agent fills this in -->

**Root Cause:**


**Why It Happened:**


**Impact:**


## Proposed Fix
<!-- Coding Agent proposes solution -->

**Fix Strategy:**


**Files to Change:**
- `file1.ts`
- `file2.ts`

**Code Changes:**
```typescript
// Proposed fix
```

## Testing Plan
<!-- How to verify fix works -->

- [ ] Test case 1
- [ ] Test case 2
- [ ] Regression test

---

## 🔄 Fix Workflow

### Investigation (Testing Agent)
- [ ] Bug reproduced
- [ ] Root cause identified
- [ ] Impact assessed

**Comment with:** `/investigated` when complete

### Fix Implementation (Coding Agent)
- [ ] Fix implemented
- [ ] Unit test added for bug
- [ ] Regression tests pass

**Comment with:** `/fix-ready` when complete

### Verification (Testing Agent)
- [ ] Original bug no longer reproduces
- [ ] No regressions introduced
- [ ] Tests pass

**Comment with:** `/verified` when complete

### Close
**Comment with:** `/bug-fixed` to close issue

---

<!-- DO NOT DELETE BELOW THIS LINE -->
**Bug Workflow Status:**
- Reported: [ ]
- Investigated: [ ]
- Fix Implemented: [ ]
- Verified: [ ]
- Fixed: [ ]
