# Quick Start Guide - Present-Agent2 🎁

## 🚀 One Command Setup

```bash
npm run dev
```

This single command will:
1. ✅ Start the backend API server (http://localhost:3000)
2. ⏳ Wait for it to be ready
3. ✅ Start the frontend UI (http://localhost:3001)

Then open your browser to: **http://localhost:3001**

---

## 🔧 Environment Setup

Most setups need two env files:

- Backend (repo root): `.env.local` — copy from `.env.local.example` and fill values
  - Required: `NEO4J_URL`, `NEO4J_PASSWORD` (and optionally `NEO4J_DATABASE`)
  - Username: use `NEO4J_USERNAME` (or `NEO4J_USER`, both supported)
  - LLM keys (recommended): `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`
  - `BACKEND_PORT=3000`, `FRONTEND_URL=http://localhost:3001`

- Frontend: `frontend/.env.local`
  - `BACKEND_URL=http://localhost:3000`

Verify configuration:

```bash
npm run env:check
```
This checks required variables, verifies Neo4j connectivity, and validates LLM keys when set.

---

## 📱 What You'll See

### Modern Chat Interface
- **Dark mode** by default for comfortable viewing
- **Smooth animations** as products appear
- **Mobile-responsive** design that works on any device
- **Product comparison** - select multiple gifts to compare side-by-side

### Key Features
1. **ChatGPT-style UI** - Natural conversation flow
2. **Smart Product Cards** - Each recommendation shows:
   - Product details (price, vendor, description)
   - AI reasoning ("Why this gift?")
   - Confidence score with visual progress bar
   - Selection checkbox for comparison
3. **Product Comparison View** - Compare multiple gifts:
   - Side-by-side product cards
   - Feature comparison table
   - Mobile-optimized horizontal scroll
4. **Responsive Design** - Works beautifully on:
   - Desktop (full features)
   - Tablet (optimized layout)
   - Mobile (streamlined interface)

---

## 💬 Try These Queries

```
Gift for my mom who loves gardening, budget $50-100
```

```
Birthday gift for my tech-savvy dad, budget around $150
```

```
Anniversary gift for my wife, she loves cooking
```

```
Last-minute gift for a coworker who likes coffee
```

---

## ✨ New Features Added

### 1. Sequential Startup
- Backend starts first and waits to be healthy
- Frontend starts only when backend is ready
- No more connection errors!

### 2. Dark Mode UI
- Minimal, clean design
- Easy on the eyes
- Professional appearance

### 3. Product Comparison
- Select multiple products (click checkbox)
- Click "Compare (N)" button
- View side-by-side comparison
- Feature table for quick reference

### 4. Mobile-Responsive
- Adapts to any screen size
- Touch-friendly buttons
- Streamlined mobile navigation
- Optimized spacing and typography

### 5. Smooth Animations
- Messages fade in gracefully
- Product cards slide up
- Typing indicator shows AI is thinking
- Loading button with animated dots
- Hover effects on interactive elements

### 6. Better UX
- Clear visual hierarchy
- Confidence bars instead of just percentages
- "Why this gift?" section for each product
- Selection state with visual feedback
- Sticky navigation bar

---

## 🎯 How to Use Product Comparison

1. **Get recommendations** by typing a query
2. **Select products** by clicking the checkbox on each card (top-right)
3. **Click "Compare (N)"** button that appears in the header
4. **Review comparison**:
   - See all selected products side-by-side
   - Review feature comparison table
   - Read each product's reasoning
   - Compare confidence scores
5. **Close comparison** to return to chat

---

## 📊 Pages Available

### 1. Chat (Home) - `/`
Interactive gift recommendation chat

### 2. Logs - `/logs`
View all past conversations and performance metrics

### 3. Products - `/products`
Explore the 41,704 products in the database

---

## 🛠️ Alternative Commands

```bash
# Old way (both start simultaneously)
npm run dev:parallel

# Backend only
npm run server

# Frontend only (requires backend running)
cd frontend && npm run dev

# CLI chat (terminal-based, no UI)
npm run chat
```

---

## 📱 Mobile Experience

The UI automatically adapts:

**Desktop (>768px)**
- Full navigation labels
- Spacious layout
- Larger product images
- All features visible

**Tablet (768px - 1024px)**
- Compact navigation
- Optimized spacing
- Medium product images

**Mobile (<768px)**
- Icon-only navigation
- Streamlined layout
- Smaller, efficient cards
- Swipe-friendly comparison table

---

## 🎨 Dark Mode

The app uses a carefully crafted dark theme:
- **Background**: Very dark gray (#121212)
- **Cards**: Slightly lighter gray (#1A1A1A)
- **Text**: High-contrast white/gray
- **Accents**: Subtle green for primary actions
- **Borders**: Minimal, subtle lines

---

## ⚡ Performance

**Backend Response Times:**
- Typical query: 25-30 seconds
- Uses 10-agent system for quality recommendations

**Frontend:**
- Instant UI interactions
- Smooth 60fps animations
- Optimized bundle size
- Progressive loading

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill

# Restart
npm run dev
```

### Frontend connection error
1. Make sure backend is running (http://localhost:3000/health)
2. Check frontend .env.local has: `BACKEND_URL=http://localhost:3000`
3. Restart frontend

### Styles not loading
```bash
cd frontend
rm -rf .next node_modules
npm install
cd ..
npm run dev
```

---

## 🎓 Next Steps

1. **Try the comparison feature** - Select 2-3 products and compare them
2. **Test on mobile** - Open on your phone to see responsive design
3. **Explore the logs** - Click "Logs" to see conversation history
4. **Browse products** - Click "Products" to explore the database

---

## 🚀 That's It!

You're all set. Just run:

```bash
npm run dev
```

And start finding perfect gifts! 🎁

---

**Need help?** Check the main [README.md](README.md) for detailed documentation.
