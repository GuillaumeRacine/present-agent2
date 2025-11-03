# Present Agent Frontend

Modern web interface for testing and iterating on the Present-Agent2 gift recommendation system.

## Features

### 🎁 Home - Chat UI
Interactive chat interface to test gift recommendations in real-time:
- Natural conversation flow
- Real-time streaming responses
- Display of recommendations with reasoning
- Confidence scores and tags
- Clean, intuitive design

### 📋 Conversation Logs
View and analyze all past test conversations:
- List of all conversations with filtering (all/success/errors)
- Detailed view of each conversation
- Agent execution trace with timings
- Full response data in JSON format
- Quick search and filtering

### 📦 Products Explorer
Browse and understand the product database:
- Browse all 41,686 products
- Filter by category, interest, price range
- Search functionality
- Detailed product information
- View facets and relationships
- Statistics dashboard

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API server running (port 3000)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
# BACKEND_URL=http://localhost:3000
```

### Running the Frontend

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The frontend will be available at `http://localhost:3001`

### Running Full Stack

From the root directory:

```bash
# Run both backend API and frontend simultaneously
npm run dev
```

This starts:
- Backend API server on port 3000
- Frontend dev server on port 3001

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Home - Chat UI
│   ├── logs/
│   │   └── page.tsx          # Conversation Logs
│   ├── products/
│   │   └── page.tsx          # Products Explorer
│   ├── api/                  # API routes (proxy to backend)
│   │   ├── chat/
│   │   ├── logs/
│   │   └── products/
│   ├── layout.tsx            # Root layout with navigation
│   └── globals.css           # Global styles
├── public/                   # Static assets
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json
```

## API Routes

The frontend includes API routes that proxy requests to the backend:

### POST `/api/chat`
Send a user query and get recommendations.

**Request:**
```json
{
  "query": "Gift for my mom who loves gardening, budget $50-100",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Response:**
```json
{
  "intro": "Here are some recommendations...",
  "recommendations": [...],
  "executionTime": 23458,
  "agentTimings": {...}
}
```

### GET `/api/logs`
Get list of conversation logs.

**Query params:**
- `filter`: all | success | error
- `limit`: number of logs to return

### GET `/api/logs/[sessionId]`
Get detailed information about a specific conversation.

### GET `/api/products`
Search and filter products.

**Query params:**
- `search`: search term
- `category`: category name or "all"
- `interest`: interest name or "all"
- `minPrice`, `maxPrice`: price range
- `limit`: number of results

### GET `/api/products/stats`
Get product database statistics.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **API Communication**: Fetch API
- **Development**: Hot Module Replacement

## Design Principles

### Usability
- Clean, intuitive interface
- Responsive design (desktop & mobile)
- Real-time feedback
- Error handling with clear messages

### Performance
- Optimized bundle size
- Lazy loading where appropriate
- Efficient re-renders
- Caching strategies

### Developer Experience
- TypeScript for type safety
- Component-based architecture
- Clear file organization
- Comprehensive error logging

## Pages Overview

### Chat UI (Home)
**Purpose**: Test the recommendation system interactively

**Features:**
- Message history with scrolling
- User input with validation
- Loading states
- Recommendation cards with:
  - Product details
  - Reasoning explanation
  - Confidence scores
  - Tags
- Response time tracking

### Conversation Logs
**Purpose**: Review and analyze past test sessions

**Features:**
- List view with filters
- Success/error indicators
- Search functionality
- Detailed execution trace
- Agent timing breakdown
- Full JSON response viewer

### Products Explorer
**Purpose**: Understand the product database

**Features:**
- Statistics dashboard
- Multi-filter support
- Product grid view
- Detailed product drawer
- Category and interest browsing
- Price range filtering

## Development Tips

### Hot Reload
Changes to React components update instantly without losing state.

### TypeScript
All components are fully typed for better developer experience and fewer bugs.

### Tailwind CSS
Use utility classes for styling. See `tailwind.config.ts` for custom theme.

### API Proxying
API routes in `/app/api` proxy to the backend, handling CORS automatically.

## Environment Variables

```env
# Backend API URL
BACKEND_URL=http://localhost:3000

# Optional: Neo4j connection for direct queries
NEO4J_URL=your_neo4j_url
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

## Troubleshooting

### Frontend won't start
- Check Node.js version (18+)
- Delete `node_modules` and `.next`, then reinstall
- Check for port conflicts (3001)

### Can't connect to backend
- Ensure backend is running on port 3000
- Check `BACKEND_URL` in `.env.local`
- Check browser console for CORS errors

### Styles not updating
- Restart dev server
- Clear `.next` cache
- Check Tailwind configuration

## Future Enhancements

- [ ] Real-time conversation persistence
- [ ] User authentication
- [ ] Export conversation history
- [ ] Advanced filtering in logs
- [ ] Product comparison view
- [ ] Analytics dashboard
- [ ] Dark mode toggle
- [ ] Mobile app version

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR with description

## License

Part of the Present-Agent2 project.
