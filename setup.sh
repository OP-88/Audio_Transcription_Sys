#!/bin/bash
# Verba One-Time Setup Script for Linux/macOS
# Run this once after cloning the repository

set -e

echo "========================================"
echo "   Verba Setup - Installing..."
echo "========================================"
echo ""

# Get script directory
cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found. Please install Python 3.8+"
    exit 1
fi

# Check Node/npm
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is required but not found. Please install Node.js 16+"
    exit 1
fi

echo "✅ Python and Node.js found"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Make launchers executable
echo "🔧 Making launchers executable..."
chmod +x start-verba.sh start-verba.command start-verba.py setup-audio.sh
echo "✅ Launchers ready"
echo ""

# Install desktop icon (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🖼️  Installing desktop icon..."
    mkdir -p ~/.local/share/applications
    cp verba.desktop ~/.local/share/applications/
    update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
    echo "✅ Desktop icon installed - look for 'Verba' in your applications menu"
    echo ""
fi

echo "========================================"
echo "   Setup Complete! 🎉"
echo "========================================"
echo ""
echo "You can now launch Verba:"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  Double-click: start-verba.command"
    echo "  Or run: ./start-verba.command"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  1. Click 'Verba' in your applications menu"
    echo "  2. Or run: ./start-verba.sh"
else
    echo "  Run: ./start-verba.sh"
fi

echo "  Or use cross-platform: python3 start-verba.py"
echo ""
