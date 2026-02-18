#!/usr/bin/env bash
# Sample pre-commit hook (install manually as .git/hooks/pre-commit)
# Blocks commits that include .env.local or obvious secret patterns.

set -euo pipefail

if git diff --cached --name-only | grep -E '^\.env\.local$'; then
  echo "✗ Commit blocked: .env.local is ignored and must not be committed." >&2
  exit 1
fi

# naive secret pattern checks (customize as needed)
if git diff --cached | grep -E '(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{35,})' >/dev/null; then
  echo "✗ Commit blocked: potential secret detected in staged changes." >&2
  exit 1
fi

exit 0

