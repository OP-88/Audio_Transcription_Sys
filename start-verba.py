#!/usr/bin/env python3
"""
Verba Cross-Platform Launcher
Works on Windows, macOS, and Linux
"""
import os
import sys
import time
import subprocess
import webbrowser
import signal
from pathlib import Path

# Colors for terminal output
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'

def print_colored(message, color=Colors.GREEN):
    """Print colored message"""
    print(f"{color}{message}{Colors.END}")

def is_port_in_use(port):
    """Check if a port is already in use"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def main():
    # Get script directory
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print_colored("=" * 40, Colors.BLUE)
    print_colored("     Starting Verba Application", Colors.BLUE)
    print_colored("=" * 40, Colors.BLUE)
    print()
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start backend
        if is_port_in_use(8000):
            print_colored("⚠️  Port 8000 already in use. Backend may already be running.", Colors.YELLOW)
        else:
            print_colored("🚀 Starting backend server...", Colors.GREEN)
            backend_dir = script_dir / "backend"
            
            if sys.platform == "win32":
                backend_process = subprocess.Popen(
                    ["python", "app.py"],
                    cwd=backend_dir,
                    stdout=open("verba-backend.log", "w"),
                    stderr=subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                backend_process = subprocess.Popen(
                    ["python3", "app.py"],
                    cwd=backend_dir,
                    stdout=open("verba-backend.log", "w"),
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid
                )
            
            # Wait for backend
            print("Waiting for backend to initialize...")
            for _ in range(30):
                if is_port_in_use(8000):
                    print_colored("✅ Backend is ready!", Colors.GREEN)
                    break
                time.sleep(0.5)
        
        # Start frontend
        if is_port_in_use(5173):
            print_colored("⚠️  Port 5173 already in use. Frontend may already be running.", Colors.YELLOW)
        else:
            print_colored("🎨 Starting frontend server...", Colors.GREEN)
            frontend_dir = script_dir / "frontend"
            
            if sys.platform == "win32":
                frontend_process = subprocess.Popen(
                    ["npm", "run", "dev"],
                    cwd=frontend_dir,
                    stdout=open("verba-frontend.log", "w"),
                    stderr=subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                    shell=True
                )
            else:
                frontend_process = subprocess.Popen(
                    ["npm", "run", "dev"],
                    cwd=frontend_dir,
                    stdout=open("verba-frontend.log", "w"),
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid
                )
            
            # Wait for frontend
            print("Waiting for frontend to initialize...")
            for _ in range(30):
                if is_port_in_use(5173):
                    print_colored("✅ Frontend is ready!", Colors.GREEN)
                    break
                time.sleep(0.5)
        
        # Open browser
        print()
        print_colored("🌐 Opening browser...", Colors.GREEN)
        time.sleep(1)
        webbrowser.open("http://localhost:5173")
        
        print()
        print_colored("=" * 40, Colors.GREEN)
        print_colored("   Verba is running! 🎉", Colors.GREEN)
        print_colored("=" * 40, Colors.GREEN)
        print()
        print("Frontend: http://localhost:5173")
        print("Backend:  http://localhost:8000")
        print()
        print("Logs:")
        print("  Backend:  verba-backend.log")
        print("  Frontend: verba-frontend.log")
        print()
        print_colored("Press Ctrl+C to stop all servers", Colors.YELLOW)
        print()
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print()
        print_colored("🛑 Stopping Verba...", Colors.YELLOW)
        
        # Kill processes
        if backend_process:
            if sys.platform == "win32":
                backend_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        
        if frontend_process:
            if sys.platform == "win32":
                frontend_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                os.killpg(os.getpgid(frontend_process.pid), signal.SIGTERM)
        
        print_colored("✅ Verba stopped", Colors.GREEN)
        sys.exit(0)

if __name__ == "__main__":
    main()
