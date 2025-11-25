#!/bin/bash
# Documentation Organizer Script
# Run this to clean up and organize documentation

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📚 Documentation Organizer"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
MOVED=0
DELETED=0
WARNINGS=0

# 1. Check for .md files in root (should only be README.md)
echo -e "\n${YELLOW}Checking root directory...${NC}"
ROOT_MDS=$(find . -maxdepth 1 -name "*.md" ! -name "README.md" 2>/dev/null)
if [ -n "$ROOT_MDS" ]; then
    echo -e "${RED}Found .md files in root (should only have README.md):${NC}"
    echo "$ROOT_MDS"

    # Move them to archive
    for f in $ROOT_MDS; do
        filename=$(basename "$f")
        if [[ "$filename" == *"_COMPLETE"* ]] || [[ "$filename" == *"_SUMMARY"* ]]; then
            mv "$f" docs/archive/implementations/
            echo -e "${GREEN}  Moved $filename → docs/archive/implementations/${NC}"
        else
            mv "$f" docs/archive/
            echo -e "${GREEN}  Moved $filename → docs/archive/${NC}"
        fi
        ((MOVED++))
    done
else
    echo -e "${GREEN}✓ Root directory is clean (only README.md)${NC}"
fi

# 2. Remove macOS artifacts
echo -e "\n${YELLOW}Removing macOS artifacts...${NC}"
MACOS_COUNT=$(find . -name "._*" -o -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MACOS_COUNT" -gt 0 ]; then
    find . -name "._*" -delete 2>/dev/null
    find . -name ".DS_Store" -delete 2>/dev/null
    echo -e "${GREEN}✓ Removed $MACOS_COUNT macOS artifact files${NC}"
    DELETED=$((DELETED + MACOS_COUNT))
else
    echo -e "${GREEN}✓ No macOS artifacts found${NC}"
fi

# 3. Check for empty .md files
echo -e "\n${YELLOW}Checking for empty/tiny .md files...${NC}"
TINY_FILES=$(find docs -name "*.md" -size -100c 2>/dev/null)
if [ -n "$TINY_FILES" ]; then
    echo -e "${YELLOW}Warning: Found very small .md files (may be stubs):${NC}"
    echo "$TINY_FILES" | head -10
    ((WARNINGS++))
fi

# 4. Check for duplicate filenames
echo -e "\n${YELLOW}Checking for duplicate filenames...${NC}"
DUPES=$(find docs -name "*.md" -exec basename {} \; 2>/dev/null | sort | uniq -d)
if [ -n "$DUPES" ]; then
    echo -e "${YELLOW}Warning: Found duplicate filenames:${NC}"
    echo "$DUPES"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ No duplicate filenames${NC}"
fi

# 5. Count documentation
echo -e "\n${YELLOW}Documentation Statistics:${NC}"
TOTAL_DOCS=$(find docs -name "*.md" ! -path "*/archive/*" 2>/dev/null | wc -l | tr -d ' ')
ARCHIVED_DOCS=$(find docs/archive -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
CLAUDE_DOCS=$(find .claude -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

echo "  Active docs:   $TOTAL_DOCS"
echo "  Archived docs: $ARCHIVED_DOCS"
echo "  Claude docs:   $CLAUDE_DOCS"

# Summary
echo -e "\n${GREEN}=========================="
echo "Summary:"
echo "  Files moved:   $MOVED"
echo "  Files deleted: $DELETED"
echo "  Warnings:      $WARNINGS"
echo -e "==========================${NC}"

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  Review warnings above${NC}"
fi

echo -e "\n${GREEN}✓ Documentation organization complete${NC}"
