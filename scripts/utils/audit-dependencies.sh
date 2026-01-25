#!/bin/bash
# Audit dependencies for security and updates
# Run with: ./scripts/utils/audit-dependencies.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Auditing dependencies..."
echo ""

# 1. Security audit
echo "═══════════════════════════════════════════════════════"
echo "1. Security Vulnerabilities"
echo "═══════════════════════════════════════════════════════"
npm audit --production || true
echo ""

# 2. Outdated packages
echo "═══════════════════════════════════════════════════════"
echo "2. Outdated Packages"
echo "═══════════════════════════════════════════════════════"
npm outdated || true
echo ""

# 3. Unused dependencies
echo "═══════════════════════════════════════════════════════"
echo "3. Unused Dependencies"
echo "═══════════════════════════════════════════════════════"
if command -v depcheck &> /dev/null; then
  UNUSED=$(depcheck --json 2>/dev/null | jq -r '.dependencies[]' 2>/dev/null)
  if [ -z "$UNUSED" ]; then
    echo "  ✅ No unused dependencies detected"
  else
    echo "  ⚠️  Unused dependencies found:"
    echo "$UNUSED" | while read dep; do
      echo "    - $dep"
    done
  fi
else
  echo "  ℹ️  Install depcheck for unused dependency detection:"
  echo "     npm install -g depcheck"
fi
echo ""

# 4. Bundle size
echo "═══════════════════════════════════════════════════════"
echo "4. Bundle Sizes"
echo "═══════════════════════════════════════════════════════"
echo "  Backend node_modules:  $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
if [ -d "frontend/node_modules" ]; then
  echo "  Frontend node_modules: $(du -sh frontend/node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
fi
echo ""

# 5. License check (if license-checker is installed)
if command -v license-checker &> /dev/null; then
  echo "═══════════════════════════════════════════════════════"
  echo "5. License Summary"
  echo "═══════════════════════════════════════════════════════"
  license-checker --summary 2>/dev/null || echo "  Unable to generate license summary"
  echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo "✅ Audit complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Recommended actions:"
echo "  • Fix HIGH/CRITICAL vulnerabilities: npm audit fix"
echo "  • Update outdated packages: npm update"
echo "  • Remove unused dependencies: npm uninstall <package>"
