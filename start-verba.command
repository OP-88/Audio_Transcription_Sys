#!/bin/bash
# Verba Auto-Launcher for macOS
# Starts backend and frontend servers, then opens the browser

# Get the directory where this script is located
cd "$(dirname "$0")"

echo "========================================"
echo "     Starting Verba Application"
echo "========================================"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping Verba..."
    
    # Kill processes
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    echo "Verba stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Check if ports are already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[WARNING] Port 8000 already in use. Backend may already be running."
else
    echo "[INFO] Starting backend server..."
    cd backend
    python3 app.py > ../verba-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    
    # Wait for backend to start
    for i in {1..30}; do
        if curl -s http://localhost:8000/ > /dev/null 2>&1; then
            echo "[OK] Backend is ready!"
            break
        fi
        sleep 0.5
    done
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[WARNING] Port 5173 already in use. Frontend may already be running."
else
    echo "[INFO] Starting frontend server..."
    cd frontend
    npm run dev > ../verba-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
    
    # Wait for frontend to start
    for i in {1..30}; do
        if curl -s http://localhost:5173/ > /dev/null 2>&1; then
            echo "[OK] Frontend is ready!"
            break
        fi
        sleep 0.5
    done
fi

# Open browser
echo ""
echo "[INFO] Opening browser..."
sleep 1
open http://localhost:5173

echo ""
echo "========================================"
echo "   Verba is running!"
echo "========================================"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo ""
echo "Logs:"
echo "  Backend:  verba-backend.log"
echo "  Frontend: verba-frontend.log"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Keep script running
wait
