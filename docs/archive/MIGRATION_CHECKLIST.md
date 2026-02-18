# Present Agent2 - Migration Checklist

> Step-by-step guide to migrate from Crucial X8 to Seagate SSD

---

## Pre-Migration (Current Status ✓)

- [x] Create project structure on Seagate
- [x] Create comprehensive CLAUDE.md
- [x] Create README.md
- [x] Create DATA_MANIFEST.md
- [x] Create RESEARCH_INDEX.md
- [x] Create CONTEXT_INDEX.md
- [x] Create vault PROJECT_CONTEXT.md
- [x] Link to all InnerOS context files
- [x] Document research papers
- [x] Document product data sources

---

## Phase 1: Mount Crucial X8 Drive

### Step 1.1: Connect Drive
- [ ] Connect Crucial X8 SSD to Mac
- [ ] Wait for drive to appear in Finder
- [ ] Verify mount point: `/Volumes/Crucial/X8/`

### Step 1.2: Verify Codebase
```bash
# Navigate to original location
cd /Volumes/Crucial/X8/Code/Present/Agent2/

# Check contents
ls -la

# Check Git status
git status

# Check branch
git branch

# Check remotes
git remote -v
```

**Expected files:**
- `package.json` or `package-lock.json`
- `tsconfig.json` (if TypeScript)
- `src/` folder with Next.js app
- `agents/` folder with agent implementations
- `.env.local` (API keys)
- `README.md`
- `.git/` folder

---

## Phase 2: Migrate Codebase

### Step 2.1: Copy Core Files
```bash
# Set variables
SOURCE="/Volumes/Crucial/X8/Code/Present/Agent2"
DEST="/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2"

# Copy entire codebase (excluding node_modules)
rsync -av --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude 'build' \
  "$SOURCE/" "$DEST/src/"

# Verify copy
du -sh "$DEST/src/"
```

### Step 2.2: Copy Environment Files
```bash
# Copy .env.local (contains API keys)
cp "$SOURCE/.env.local" "$DEST/src/.env.local"

# IMPORTANT: Review and update API keys if needed
cat "$DEST/src/.env.local"
```

**Required Environment Variables:**
- `OPENAI_API_KEY`
- `COHERE_API_KEY`
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `NEWS_API_KEY` (if NewsAPI integration exists)

### Step 2.3: Verify Git Status
```bash
cd "$DEST/src"

# Check Git is intact
git status

# Check remote
git remote -v

# Should point to: git@github.com:GuillaumeRacine/present-agent2.git
```

### Step 2.4: Document Last Session
```bash
# Check Claude Code session history on Crucial X8
cat /Volumes/Crucial/X8/.claude/projects/*/activity.jsonl | tail -100

# Copy relevant session notes
cp /Volumes/Crucial/X8/.claude/projects/*/activity.jsonl "$DEST/docs/last-session.jsonl"
```

---

## Phase 3: Migrate Product Data

### Step 3.1: Copy from iCloud
```bash
# Create data directory
mkdir -p "$DEST/data/products"

# Copy all PresentAgentList files
cp ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/PresentAgentList-*.json \
   "$DEST/data/products/"

# Copy master files
cp ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/master.json \
   "$DEST/data/products/"

cp ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/BCorps_Products_Cleaned.json \
   "$DEST/data/products/"

# Verify
ls -lh "$DEST/data/products/"
du -sh "$DEST/data/products/"
# Should be ~102MB
```

### Step 3.2: Validate Data Integrity
```bash
# Count total lines
wc -l "$DEST/data/products"/PresentAgentList-*.json

# Should be ~1,279,772 total lines

# Check JSON validity (sample)
cat "$DEST/data/products/PresentAgentList-1.json" | jq '.[0]'
```

---

## Phase 4: Migrate Research Papers

### Step 4.1: Create Symlinks (Recommended)
```bash
# Symlink research folder (avoids duplication)
ln -s "/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts" \
      "$DEST/research/papers"

# Verify
ls -la "$DEST/research/papers/"
```

### Step 4.2: OR Copy Papers (Alternative)
```bash
# If you prefer copying (uses more space)
mkdir -p "$DEST/research/papers"

cp "/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/"*.md \
   "$DEST/research/papers/"

# Verify
ls -lh "$DEST/research/papers/"
# Should be ~750KB total
```

---

## Phase 5: Setup Development Environment

### Step 5.1: Install Dependencies
```bash
cd "$DEST/src"

# Check Node.js version
node --version
# Should be v18+ or v20+

# Install dependencies
npm install
# OR if using pnpm
pnpm install
# OR if using yarn
yarn install

# Time: ~2-5 minutes depending on size
```

### Step 5.2: Setup Neo4j
```bash
# Option A: Docker (Recommended)
docker run -d \
  --name neo4j-present-agent \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_PLUGINS='["graph-data-science","apoc"]' \
  -v neo4j-present-agent-data:/data \
  neo4j:5-community

# Verify
docker ps | grep neo4j

# Access Neo4j Browser
open http://localhost:7474
# Login: neo4j / password

# Option B: Neo4j Desktop
# Download from: https://neo4j.com/download/
# Create new database: present-agent2
# Install APOC and Graph Data Science plugins
# Start database
```

### Step 5.3: Verify Environment
```bash
cd "$DEST/src"

# Check .env.local
cat .env.local

# Should include:
# - OPENAI_API_KEY=sk-...
# - COHERE_API_KEY=...
# - NEO4J_URI=bolt://localhost:7687
# - NEO4J_USER=neo4j
# - NEO4J_PASSWORD=password
```

---

## Phase 6: Load Data & Test

### Step 6.1: Load Product Data
```bash
cd "$DEST/src"

# If script exists:
npm run load-products

# OR manually:
node scripts/load-products.js

# Expected: Products loaded into Neo4j
# Time: ~5-15 minutes for 1.28M records
```

### Step 6.2: Generate Embeddings
```bash
# If script exists:
npm run generate-embeddings

# OR manually:
node scripts/generate-embeddings.js

# Expected: Cohere embeddings for products
# Time: ~30-60 minutes (API rate limits)
```

### Step 6.3: Build Graph Relationships
```bash
# If script exists:
npm run build-graph

# OR manually:
node scripts/build-graph.js

# Expected: Product categories, brand relationships
# Time: ~5-10 minutes
```

### Step 6.4: Test Agents
```bash
# Run agent tests
npm run test-agents

# OR manually:
npm test

# Expected: All agents functional
```

### Step 6.5: Start Development Server
```bash
# Start Next.js dev server
npm run dev

# Expected output:
# > ready - started server on 0.0.0.0:3000
# > Local: http://localhost:3000

# Open in browser
open http://localhost:3000
```

---

## Phase 7: Verify Migration

### Step 7.1: Checklist
- [ ] Codebase copied and intact
- [ ] Git status clean
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Neo4j running
- [ ] Product data loaded (1.28M records)
- [ ] Embeddings generated
- [ ] Graph relationships built
- [ ] Agents tested and functional
- [ ] Dev server starts without errors
- [ ] Can query recommendations

### Step 7.2: Test Recommendation Flow
```bash
# Test via API (if endpoints exist)
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "giver": "Guillaume",
    "receiver": "Lisa",
    "occasion": "birthday",
    "budget": 200,
    "relationship": "spouse"
  }'

# Expected: JSON response with gift recommendations
```

### Step 7.3: Verify Neo4j Data
```cypher
// Open Neo4j Browser: http://localhost:7474
// Run queries:

// Count products
MATCH (p:Product) RETURN count(p)
// Expected: ~1.28M nodes

// Count brands
MATCH (b:Brand) RETURN count(b)
// Expected: ~hundreds of brands

// Sample product
MATCH (p:Product) RETURN p LIMIT 1

// Check embeddings exist
MATCH (p:Product) WHERE p.embedding IS NOT NULL RETURN count(p)
// Expected: Same as product count
```

---

## Phase 8: Resume Work (NewsAPI Integration)

### Step 8.1: Review Last Session
```bash
# Read last session notes
cat "$DEST/docs/last-session.jsonl"

# Or read Claude Code history
cat ~/Obs_Vault/0_InnerContext/Data/claude_code_history.md | grep -A 50 "Present/Agent2"
```

**From Dec 11, 2025 session:**
> "read last session with claude code and help me complete the newsapi search"

### Step 8.2: NewsAPI Integration Tasks
- [ ] Get NewsAPI key: https://newsapi.org/
- [ ] Add to .env.local: `NEWS_API_KEY=...`
- [ ] Implement trending gift search
- [ ] Integrate with Explorer agent
- [ ] Test seasonal gift recommendations
- [ ] Add to recommendation flow

### Step 8.3: Next Features
- [ ] Complete NewsAPI integration
- [ ] Implement social closeness scoring
- [ ] Add multi-recipient scenarios
- [ ] Build gift history tracking
- [ ] Launch MVP

---

## Cleanup

### Step 9.1: Backup Original
```bash
# Keep Crucial X8 as backup for now
# Don't delete until fully verified
```

### Step 9.2: Update Git Remote (if needed)
```bash
cd "$DEST/src"

# Ensure remote is correct
git remote -v

# If needed, update
git remote set-url origin git@github.com:GuillaumeRacine/present-agent2.git
```

### Step 9.3: First Commit
```bash
cd "$DEST/src"

# Stage migration docs
git add ../CLAUDE.md ../README.md ../data/ ../research/ ../docs/

# Commit
git commit -m "Migrate to Seagate SSD with comprehensive documentation

- Add CLAUDE.md with complete context for LLM agents
- Add research index (14 papers on gift psychology)
- Add data manifest (102MB B-Corp products)
- Add context index linking to InnerOS files
- Ready to resume NewsAPI integration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push (if remote is set up)
git push origin main
```

---

## Troubleshooting

### Issue: Crucial X8 Won't Mount
```bash
# Check if drive is recognized
diskutil list | grep Crucial

# If found but not mounted
diskutil mount /dev/diskXsY

# If not found, try different cable/port
```

### Issue: Git Errors
```bash
# If Git corrupted
cd "$DEST/src"
rm -rf .git
git init
git remote add origin git@github.com:GuillaumeRacine/present-agent2.git

# Re-auth with GitHub
gh auth login
```

### Issue: Neo4j Connection Failed
```bash
# Check Docker container
docker ps -a | grep neo4j

# Restart if stopped
docker start neo4j-present-agent

# Check logs
docker logs neo4j-present-agent

# Re-create if needed
docker rm neo4j-present-agent
# Then re-run docker run command from Step 5.2
```

### Issue: Missing API Keys
```bash
# OpenAI key (check 1Password or Guillaume's credentials)
# Location: ~/Obs_Vault/0_System/Obsidian_Private/ID/Creds/

# Cohere key
# Sign up: https://cohere.com/

# NewsAPI key
# Sign up: https://newsapi.org/
```

### Issue: npm install Fails
```bash
# Clear cache
npm cache clean --force

# Remove lock file
rm package-lock.json

# Re-install
npm install

# Or use different package manager
pnpm install
# or
yarn install
```

---

## Success Criteria

Migration is complete when:

- [x] All files copied to Seagate
- [ ] Git repository functional
- [ ] Dependencies installed
- [ ] Neo4j running and connected
- [ ] Product data loaded (1.28M records)
- [ ] Embeddings generated
- [ ] Agents tested
- [ ] Dev server starts
- [ ] Can generate recommendations
- [ ] Documentation complete
- [ ] Ready to resume NewsAPI work

---

## Quick Start After Migration

```bash
# Navigate to project
cd /Volumes/Seagate\ 2TB/1_Projects/Protoypes/present-agent2/src/

# Start Neo4j (if Docker)
docker start neo4j-present-agent

# Start dev server
npm run dev

# Open app
open http://localhost:3000

# Open Neo4j Browser
open http://localhost:7474
```

---

*For any issues, check CLAUDE.md or ask Claude Code for help with context:*
```bash
claude --cwd="/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2"
```

*Last updated: 2026-02-15*
