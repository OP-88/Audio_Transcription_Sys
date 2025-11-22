
import os
import sys
from transcriber import transcribe_audio

# Create a dummy wav file if needed or use an existing one
# For now, let's just check if we can import and load the model
try:
    print("Testing Whisper import...")
    from faster_whisper import WhisperModel
    print("Success!")
    
    print("Loading model...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("Model loaded successfully!")
    
except Exception as e:
    print(f"Error: {e}")
