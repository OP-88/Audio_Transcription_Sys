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

### Installation

1. Clone this repository:
```bash
git clone https://github.com/OP-88/Audio_Transcription_Sys.git
cd Audio_Transcription_Sys
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Make launcher executable:
```bash
chmod +x start-verba.sh
```

5. Install desktop launcher (optional):
```bash
mkdir -p ~/.local/share/applications
cp verba.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/
```

### Usage

**Option 1: Desktop Icon**
- Find "Verba" in your applications menu
- Click to launch - browser opens automatically!

**Option 2: Command Line**
```bash
./start-verba.sh
```

The launcher will:
- ✅ Start the backend server
- ✅ Start the frontend server
- ✅ Open your browser automatically
- ✅ You're ready to record!

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
