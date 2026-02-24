# 🔒 LLM Security Checklist for Present-Agent2

**READ THIS BEFORE EVERY GIT OPERATION!**

---

## ⚠️ Pre-Commit Security Verification

Run these checks **BEFORE** suggesting any `git add` or `git commit`:

```bash
# 1. Check for sensitive files in staging
git status --short | grep -E "(\.env\.local|credential|secret|password|\.pem|\.key)"

# 2. Verify .gitignore is protecting .env.local
git check-ignore .env.local

# 3. Check for hardcoded credentials in staged changes
git diff --cached | grep -iE "(password|api_key|secret|token|NEO4J_PASSWORD|OPENAI_API_KEY)"
```

**If ANY check fails → STOP and alert the user!**

---

## 🚨 NEVER Commit These Files

- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`
- Any file with `credentials` in name
- Any file with `secrets` in name
- `*.pem`, `*.key`, `*.cert` files
- Log files with sensitive data

---

## ✅ Safe to Commit

- `.env.example` (template with placeholders)
- `SECURITY.md`
- `.gitignore`
- Source code using environment variables
- Documentation files

---

## 🤖 Safe Response Templates

### When user asks to commit:
```
Let me verify no sensitive files first...
[run security checks]
✅ All clear! Ready to commit.
```

### When credentials needed:
```
I'll help you add those to .env.local (which is gitignored).
NEVER commit credentials directly!
```

### When asked about .env.local:
```
.env.local is gitignored and contains your private credentials.
Use .env.example as a template to create it.
```

---

## 🎯 Quick Reference

**Protected by .gitignore:**
- ✅ `.env.local` (line 22)
- ✅ `.env*.local` (line 23)
- ✅ `*credentials*` (line 31)
- ✅ `*secrets*` (line 32)
- ✅ `*.pem`, `*.key`, `*.cert` (lines 19, 34-35)

**Always check before commit:**
1. Is .env.local in git status? → STOP
2. Are there API keys in staged files? → STOP
3. Are credentials in commit message? → STOP

---

## 📋 Environment Variables in This Project

**Database:**
- `NEO4J_URL` - Neo4j connection string
- `NEO4J_USERNAME` - Database username
- `NEO4J_PASSWORD` - Database password ⚠️

**AI Services:**
- `OPENAI_API_KEY` - OpenAI API key ⚠️
- `ANTHROPIC_API_KEY` - Anthropic API key ⚠️

**Configuration:**
- `BACKEND_PORT`, `PORT` - Server ports (safe)
- `NODE_ENV` - Environment (safe)
- `LOG_LEVEL` - Logging level (safe)

⚠️ = NEVER commit these values!

---

## 🔍 How to Check Current Status

```bash
# Is .env.local protected?
git check-ignore .env.local
# Should output: .env.local

# Any sensitive files tracked?
git ls-files | grep -E "(\.env\.local|credentials)"
# Should output: nothing

# Current staging status
git status
# .env.local should NOT appear
```

---

**Last Updated**: 2025-11-24
**Read this EVERY time before git operations!**
