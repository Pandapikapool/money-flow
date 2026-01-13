#!/bin/bash

# Money Flow - Start Script
# Runs both backend and frontend

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Money Flow..."
echo "Checking requirements..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version (minimum v18)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18 or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "   npm should come with Node.js"
    exit 1
fi

# Check for PostgreSQL (optional check - just warn if not found)
if ! command -v psql &> /dev/null; then
    echo "⚠️  Warning: PostgreSQL (psql) not found in PATH"
    echo "   Make sure PostgreSQL is installed and running"
else
    echo "✅ PostgreSQL found: $(psql --version)"
fi

# Check if node_modules exist
if [ ! -d "$DIR/backend/node_modules" ]; then
    echo "⚠️  Backend dependencies not installed. Installing..."
    (cd "$DIR/backend" && npm install)
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
    echo "⚠️  Frontend dependencies not installed. Installing..."
    (cd "$DIR/frontend" && npm install)
fi

echo "✅ Requirements check complete"
echo ""

# Kill any existing processes on ports 3000 and 5173
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend on port 3000..."
(cd "$DIR/backend" && npm run dev) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "Starting frontend on port 5173..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "========================================"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo "========================================"
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
