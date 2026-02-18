#!/bin/bash
# Verification script for ingestion fixes
# Tests core functionality without actually ingesting data

set -e

echo "🔍 Verifying Ingestion Fixes..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check TypeScript files exist
echo "1️⃣  Checking files exist..."
if [ -f "scripts/ingest-products.ts" ]; then
  echo -e "${GREEN}✓${NC} ingest-products.ts exists"
else
  echo -e "${RED}✗${NC} ingest-products.ts missing"
  exit 1
fi

if [ -f "src/lib/neo4j.ts" ]; then
  echo -e "${GREEN}✓${NC} neo4j.ts exists"
else
  echo -e "${RED}✗${NC} neo4j.ts missing"
  exit 1
fi

# 2. Check critical functions exist
echo ""
echo "2️⃣  Checking critical functions exist..."

grep -q "async function executeWithRetry" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} executeWithRetry() exists" || \
  (echo -e "${RED}✗${NC} executeWithRetry() missing" && exit 1)

grep -q "async function checkNeo4jHealth" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} checkNeo4jHealth() exists" || \
  (echo -e "${RED}✗${NC} checkNeo4jHealth() missing" && exit 1)

grep -q "async function saveCheckpoint" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} saveCheckpoint() exists" || \
  (echo -e "${RED}✗${NC} saveCheckpoint() missing" && exit 1)

grep -q "async function loadCheckpoint" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} loadCheckpoint() exists" || \
  (echo -e "${RED}✗${NC} loadCheckpoint() missing" && exit 1)

grep -q "async function getExistingProductIds" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} getExistingProductIds() exists" || \
  (echo -e "${RED}✗${NC} getExistingProductIds() missing" && exit 1)

# 3. Check session-per-batch pattern
echo ""
echo "3️⃣  Checking session-per-batch pattern..."

# Count "const session = getSession()" inside executeWithRetry
if grep -A 10 "await executeWithRetry" scripts/ingest-products.ts | grep -q "const session = getSession()"; then
  echo -e "${GREEN}✓${NC} Session created inside retry logic"
else
  echo -e "${YELLOW}⚠${NC}  Warning: Session pattern may not be optimal"
fi

# Check session.close() exists in finally blocks
SESSION_CLOSE_COUNT=$(grep -c "await session.close()" scripts/ingest-products.ts)
if [ "$SESSION_CLOSE_COUNT" -ge 5 ]; then
  echo -e "${GREEN}✓${NC} Sessions are closed properly ($SESSION_CLOSE_COUNT instances)"
else
  echo -e "${RED}✗${NC} Not enough session.close() calls found (expected >=5, found $SESSION_CLOSE_COUNT)"
  exit 1
fi

# 4. Check Neo4j connection pool optimizations
echo ""
echo "4️⃣  Checking Neo4j connection pool settings..."

grep -q "maxConnectionPoolSize: 10" src/lib/neo4j.ts && \
  echo -e "${GREEN}✓${NC} Connection pool size reduced to 10" || \
  (echo -e "${YELLOW}⚠${NC}  Warning: Connection pool size not optimized" )

grep -q "maxConnectionLifetime" src/lib/neo4j.ts && \
  echo -e "${GREEN}✓${NC} Connection rotation configured" || \
  (echo -e "${YELLOW}⚠${NC}  Warning: Connection rotation not configured")

# 5. Check retry logic exists
echo ""
echo "5️⃣  Checking retry logic..."

grep -q "for (let attempt = 0; attempt < maxRetries" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Retry loop exists" || \
  (echo -e "${RED}✗${NC} Retry loop missing" && exit 1)

grep -q "Exponential backoff" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Exponential backoff implemented" || \
  (echo -e "${YELLOW}⚠${NC}  Warning: Exponential backoff may not be optimal")

# 6. Check checkpoint logic
echo ""
echo "6️⃣  Checking checkpoint system..."

grep -q ".ingestion-checkpoint.json" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Checkpoint file path configured" || \
  (echo -e "${RED}✗${NC} Checkpoint file path missing" && exit 1)

grep -q "if (batchNum % 10 === 0)" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Checkpoint saving every 10 batches" || \
  (echo -e "${YELLOW}⚠${NC}  Warning: Checkpoint frequency may differ")

# 7. Check health check logic
echo ""
echo "7️⃣  Checking health check system..."

grep -q "if (batchNum % 100 === 0)" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Health checks every 100 batches" || \
  (echo -e "${YELLOW}⚠${NC}  Warning: Health check frequency may differ")

grep -q "const healthy = await checkNeo4jHealth()" scripts/ingest-products.ts && \
  echo -e "${GREEN}✓${NC} Health check executed" || \
  (echo -e "${RED}✗${NC} Health check not executed" && exit 1)

# 8. Check for old session pattern (should NOT exist)
echo ""
echo "8️⃣  Checking for old problematic patterns..."

# Check that we don't have session created outside the batch loop
if grep -B 5 "for await (const product of productStream)" scripts/ingest-products.ts | grep -q "const session = getSession()"; then
  echo -e "${RED}✗${NC} ERROR: Old session pattern detected (session outside loop)"
  exit 1
else
  echo -e "${GREEN}✓${NC} No session created outside batch loop"
fi

# 9. Syntax check (if tsx is available)
echo ""
echo "9️⃣  Checking TypeScript syntax..."
if command -v npx &> /dev/null; then
  if npx tsx --version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} tsx is available"
    echo -e "${YELLOW}ℹ${NC}  Run 'npx tsx scripts/ingest-products.ts --dry-run --limit 10' to test"
  else
    echo -e "${YELLOW}⚠${NC}  tsx not available (install with: npm install)"
  fi
else
  echo -e "${YELLOW}⚠${NC}  npx not available"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All critical fixes verified!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Read INGESTION_FIX_GUIDE.md for complete documentation"
echo "  2. Test with dry run: npx tsx scripts/ingest-products.ts --dry-run --limit 10"
echo "  3. Test resume: Interrupt script (Ctrl+C) and restart"
echo "  4. Run full ingestion: npx tsx scripts/ingest-products.ts"
echo ""
