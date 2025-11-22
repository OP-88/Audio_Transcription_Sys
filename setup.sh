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

# Install application launcher based on OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🖼️  Installing desktop icon..."
    mkdir -p ~/.local/share/applications
    cp verba.desktop ~/.local/share/applications/
    update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
    echo "✅ Desktop icon installed - look for 'Verba' in your applications menu"
    echo ""
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🖼️  Creating macOS Application..."
    
    # Create .app bundle in user Applications folder
    APP_DIR="$HOME/Applications/Verba.app"
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"
    
    # Copy launcher script
    cp start-verba.command "$APP_DIR/Contents/MacOS/Verba"
    
    # Copy icon
    if [ -f "verba-icon.png" ]; then
        # Convert PNG to ICNS if possible (requires imagemagick/sips)
        if command -v sips &> /dev/null; then
            sips -s format icns verba-icon.png --out "$APP_DIR/Contents/Resources/Verba.icns" 2>/dev/null || \
            cp verba-icon.png "$APP_DIR/Contents/Resources/Verba.png"
        else
            cp verba-icon.png "$APP_DIR/Contents/Resources/Verba.png"
        fi
    fi
    
    # Create Info.plist
    cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Verba</string>
    <key>CFBundleIconFile</key>
    <string>Verba</string>
    <key>CFBundleIdentifier</key>
    <string>com.verba.app</string>
    <key>CFBundleName</key>
    <string>Verba</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>
EOF
    
    echo "✅ Verba.app created in ~/Applications - find it in Launchpad or Finder"
    echo ""
fi

echo "========================================"
echo "   Setup Complete! 🎉"
echo "========================================"
echo ""
echo "You can now launch Verba:"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  1. Open Launchpad and search for 'Verba'"
    echo "  2. Or find Verba.app in ~/Applications"
    echo "  3. Or double-click: start-verba.command"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  1. Click 'Verba' in your applications menu"
    echo "  2. Or run: ./start-verba.sh"
else
    echo "  Run: ./start-verba.sh"
fi

echo "  Or use cross-platform: python3 start-verba.py"
echo ""
