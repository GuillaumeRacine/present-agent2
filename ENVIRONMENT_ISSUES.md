# Environment Setup Issues & Fixes

**Status:** 3 critical issues found, all fixable

---

## Issue 1: Neo4j Connection Failed ❌

```
Error: Could not perform discovery. No routing servers available.
Instance: e76e08e6.databases.neo4j.io
```

### Cause
Neo4j Aura Free tier **pauses instances after inactivity**. Your instance `e76e08e6` is likely sleeping.

### Fix Options

**Option A: Wake up the instance (Recommended)**
1. Go to https://console.neo4j.io
2. Login with your Neo4j account
3. Find instance `e76e08e6` (Free instance)
4. Click "Resume" or wait 60 seconds for auto-wake
5. Verify status shows "Running"

**Option B: Use different instance**
- Guillaume mentioned: "Wait 60 seconds before connecting"
- This suggests instance auto-wakes on first connection attempt
- Try running `npm run env:check` again after 60 seconds

**Option C: Check if instance still exists**
- Free instances can be deleted after long inactivity
- If deleted, need to create new instance or use a92dc9b7 instance mentioned in PROJECT_STATUS.md

---

## Issue 2: OpenAI API Key Invalid ❌

```
Error: 401 Incorrect API key provided
Key (truncated): sk-proj-************************************************gdkA
```

### Cause
The provided API key may be:
- Expired
- Revoked
- For a different project
- Incorrectly copied (whitespace/truncation)

### Fix
1. Go to https://platform.openai.com/api-keys
2. Create new API key OR verify existing key
3. Copy full key (should start with `sk-proj-` or `sk-`)
4. Update `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-proj-[NEW_KEY_HERE]
   ```

**Alternative:** If you have a working key elsewhere, use that instead

---

## Issue 3: Anthropic Model Not Found ❌

```
Error: 404 model: claude-3-5-sonnet-20241022
```

### Cause
The code is requesting a model version that doesn't exist or has been deprecated.

### Fix
Update to current Anthropic model name. Current models (Feb 2026):
- `claude-3-5-sonnet-20241022` (if exists) ← Currently failing
- `claude-3-5-sonnet-20240620` (previous version)
- `claude-opus-4-6` (latest Opus)
- `claude-sonnet-4-5-20250929` (latest Sonnet)

**Check which file specifies the model:**
```bash
grep -r "claude-3-5-sonnet" src/
```

Then update to a valid model name.

---

## Issue 4: Frontend/Backend URL Mismatch ⚠️

```
Warning: FRONTEND_URL should match frontend port 3001
Expected: http://localhost:3001
Current: http://localhost:3000
```

### Cause
Port configuration mismatch between .env.local values

### Fix
Update `.env.local`:
```bash
# Was:
FRONTEND_URL=http://localhost:3000
PORT=3001

# Should be:
FRONTEND_URL=http://localhost:3001
PORT=3001
BACKEND_PORT=3001
```

Or standardize on 3000:
```bash
FRONTEND_URL=http://localhost:3000
PORT=3000
BACKEND_PORT=3000
```

---

## Quick Fix Script

Run this after fixing API keys:

```bash
cd "/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/src"

# 1. Wait for Neo4j to wake up (if sleeping)
echo "Waiting for Neo4j instance to wake up..."
sleep 60

# 2. Verify environment
npm run env:check

# 3. If still failing, check Neo4j console:
open https://console.neo4j.io

# 4. Once Neo4j is running, setup schema
npm run setup:schema --verify

# 5. Run baseline tests
npm test
npm run test:personas:quick
```

---

## Status Checklist

- [ ] Neo4j instance e76e08e6 is running (check console)
- [ ] OpenAI API key is valid (test at platform.openai.com)
- [ ] Anthropic model name updated (check src/services/agents/)
- [ ] Frontend/Backend URLs match
- [ ] `npm run env:check` passes
- [ ] `npm test` passes (190/190)
- [ ] Ready to start Phase 1 improvements

---

## If Neo4j Instance Doesn't Exist

**Alternative Instance:** PROJECT_STATUS.md mentions instance `a92dc9b7`

Update `.env.local`:
```bash
NEO4J_URI=neo4j+s://a92dc9b7.databases.neo4j.io
AURA_INSTANCEID=a92dc9b7
```

Then verify connection.

---

**Next:** Guillaume fixes these 3 issues, then we can proceed with autonomous implementation.
