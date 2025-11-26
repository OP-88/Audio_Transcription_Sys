"""
Verba Backend - FastAPI server for audio transcription, summarization, and session management
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import tempfile
import os
import sys
from pathlib import Path
from datetime import datetime
import logging

# Import our modules
from transcriber import transcribe_audio
from summarizer import summarize_transcript
from storage import storage
from chunk_storage import ChunkStorage
import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Verba API", version="0.2.0", description="Offline-first meeting assistant")

# Detect if running as PyInstaller bundle
def is_bundled():
    return getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')

# Get the base path (either development or bundled)
def get_base_path():
    if is_bundled():
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "tauri://localhost",
    "https://tauri.localhost"
]

# Add any configured origins
origins.extend(settings.ALLOWED_ORIGINS)

# Remove duplicates
origins = list(set(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"(http|https|tauri)://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files if running as bundled app (Windows installer, etc.)
if is_bundled():
    static_dir = get_base_path() / "frontend" / "dist"
    if static_dir.exists():
        logger.info(f"Running as bundled app, serving static files from: {static_dir}")
        # Mount static assets
        app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")
    else:
        logger.warning(f"Static directory not found: {static_dir}")


# Request/Response models
class SummarizeRequest(BaseModel):
    """Request body for summarization endpoint"""
    transcript: str
    save_session: bool = True
    title: str = None


class SaveSessionRequest(BaseModel):
    """Request body for saving a session directly"""
    transcript: str
    title: str = None
    summary: dict = {}


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: str = ""


# Root endpoints
@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Verba API",
        "version": "0.2.0",
        "online_features": settings.ONLINE_FEATURES_ENABLED
    }


@app.get("/api/status")
def status():
    """Get system status and configuration"""
    return {
        "online_features_enabled": settings.ONLINE_FEATURES_ENABLED,
        "model": settings.WHISPER_MODEL_SIZE,
        "device": settings.WHISPER_DEVICE,
        "audio_preprocessing": settings.ENABLE_AUDIO_PREPROCESSING
    }


# Transcription endpoint
@app.post("/api/transcribe")
async def transcribe_endpoint(audio: UploadFile = File(...)):
    """
    Transcribe uploaded audio file
    """
    # Create temporary file to save uploaded audio
    tmp_path = None
    try:
        # Validate file type
        if not audio.filename.endswith(('.webm', '.wav', '.mp3', '.m4a')):
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid file format. Supported: webm, wav, mp3, m4a"}
            )
        
        # Save uploaded file to temp location
        suffix = os.path.splitext(audio.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        logger.info(f"Transcribing audio file: {audio.filename} ({len(content)} bytes)")
        
        # Transcribe
        transcript = transcribe_audio(tmp_path, preprocess=settings.ENABLE_AUDIO_PREPROCESSING)
        
        return {
            "transcript": transcript,
            "status": "success"
        }
    
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Transcription failed. Please try recording again.",
                "detail": str(e)
            }
        )
    
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")


# Summarization endpoint
@app.post("/api/summarize")
async def summarize(request: SummarizeRequest):
    """
    Summarize a transcript into structured notes
    Optionally saves as a session
    """
    try:
        if not request.transcript or len(request.transcript.strip()) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "No transcript provided"}
            )
        
        logger.info(f"Summarizing transcript: {len(request.transcript)} characters")
        
        # Generate summary
        summary = summarize_transcript(request.transcript)
        
        # Save as session if requested
        session_id = None
        if request.save_session:
            try:
                session_id = storage.create_session(request.transcript, summary, request.title)
                logger.info(f"Session saved: {session_id}")
            except Exception as e:
                logger.error(f"Failed to save session: {e}")
                # Don't fail the request if storage fails
        
        response = {
            "summary": summary,
            "status": "success"
        }
        
        if session_id:
            response["session_id"] = session_id
        
        return JSONResponse(response)
    
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to generate summary. Please try again.",
                "detail": str(e)
            }
        )


class UpdateSessionRequest(BaseModel):
    """Request body for updating a session"""
    title: str = None
    transcript: str = None
    summary: dict = None


# Direct Session Save endpoint
@app.post("/api/sessions")
async def create_session(request: SaveSessionRequest):
    """
    Save a session directly without summarization
    """
    try:
        if not request.transcript or len(request.transcript.strip()) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "No transcript provided"}
            )
            
        session_id = storage.create_session(request.transcript, request.summary, request.title)
        logger.info(f"Session saved manually: {session_id}")
        
        return {
            "session_id": session_id,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Failed to save session: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to save session",
                "detail": str(e)
            }
        )


@app.put("/api/sessions/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest):
    """
    Update an existing session
    """
    try:
        success = storage.update_session(
            session_id, 
            title=request.title,
            transcript=request.transcript,
            summary=request.summary
        )
        
        if not success:
            return JSONResponse(
                status_code=404,
                content={"error": "Session not found"}
            )
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to update session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to update session",
                "detail": str(e)
            }
        )


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """
    Delete a session by ID
    """
    try:
        success = storage.delete_session(session_id)
        
        if not success:
            return JSONResponse(
                status_code=404,
                content={"error": "Session not found"}
            )
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete session",
                "detail": str(e)
            }
        )


# Chunk upload endpoints for long recordings
class InitializeRecordingRequest(BaseModel):
    """Request body for initializing a recording session"""
    session_id: str
    mime_type: str = "audio/webm"


@app.post("/api/recording/initialize")
async def initialize_recording(request: InitializeRecordingRequest):
    """
    Initialize a new recording session for progressive chunk uploads
    """
    try:
        chunk_store = ChunkStorage(request.session_id)
        chunk_store.initialize_session(mime_type=request.mime_type)
        
        return {
            "session_id": request.session_id,
            "status": "initialized"
        }
    except Exception as e:
        logger.error(f"Failed to initialize recording: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to initialize recording session",
                "detail": str(e)
            }
        )


@app.post("/api/recording/upload-chunk/{session_id}/{chunk_index}")
async def upload_chunk(session_id: str, chunk_index: int, chunk: UploadFile = File(...)):
    """
    Upload a single audio chunk for a recording session
    """
    try:
        chunk_store = ChunkStorage(session_id)
        
        # Read chunk data
        chunk_data = await chunk.read()
        
        if len(chunk_data) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "Empty chunk data"}
            )
        
        # Save chunk
        result = chunk_store.save_chunk(chunk_index, chunk_data)
        
        return {
            "status": "success",
            **result
        }
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Session not found",
                "detail": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Failed to upload chunk {chunk_index} for session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to save chunk",
                "detail": str(e)
            }
        )


@app.post("/api/recording/finalize/{session_id}")
async def finalize_recording(session_id: str):
    """
    Finalize a recording session by combining all chunks and transcribing
    """
    tmp_path = None
    try:
        chunk_store = ChunkStorage(session_id)
        
        # Create temporary file for combined audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp_path = tmp.name
        
        # Combine all chunks
        result = chunk_store.combine_chunks(Path(tmp_path))
        
        logger.info(f"Finalized recording {session_id}: {result['chunks_combined']} chunks, {result['total_size']} bytes")
        
        # Transcribe the combined audio
        logger.info(f"Transcribing finalized recording: {session_id}")
        transcript = transcribe_audio(tmp_path, preprocess=settings.ENABLE_AUDIO_PREPROCESSING)
        
        # Clean up chunk storage
        chunk_store.cleanup()
        
        return {
            "transcript": transcript,
            "chunks_combined": result["chunks_combined"],
            "total_size": result["total_size"],
            "status": "success"
        }
    
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Session not found or no chunks available",
                "detail": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Failed to finalize recording {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to finalize recording",
                "detail": str(e)
            }
        )
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")


@app.get("/api/recording/status/{session_id}")
async def recording_status(session_id: str):
    """
    Get status of an ongoing recording session
    """
    try:
        chunk_store = ChunkStorage(session_id)
        metadata = chunk_store.get_metadata()
        
        return {
            "session_id": session_id,
            "chunks_received": metadata["chunks_received"],
            "total_size": metadata["total_size"],
            "created_at": metadata["created_at"],
            "finalized": metadata.get("finalized", False),
            "status": "success"
        }
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Session not found",
                "detail": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Failed to get status for session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to get session status",
                "detail": str(e)
            }
        )


# Session management endpoints
@app.get("/api/sessions")
def list_sessions():
    """
    Get list of all saved sessions (with preview)
    Returns most recent first
    """
    try:
        sessions = storage.list_sessions()
        return {
            "sessions": sessions,
            "count": len(sessions),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to load session history",
                "detail": str(e)
            }
        )


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    """
    Get full session data by ID
    Includes complete transcript and summary
    """
    try:
        session = storage.get_session(session_id)
        
        if not session:
            return JSONResponse(
                status_code=404,
                content={"error": "Session not found"}
            )
        
        return {
            "session": session,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to load session",
                "detail": str(e)
            }
        )


@app.get("/api/sessions/{session_id}/export")
def export_session(session_id: str):
    """
    Export session as Markdown file
    Returns formatted markdown string
    """
    try:
        session = storage.get_session(session_id)
        
        if not session:
            return JSONResponse(
                status_code=404,
                content={"error": "Session not found"}
            )
        
        # Format as Markdown
        created_date = datetime.fromisoformat(session['created_at']).strftime("%B %d, %Y at %I:%M %p")
        
        markdown = f"""# Meeting Summary

**Date:** {created_date}

---

## Transcript

{session['transcript']}

---

## Summary

### 📌 Key Points

"""
        
        for i, point in enumerate(session['summary']['key_points'], 1):
            markdown += f"{i}. {point}\n"
        
        if session['summary']['decisions']:
            markdown += "\n### ✅ Decisions Made\n\n"
            for i, decision in enumerate(session['summary']['decisions'], 1):
                markdown += f"{i}. {decision}\n"
        
        if session['summary']['action_items']:
            markdown += "\n### 🎯 Action Items\n\n"
            for i, item in enumerate(session['summary']['action_items'], 1):
                markdown += f"{i}. {item}\n"
        
        markdown += "\n---\n\n*Generated by Verba - Offline-first meeting assistant*\n"
        
        return PlainTextResponse(
            content=markdown,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f"attachment; filename=verba-session-{session_id[:8]}.md"
            }
        )
    
    except Exception as e:
        logger.error(f"Failed to export session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to export session",
                "detail": str(e)
            }
        )


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """
    Delete a session by ID
    """
    try:
        deleted = storage.delete_session(session_id)
        
        if not deleted:
            return JSONResponse(
                status_code=404,
                content={"error": "Session not found"}
            )
        
        return {
            "message": "Session deleted successfully",
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete session",
                "detail": str(e)
            }
        )


# Serve frontend for bundled app (catch-all for React routing)
if is_bundled():
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Serve the React frontend for any non-API routes
        This enables client-side routing in the bundled app
        """
        static_dir = get_base_path() / "frontend" / "dist"
        
        # If requesting a specific file that exists, serve it
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # Otherwise, serve index.html for React routing
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        # Fallback error
        return JSONResponse(
            status_code=404,
            content={"error": "Frontend not found"}
        )


if __name__ == "__main__":
    logger.info("Starting Verba API server...")
    logger.info(f"Online features: {'enabled' if settings.ONLINE_FEATURES_ENABLED else 'disabled'}")
    logger.info(f"Whisper model: {settings.WHISPER_MODEL_SIZE} on {settings.WHISPER_DEVICE}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
