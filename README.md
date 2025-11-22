# Audio Transcription System (Verba)

![Verba Icon](verba-icon.png)

**Offline-first meeting assistant with transcription and summarization**

A privacy-focused audio transcription system that runs entirely locally on your machine. Perfect for recording Zoom meetings, lectures, interviews, or any audio content with automatic transcription and AI-powered summarization.

## ✨ Features

- 🎤 **Audio Recording** - Record system audio and microphone simultaneously
- 📝 **Automatic Transcription** - Using OpenAI's Whisper model (runs locally)
- 🤖 **AI Summarization** - Get key points, decisions, and action items
- 💾 **Session Management** - Save, browse, and export your recordings
- 🔒 **100% Private** - No cloud, no tracking, everything runs locally
- 🚀 **One-Click Launch** - Desktop icon that auto-starts everything
- 🌐 **Browser-Based** - Simple web interface, no installation needed

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **FFmpeg** (for audio processing)
- **PulseAudio** (Linux only, for system audio capture)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/OP-88/Audio_Transcription_Sys.git
cd Audio_Transcription_Sys
```

2. **Run the setup script:**

**Windows:**
```cmd
setup.bat
```

**macOS/Linux:**
```bash
./setup.sh
```

That's it! The setup script will:
- ✅ Install backend dependencies (Python packages)
- ✅ Install frontend dependencies (Node packages)
- ✅ Make launchers executable
- ✅ Install desktop icon (Linux only)

### Launch Verba

Choose the method for your platform:

#### 🪟 Windows
**Option 1** (Double-click):
- Double-click `start-verba.bat` in File Explorer

**Option 2** (Command Line):
```cmd
start-verba.bat
```

#### 🍎 macOS
**Option 1** (Double-click):
- Double-click `start-verba.command` in Finder
- *First time:* Right-click → Open → Confirm

**Option 2** (Terminal):
```bash
./start-verba.command
```

#### 🐧 Linux
**Option 1** (Desktop Icon):
- Install desktop launcher:
  ```bash
  mkdir -p ~/.local/share/applications
  cp verba.desktop ~/.local/share/applications/
  update-desktop-database ~/.local/share/applications/
  ```
- Find "Verba" in your applications menu and click to launch

**Option 2** (Terminal):
```bash
./start-verba.sh
```

#### 🌍 Cross-Platform (Any OS)
Use the Python launcher:
```bash
python start-verba.py
# or
python3 start-verba.py
```

### What Happens Next

The launcher will:
1. ✅ Start the backend server (http://localhost:8000)
2. ✅ Start the frontend server (http://localhost:5173)
3. ✅ Open your browser automatically
4. ✅ You're ready to record!

### For Zoom Meetings

1. Launch Verba before or during your meeting
2. Click "Record" in the browser
3. Select "Monitor of Verba Combined Audio" as your input
4. Join/continue your Zoom meeting
5. Click "Stop" when done
6. Get instant transcription and summary!

## 🎵 Audio Setup (Linux)

The system automatically configures PulseAudio to capture both system audio and microphone. You'll be able to **hear** what's playing while it's being recorded.

To manually setup audio:
```bash
./setup-audio.sh
```

Then in your browser, select **"Monitor of Verba Combined Audio"** as the audio input.

## 📁 Project Structure

```
Audio_Transcription_Sys/
├── backend/           # FastAPI server
│   ├── app.py        # Main API server
│   ├── transcriber.py # Whisper integration
│   ├── summarizer.py  # AI summarization
│   └── storage.py     # Session management
├── frontend/          # React + Vite UI
│   └── src/
│       ├── components/
│       └── api.js
├── start-verba.sh     # Auto-launcher script
├── setup-audio.sh     # Audio configuration
└── verba.desktop      # Desktop entry
```

## 🛠️ Configuration

### Backend (`backend/settings.py`)
- Whisper model size (base, small, medium, large)
- Device (CPU/CUDA)
- Audio preprocessing options

### Frontend
- Runs on http://localhost:5173
- Backend API on http://localhost:8000

## 🔧 Requirements

- Python 3.8+
- Node.js 16+
- PulseAudio (Linux)
- FFmpeg (for audio processing)

## 📝 License

GPL-3.0 License

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📧 Support

For issues and questions, please visit the [Issues](https://github.com/OP-88/Audio_Transcription_Sys/issues) page.

---

**Built with ❤️ for privacy and local-first software**
