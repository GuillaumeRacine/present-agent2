#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INDEX_FILE="$ROOT_DIR/docs/CURRENT_DOCS.md"

if [[ ! -f "$INDEX_FILE" ]]; then
  echo "Missing docs index: $INDEX_FILE"
  exit 1
fi

echo "Auditing docs against $INDEX_FILE"
echo

tmp_indexed="$(mktemp)"
tmp_all="$(mktemp)"
trap 'rm -f "$tmp_indexed" "$tmp_all"' EXIT

# Extract referenced markdown paths from the index.
rg -o "([A-Za-z0-9_./-]+\\.md)" "$INDEX_FILE" | sort -u > "$tmp_indexed"

# Collect repo markdown files except archived and dependency directories.
find "$ROOT_DIR" -type f -name "*.md" \
  -not -path "*/.git/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/docs/archive/*" \
  -not -path "*/src/docs/archive/*" \
  | sed "s#^$ROOT_DIR/##" \
  | sort -u > "$tmp_all"

echo "Indexed docs count: $(wc -l < "$tmp_indexed" | tr -d ' ')"
echo "Non-archived docs count: $(wc -l < "$tmp_all" | tr -d ' ')"
echo

echo "Docs not listed in CURRENT_DOCS.md:"
comm -23 "$tmp_all" "$tmp_indexed" || true
