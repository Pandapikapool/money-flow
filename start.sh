#!/bin/bash

# Money Flow - Start Script
# Runs both backend and frontend

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Money Flow..."

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
