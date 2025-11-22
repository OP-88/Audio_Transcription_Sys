"""
Configuration settings for Verba backend
"""
import os

# Feature flags
ONLINE_FEATURES_ENABLED = os.getenv("ONLINE_FEATURES_ENABLED", "false").lower() == "true"

# Model configuration
# Using 'base' model for better accuracy with accents and longer recordings
# tiny = fast but less accurate (~1GB RAM)
# base = balanced accuracy and speed (~2GB RAM) - RECOMMENDED
# small = better accuracy (~3GB RAM)
# medium = excellent accuracy (~5GB RAM)
# large = best accuracy (~10GB RAM)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

# Database
DATABASE_PATH = os.getenv("DATABASE_PATH", "verba_sessions.db")

# Audio processing
ENABLE_AUDIO_PREPROCESSING = os.getenv("ENABLE_AUDIO_PREPROCESSING", "false").lower() == "true"

# CORS - Allow localhost and local network access
default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", default_origins).split(",")

# For network access, we need to allow the local IP
# This is dynamically set to allow any 192.168.x.x or 10.x.x.x network
ALLOW_LOCAL_NETWORK = os.getenv("ALLOW_LOCAL_NETWORK", "true").lower() == "true"
