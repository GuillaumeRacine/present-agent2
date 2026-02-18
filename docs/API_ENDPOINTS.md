# API Endpoints

Backend (Express, port 3000) and Frontend (Next.js, port 3001).

---

## Backend (`http://localhost:3000`)

### Recommendations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/recommend` | Generate gift recommendations from natural language query |

**Request:** `{ userQuery, userId?, sessionId? }`
**Response:** `{ finalRecommendations, contextExtraction, performance }`

### Conversations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/conversations` | List conversations (filters: userId, sessionId, success, date range) |
| `GET` | `/api/conversations/:sessionId` | Get conversation detail |
| `GET` | `/api/conversations/stats` | Conversation statistics |

### Products

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/products` | Search/filter products (search, category, interest, price range) |
| `GET` | `/api/products/stats` | Product database statistics |

### Feedback

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/feedback` | Capture user feedback (like, dislike, purchase, click) |

### Health

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Server + database health check |

---

## Frontend (`http://localhost:3001`)

Next.js API routes that proxy to the backend.

| Method | Endpoint | Proxies To |
|--------|----------|------------|
| `POST` | `/api/chat` | `/api/recommend` |
| `GET` | `/api/logs` | `/api/conversations` |
| `GET` | `/api/logs/[sessionId]` | `/api/conversations/:sessionId` |
| `GET` | `/api/products` | `/api/products` |
| `GET` | `/api/products/stats` | `/api/products/stats` |

### Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Chat UI - main recommendation interface |
| `/logs` | Conversation logs viewer |
| `/products` | Product explorer/browser |

---

## Full API Documentation

See `src/docs/API.md` for complete request/response schemas with examples.

---

*Last updated: 2026-02-17*
