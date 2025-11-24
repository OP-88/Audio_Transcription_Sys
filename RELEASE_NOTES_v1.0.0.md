# Release v1.0.0 -  Cross-Platform Audio Transcription System

## 🎉 First Stable Release

Verba is now available for **Windows, macOS, and Linux** with one-command setup and app launcher icons on all platforms!

## 📥 Installation

### 1. Download

**Option A:** Clone with Git
```bash
git clone https://github.com/OP-88/Audio_Transcription_Sys.git
cd Audio_Transcription_Sys
```

**Option B:** Download ZIP
- Click "Code" → "Download ZIP" on GitHub
- Extract the ZIP file
- Open terminal/command prompt in the extracted folder

### 2. Run Setup (One Command!)

**Windows:**
```cmd
setup.bat
```

**macOS/Linux:**
```bash
./setup.sh
```

The setup script will automatically:
- ✅ Install all Python dependencies
- ✅ Install all Node.js dependencies
- ✅ Create app launcher/shortcut
  - Windows: Start Menu shortcut
  - macOS: Verba.app in Applications
  - Linux: Desktop icon in applications menu

### 3. Launch Verba

**Windows:**
- Search for "Verba" in Start Menu, or
- Double-click `start-verba.bat`

**macOS:**
- Find "Verba" in Launchpad, or
- Open Verba.app from Applications folder
- Or double-click `start-verba.command`

**Linux:**
- Click "Verba" in your applications menu, or
- Run `./start-verba.sh`

**Any Platform:**
```bash
python start-verba.py
```

## ✨ Features

- 🎤 **Microphone Recording** - Works on all platforms out-of-the-box
- 🔊 **System Audio Capture** - Record Zoom, browser audio, etc.
  - Windows: Stereo Mix or VB-Audio Cable (setup required)
  - macOS: Browser screen sharing or BlackHole (optional)
  - Linux: Automatic PulseAudio setup (works immediately)
- 📝 **Automatic Transcription** - Using OpenAI's Whisper (runs locally)
- 🤖 **AI Summarization** - Get key points, decisions, and action items
- 💾 **Session Management** - Save, browse, and export recordings
- 🔒 **100% Private** - No cloud, no tracking, everything local
- 🚀 **One-Click Launch** - App icons on all platforms
- 🌐 **Browser-Based** - Clean web interface

## 📋 Requirements

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **FFmpeg** (for audio processing)
- **For System Audio:**
  - Windows: Stereo Mix or VB-Audio Cable
  - macOS: BlackHole (optional) or browser screen sharing
  - Linux: PulseAudio (auto-configured)

## 🎯 Perfect for

- Recording Zoom/Teams meetings
- Lecture transcription
- Interview documentation
- Podcast production
- Any audio transcription needs

## 🐛 Known Issues

None reported yet! Please open an issue if you find any problems.

## 📝 License

GPL-3.0 License

---

**Enjoy your privacy-first audio transcription system! 🎉**
