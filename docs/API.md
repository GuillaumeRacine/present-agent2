# API Documentation

Complete API reference for Present-Agent2 backend and frontend endpoints.

## Base URLs

- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:3001`

---

## Backend API (`http://localhost:3000`)

### Recommendation Endpoint

#### POST `/api/recommend`

Generate personalized gift recommendations.

**Request Body**:
```json
{
  "userQuery": "Gift for my mom who loves gardening, budget $50-100",
  "userId": "user-123",
  "sessionId": "session-abc-456"
}
```

**Parameters**:
- `userQuery` (string, required): Natural language query describing gift need
- `userId` (string, optional): User identifier for history tracking (defaults to "anonymous")
- `sessionId` (string, optional): Session identifier for conversation tracking (auto-generated if omitted)

**Response** (200 OK):
```json
{
  "finalRecommendations": {
    "conversationalIntro": "I see you're looking for a thoughtful gift...",
    "conversationalOutro": "Let me know if you need more options!",
    "recommendations": [
      {
        "rank": 1,
        "product": {
          "id": "12345",
          "title": "Premium Gardening Tool Set",
          "description": "Professional-grade tools...",
          "price": 79.99,
          "vendor": "Garden Pro"
        },
        "reasoning": "This set would be perfect because...",
        "confidenceScore": 0.92,
        "tags": ["practical", "high-quality", "outdoor"]
      }
    ]
  },
  "contextExtraction": {
    "recipient": {...},
    "occasion": "...",
    "budget": {...}
  },
  "performance": {
    "totalExecutionTimeMs": 25340,
    "agentTimings": {
      "listener": 3500,
      "memory": 5200,
      "relationship": 4100,
      ...
    }
  }
}
```

**Error Response** (400):
```json
{
  "error": "userQuery is required"
}
```

**Error Response** (500):
```json
{
  "error": "Internal server error"
}
```

---

### Conversation History Endpoints

#### GET `/api/conversations`

Retrieve conversation history with optional filters.

**Query Parameters**:
- `userId` (string, optional): Filter by user ID
- `sessionId` (string, optional): Filter by session ID
- `success` (boolean, optional): Filter by success status
- `startDate` (ISO date, optional): Start of date range
- `endDate` (ISO date, optional): End of date range
- `limit` (number, optional): Max results (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)

**Example Request**:
```
GET /api/conversations?userId=user-123&limit=10&success=true
```

**Response** (200 OK):
```json
{
  "conversations": [
    {
      "sessionId": "session-abc-456",
      "userId": "user-123",
      "timestamp": "2025-10-29T14:04:53.793Z",
      "query": "Gift for my mom who loves gardening",
      "success": true,
      "executionTimeMs": 25340,
      "recommendationCount": 5,
      "conversationalIntro": "...",
      "conversationalOutro": "...",
      "agentTimings": {
        "listener": 3500,
        "memory": 5200,
        ...
      },
      "error": null
    }
  ],
  "total": 1
}
```

#### GET `/api/conversations/:sessionId`

Get detailed conversation by session ID.

**Parameters**:
- `sessionId` (path parameter): Session identifier

**Example Request**:
```
GET /api/conversations/session-abc-456
```

**Response** (200 OK):
```json
{
  "sessionId": "session-abc-456",
  "userId": "user-123",
  "timestamp": "2025-10-29T14:04:53.793Z",
  "query": "Gift for my mom who loves gardening",
  "success": true,
  "executionTimeMs": 25340,
  "recommendationCount": 5,
  "agentTimings": {...},
  "recommendations": [
    {
      "rank": 1,
      "product": {...},
      "reasoning": "...",
      "confidenceScore": 0.92,
      "tags": [...]
    }
  ],
  "contextExtracted": {...},
  "error": null,
  "conversationalIntro": "...",
  "conversationalOutro": "..."
}
```

**Error Response** (404):
```json
{
  "error": "Conversation not found"
}
```

#### GET `/api/conversations/stats`

Get conversation statistics.

**Query Parameters**:
- `userId` (string, optional): Filter stats by user

**Example Request**:
```
GET /api/conversations/stats?userId=user-123
```

**Response** (200 OK):
```json
{
  "totalConversations": 15,
  "successfulConversations": 14,
  "totalRecommendations": 70,
  "avgExecutionTimeMs": 23456.7
}
```

---

### Product Endpoints

#### GET `/api/products/stats`

Get product database statistics.

**Response** (200 OK):
```json
{
  "totalProducts": 41686,
  "totalFacets": 105731,
  "totalCategories": 27,
  "totalInterests": 156,
  "topCategories": [],
  "topInterests": []
}
```

#### GET `/api/products`

Search and filter products.

**Query Parameters**:
- `search` (string, optional): Search in name/description
- `category` (string, optional): Filter by category (default: "all")
- `interest` (string, optional): Filter by interest (default: "all")
- `minPrice` (number, optional): Minimum price (default: 0)
- `maxPrice` (number, optional): Maximum price (default: 1000)
- `limit` (number, optional): Max results (default: 50)

**Example Request**:
```
GET /api/products?search=coffee&minPrice=20&maxPrice=100&limit=10
```

**Response** (200 OK):
```json
{
  "products": [
    {
      "id": "12345",
      "name": "Premium Coffee Maker",
      "description": "...",
      "price": 79.99,
      "vendor": "Coffee Co",
      "category": "Kitchen & Dining",
      "facets": ["electric", "programmable"],
      "interests": ["coffee", "cooking"]
    }
  ],
  "total": 10
}
```

---

### Health Check

#### GET `/health`

Check server health status.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T14:30:00.000Z"
}
```

---

## Frontend API (`http://localhost:3001/api`)

Frontend API routes proxy to the backend API.

### POST `/api/chat`

Chat endpoint for frontend UI.

**Request Body**:
```json
{
  "query": "Gift for my dad who loves coffee",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Response** (200 OK):
```json
{
  "intro": "I see you're looking for...",
  "outro": "Let me know if...",
  "recommendations": [...],
  "executionTime": 25340
}
```

### GET `/api/logs`

Get conversation logs (proxies to `/api/conversations`).

**Query Parameters**:
- `filter` (string): "all" | "success" | "error"
- `limit` (number): Max results
- `userId` (string): Filter by user

**Response**:
```json
{
  "logs": [...]
}
```

### GET `/api/logs/[sessionId]`

Get log details (proxies to `/api/conversations/:sessionId`).

**Response**:
```json
{
  "sessionId": "...",
  "userId": "...",
  "query": "...",
  "recommendations": [...],
  "agentTimings": {...}
}
```

### GET `/api/products`

Product search (proxies to backend `/api/products`).

### GET `/api/products/stats`

Product stats (proxies to backend `/api/products/stats`).

---

## Error Handling

All endpoints use consistent error format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting implemented. Recommended for production deployment.

---

## Authentication

Currently no authentication required. All endpoints are public. Recommended to add authentication for production deployment with user-specific data.

---

## CORS

Backend has CORS enabled for all origins in development. Configure appropriately for production.

---

## WebSocket Support

Not currently implemented. Could be added for real-time recommendation updates.

---

**Last Updated**: October 29, 2025
