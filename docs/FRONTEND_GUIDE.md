# Frontend UI Guide - Present-Agent2

## 🎉 Complete! You now have a full-stack testing interface!

### What Was Built

A comprehensive web interface with 3 main pages:

1. **🎁 Chat UI** (`/`) - Interactive gift recommendation testing
2. **📋 Logs** (`/logs`) - View all conversation history
3. **📦 Products** (`/products`) - Explore the product database

## Quick Start

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Create Environment File

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:
```env
BACKEND_URL=http://localhost:3000
```

### 3. Run Both Backend and Frontend

From the **root** directory:

```bash
npm run dev
```

This starts:
- ✅ Backend API server on `http://localhost:3000`
- ✅ Frontend web app on `http://localhost:3001`

### 4. Open in Browser

Navigate to `http://localhost:3001`

Note: Ensure the backend `.env.local` (repo root) sets:
```
BACKEND_PORT=3000
FRONTEND_URL=http://localhost:3001
```

## Pages Overview

### 🎁 Home - Chat UI

**What it does:**
- Interactive chat interface to test gift recommendations
- Real-time responses from your 9-agent system
- Beautiful display of recommendations with reasoning

**How to use:**
1. Type a gift search query (e.g., "Gift for my mom who loves gardening, budget $50-100")
2. Click "Send" or press Enter
3. Watch the 9 agents work together
4. See recommendations with:
   - Product details
   - Personal reasoning
   - Confidence scores
   - Tags

**Features:**
- Message history with scrolling
- Loading indicators
- Error handling
- Response time tracking
- Clean, intuitive UI

### 📋 Conversation Logs

**What it does:**
- View all past test conversations
- Analyze agent performance
- Debug issues
- Track execution times

**How to use:**
1. Navigate to `/logs` or click "Conversation Logs" in nav
2. Filter by: All / Success / Errors
3. Click any conversation to see details:
   - User query
   - Execution metrics
   - Agent timing breakdown
   - Full response JSON

**Features:**
- List view with status indicators
- Detailed execution trace
- Agent timings
- Full JSON viewer
- Search and filter

### 📦 Products Explorer

**What it does:**
- Browse all 88,674 products in the database
- Understand product relationships
- See facets and interests
- Filter and search

**How to use:**
1. Navigate to `/products` or click "Products Explorer"
2. Use filters:
   - Search by name
   - Filter by category
   - Filter by interest
   - Set price range
3. Click any product to see details:
   - Full description
   - Facets (attributes)
   - Related interests
   - Vendor info

**Features:**
- Statistics dashboard
- Multi-filter support
- Product grid view
- Detailed side panel
- Real-time filtering

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Frontend (Next.js)                     │
│                http://localhost:3001                  │
│                                                       │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ Chat UI   │  │   Logs   │  │   Products   │     │
│  │  (Home)   │  │  Page    │  │   Explorer   │     │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘     │
│        │             │                 │              │
│        └─────────────┴─────────────────┘              │
│                      │                                │
│              ┌───────▼────────┐                       │
│              │  API Routes    │                       │
│              └───────┬────────┘                       │
└──────────────────────┼────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼────────────────────────────────┐
│              Backend API Server                        │
│              http://localhost:3000                     │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │    Recommendation Orchestrator (9 Agents)    │    │
│  └──────────────────┬───────────────────────────┘    │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│                  Neo4j Database                       │
│  - 88,674 Products                                   │
│  - 105,731 Facets                                     │
│  - 27 Categories                                      │
│  - Vector embeddings                                  │
└───────────────────────────────────────────────────────┘
```

## API Endpoints

The backend provides these endpoints:

### `POST /api/recommend`
Main recommendation endpoint.

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Gift for my mom who loves gardening",
    "userId": "test-user",
    "sessionId": "session-123"
  }'
```

### `GET /api/products/stats`
Get product database statistics.

### `GET /api/products`
Search and filter products.

### `GET /health`
Health check endpoint.

## Development Workflow

### Iterating on Recommendations

1. **Test in Chat UI**
   - Try different queries
   - See what works and what doesn't
   - Note response times

2. **Review in Logs**
   - Check agent execution times
   - See which agents are slow
   - Analyze the full trace

3. **Explore Products**
   - Understand what products exist
   - See how they're categorized
   - Check facets and relationships

4. **Make Changes**
   - Update agent logic
   - Adjust graph weights
   - Add new relationships

5. **Test Again**
   - Re-run queries in Chat UI
   - Compare before/after
   - Verify improvements

### Running Tests

```bash
# Persona testing (from root)
npm run test:personas:quick

# Individual test
npm run test:personas run -- --persona persona-001-sarah
```

## Tips & Tricks

### Quick Testing
- Use the Chat UI for rapid iteration
- Save common test queries
- Compare results side-by-side

### Debugging
- Check Logs page for execution details
- Look at agent timings to find bottlenecks
- Use browser DevTools Network tab

### Understanding Results
- Confidence scores show system certainty
- Tags indicate why products were chosen
- Reasoning explains the recommendation

### Performance
- Normal response time: 20-30 seconds
- Watch for agents taking > 10s
- Check Neo4j query performance

## Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Backend connection failed
- Check if backend is running on port 3000
- Verify `.env.local` has correct `BACKEND_URL`
- Check browser console for errors

### No recommendations returned
- Check backend logs
- Verify Neo4j connection
- Ensure products are ingested

### Styles not loading
- Clear Next.js cache: `rm -rf frontend/.next`
- Restart dev server
- Check Tailwind configuration

## Next Steps

### Immediate
1. Start the servers: `npm run dev`
2. Open `http://localhost:3001`
3. Try a test query
4. Explore the logs and products

### Short-term
1. Run persona tests to establish baseline
2. Identify improvement opportunities
3. Make changes to agents
4. Re-test and validate

### Long-term
1. Add conversation persistence
2. Implement user authentication
3. Build analytics dashboard
4. Add export functionality
5. Create mobile version

## Screenshots (Conceptual)

### Chat UI
```
┌─────────────────────────────────────────────────────────┐
│  🎁 Present Agent                                       │
│  Chat  |  Logs  |  Products                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ℹ️ Hi! I'm your gift recommendation assistant...       │
│                                                          │
│              👤 Gift for my mom who loves gardening...   │
│                                                          │
│  🤖 Here are some recommendations:                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. L'Atelier Vert Votive Set - $79.00           │  │
│  │    Confidence: 87%                                │  │
│  │    This aligns with her gardening passion...     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [ Type your message...                    ] [Send]     │
└─────────────────────────────────────────────────────────┘
```

### Logs Page
```
┌─────────────────────────────────────────────────────────┐
│  Conversation Logs                                       │
│  [All] [✓ Success] [✗ Errors]                          │
├───────────────────┬─────────────────────────────────────┤
│ ✓ user-001        │  Conversation Details                │
│   Gift for mom... │  Session: session-001                │
│   5 recs, 23.4s   │                                      │
│                   │  User Query:                         │
│ ✓ user-002        │  "Gift for my mom..."                │
│   Last minute...  │                                      │
│   5 recs, 20.8s   │  Execution Metrics:                  │
│                   │  ┌─────────────┐                     │
│ ✗ user-003        │  │ 23.4s total │                     │
│   Best friend...  │  │ 5 recs      │                     │
│   0 recs, 20.2s   │  └─────────────┘                     │
└───────────────────┴─────────────────────────────────────┘
```

## File Structure

```
frontend/
├── app/
│   ├── page.tsx                    # Chat UI
│   ├── logs/
│   │   └── page.tsx                # Conversation Logs
│   ├── products/
│   │   └── page.tsx                # Products Explorer
│   ├── api/
│   │   ├── chat/route.ts           # Chat API
│   │   ├── logs/route.ts           # Logs API
│   │   ├── logs/[sessionId]/route.ts
│   │   └── products/
│   │       ├── route.ts            # Products API
│   │       └── stats/route.ts      # Stats API
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── public/                         # Static assets
├── next.config.js                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies
└── README.md                       # Frontend docs
```

## Summary

You now have a complete full-stack testing interface that allows you to:

✅ Test recommendations interactively
✅ View and analyze conversation history
✅ Explore the product database
✅ Iterate quickly on improvements
✅ Debug issues effectively
✅ Understand agent performance

**Start developing:**
```bash
npm run dev
```

**Open in browser:**
```
http://localhost:3001
```

Enjoy building the best gift recommendation system! 🎁
