#!/bin/bash

# Setup script for Present-Agent2 Frontend
# Run this to quickly set up the frontend for the first time

set -e

echo "🎁 Setting up Present-Agent2 Frontend..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Present-Agent2 root directory"
    exit 1
fi

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create .env.local if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "⚙️  Creating frontend/.env.local..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local - please edit with your configuration"
else
    echo "✅ frontend/.env.local already exists"
fi

# Check if root .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: Root .env.local not found"
    echo "   Please create .env.local with your Neo4j and API credentials"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your Neo4j and API credentials (if not done)"
echo "2. Edit frontend/.env.local if needed (default: BACKEND_URL=http://localhost:3000)"
echo "3. Run 'npm run dev' to start both backend and frontend"
echo "4. Open http://localhost:3001 in your browser"
echo ""
echo "For more information, see:"
echo "- FRONTEND_GUIDE.md"
echo "- FRONTEND_COMPLETE.md"
echo "- frontend/README.md"
echo ""
echo "Happy testing! 🎉"
