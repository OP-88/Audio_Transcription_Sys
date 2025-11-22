"""
Audio transcription using faster-whisper (Whisper tiny model)
Includes audio preprocessing for better transcription quality
Falls back to mock transcription if faster-whisper is not available
"""
try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("WARNING: faster-whisper not available. Using mock transcription for testing.")

try:
    from pydub import AudioSegment
    from pydub.effects import normalize
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("WARNING: pydub not available. Audio preprocessing disabled.")

import os
import tempfile

# Initialize model globally (loaded once)
# Import settings to use configured model size
import settings
MODEL_SIZE = settings.WHISPER_MODEL_SIZE
MODEL = None


def get_model():
    """Lazy load the Whisper model"""
    global MODEL
    if not WHISPER_AVAILABLE:
        return None
    if MODEL is None:
        MODEL = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return MODEL


def preprocess_audio(audio_path: str) -> str:
    """
    Preprocess audio for better transcription:
    - Normalize volume
    - Convert to 16kHz mono WAV
    
    Args:
        audio_path: Path to original audio file
    
    Returns:
        Path to preprocessed audio file
    """
    if not PYDUB_AVAILABLE:
        return audio_path
        
    try:
        # Load audio
        audio = AudioSegment.from_file(audio_path)
        
        # Convert to mono if stereo
        if audio.channels > 1:
            audio = audio.set_channels(1)
        
        # Resample to 16kHz (optimal for Whisper)
        audio = audio.set_frame_rate(16000)
        
        # Normalize volume
        audio = normalize(audio)
        
        # Save to temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        audio.export(temp_file.name, format="wav")
        
        return temp_file.name
    except Exception as e:
        # If preprocessing fails, return original file
        print(f"Audio preprocessing failed: {e}. Using original file.")
        return audio_path


def transcribe_audio(audio_path: str, preprocess: bool = True) -> str:
    """
    Transcribe audio file to text using Whisper tiny model
    Falls back to mock transcription if Whisper is not available
    
    Args:
        audio_path: Path to audio file
        preprocess: Whether to preprocess audio before transcription
    
    Returns:
        Transcribed text as a single string
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    # Fallback to mock transcription if Whisper not available
    if not WHISPER_AVAILABLE:
        print(f"Using mock transcription for: {audio_path}")
        return "This is a mock transcription for testing purposes. The meeting discussed project timelines and resource allocation. We need to complete the documentation by next Friday. John will be responsible for the technical specifications."
    
    processed_path = audio_path
    temp_file_created = False
    
    try:
        # Preprocess audio if enabled
        if preprocess:
            processed_path = preprocess_audio(audio_path)
            temp_file_created = (processed_path != audio_path)
        
        print(f"Loading Whisper model ({MODEL_SIZE})...")
        model = get_model()
        print("Model loaded. Starting transcription...")
        
        # Transcribe with faster-whisper
        # Enhanced settings for long recordings and better accent handling:
        # - vad_filter: Remove silent parts for better performance on long recordings
        # - language: Auto-detect for multi-accent support
        # - beam_size=5: Good balance between speed and accuracy
        # - best_of=5: Generate 5 candidates and pick the best
        # - temperature=0: Deterministic output (no randomness)
        # - condition_on_previous_text: Use context from previous segments for better accuracy
        segments, info = model.transcribe(
            processed_path,
            beam_size=5,
            best_of=5,
            temperature=0,
            vad_filter=True,
            condition_on_previous_text=True,
            word_timestamps=False,
            language=None  # Auto-detect language for multi-accent support
        )
        
        print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
        print(f"Audio duration: {info.duration:.2f}s")
        print("Processing segments...")
        
        # Combine all segments into a single transcript
        transcript_parts = []
        for i, segment in enumerate(segments):
            print(f"Processing segment {i+1}...")
            transcript_parts.append(segment.text.strip())
        
        print(f"All {len(transcript_parts)} segments processed.")
        transcript = " ".join(transcript_parts)
        
        if not transcript or len(transcript.strip()) == 0:
            print("Warning: Empty transcript generated")
            return ""
        
        print(f"Transcription complete: {len(transcript)} characters")
        return transcript
    
    finally:
        # Clean up temporary preprocessed file
        if temp_file_created and os.path.exists(processed_path):
            try:
                os.unlink(processed_path)
            except:
                pass
