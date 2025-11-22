#!/bin/bash
# Verba Auto-Launcher Script
# Starts backend and frontend servers, then opens the browser

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Starting Verba Application    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

# Check if ports are already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 8000 already in use. Backend may already be running.${NC}"
else
    echo -e "${GREEN}🚀 Starting backend server...${NC}"
    cd backend
    python3 app.py > /tmp/verba-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    
    # Wait for backend to start
    echo "Waiting for backend to initialize..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/ > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready!${NC}"
            break
        fi
        sleep 0.5
    done
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 5173 already in use. Frontend may already be running.${NC}"
else
    echo -e "${GREEN}🎨 Starting frontend server...${NC}"
    cd frontend
    npm run dev > /tmp/verba-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
    
    # Wait for frontend to start
    echo "Waiting for frontend to initialize..."
    for i in {1..30}; do
        if curl -s http://localhost:5173/ > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is ready!${NC}"
            break
        fi
        sleep 0.5
    done
fi

# Open browser
echo ""
echo -e "${GREEN}🌐 Opening browser...${NC}"
sleep 1

# Try different browser commands
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173 &
elif command -v gnome-open > /dev/null; then
    gnome-open http://localhost:5173 &
elif command -v open > /dev/null; then
    open http://localhost:5173 &
else
    echo -e "${YELLOW}Could not detect browser. Please open http://localhost:5173 manually${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Verba is running! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo ""
echo "Logs:"
echo "  Backend:  /tmp/verba-backend.log"
echo "  Frontend: /tmp/verba-frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping Verba...${NC}"
    
    # Kill frontend and backend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✅ Verba stopped${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Keep script running
wait
