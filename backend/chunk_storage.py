"""
Chunk Storage - Manages progressive audio chunk uploads for long recordings
"""
import os
import json
import shutil
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Directory to store recording chunks
CHUNKS_DIR = Path("recording_chunks")
CHUNKS_DIR.mkdir(exist_ok=True)


class ChunkStorage:
    """Manages storage and retrieval of audio recording chunks"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.session_dir = CHUNKS_DIR / session_id
        self.metadata_file = self.session_dir / "metadata.json"
        
    def initialize_session(self, mime_type: str = "audio/webm") -> None:
        """Create session directory and metadata file"""
        self.session_dir.mkdir(exist_ok=True)
        
        metadata = {
            "session_id": self.session_id,
            "mime_type": mime_type,
            "created_at": datetime.now().isoformat(),
            "chunks_received": 0,
            "total_size": 0,
            "finalized": False
        }
        
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Initialized session: {self.session_id}")
    
    def save_chunk(self, chunk_index: int, chunk_data: bytes) -> Dict:
        """Save a single audio chunk"""
        if not self.session_dir.exists():
            raise ValueError(f"Session {self.session_id} not initialized")
        
        # Save chunk with zero-padded index for proper sorting
        chunk_file = self.session_dir / f"chunk_{chunk_index:06d}.webm"
        
        with open(chunk_file, 'wb') as f:
            f.write(chunk_data)
        
        # Update metadata
        metadata = self.get_metadata()
        metadata["chunks_received"] = chunk_index + 1
        metadata["total_size"] += len(chunk_data)
        metadata["last_updated"] = datetime.now().isoformat()
        
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Saved chunk {chunk_index} ({len(chunk_data)} bytes) for session {self.session_id}")
        
        return {
            "chunk_index": chunk_index,
            "size": len(chunk_data),
            "total_chunks": metadata["chunks_received"],
            "total_size": metadata["total_size"]
        }
    
    def get_metadata(self) -> Dict:
        """Get session metadata"""
        if not self.metadata_file.exists():
            raise ValueError(f"Session {self.session_id} does not exist")
        
        with open(self.metadata_file, 'r') as f:
            return json.load(f)
    
    def get_chunks(self) -> List[Path]:
        """Get all chunk files in order"""
        if not self.session_dir.exists():
            return []
        
        chunks = sorted(self.session_dir.glob("chunk_*.webm"))
        return chunks
    
    def combine_chunks(self, output_path: Path) -> Dict:
        """Combine all chunks into a single file"""
        chunks = self.get_chunks()
        
        if not chunks:
            raise ValueError(f"No chunks found for session {self.session_id}")
        
        total_size = 0
        
        # Simple concatenation for WebM files
        # Note: This works for WebM because the container supports concatenation
        with open(output_path, 'wb') as outfile:
            for chunk_file in chunks:
                chunk_data = chunk_file.read_bytes()
                outfile.write(chunk_data)
                total_size += len(chunk_data)
        
        # Update metadata
        metadata = self.get_metadata()
        metadata["finalized"] = True
        metadata["finalized_at"] = datetime.now().isoformat()
        metadata["output_file"] = str(output_path)
        
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Combined {len(chunks)} chunks into {output_path} ({total_size} bytes)")
        
        return {
            "chunks_combined": len(chunks),
            "total_size": total_size,
            "output_file": str(output_path),
            "session_id": self.session_id
        }
    
    def cleanup(self) -> None:
        """Remove session directory and all chunks"""
        if self.session_dir.exists():
            shutil.rmtree(self.session_dir)
            logger.info(f"Cleaned up session: {self.session_id}")
    
    @staticmethod
    def list_sessions() -> List[Dict]:
        """List all active recording sessions"""
        sessions = []
        
        for session_dir in CHUNKS_DIR.iterdir():
            if session_dir.is_dir():
                metadata_file = session_dir / "metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        sessions.append(json.load(f))
        
        return sessions
    
    @staticmethod
    def cleanup_old_sessions(max_age_hours: int = 24) -> int:
        """Clean up sessions older than max_age_hours"""
        cleaned = 0
        now = datetime.now()
        
        for session_dir in CHUNKS_DIR.iterdir():
            if session_dir.is_dir():
                metadata_file = session_dir / "metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    created_at = datetime.fromisoformat(metadata["created_at"])
                    age_hours = (now - created_at).total_seconds() / 3600
                    
                    if age_hours > max_age_hours and not metadata.get("finalized", False):
                        shutil.rmtree(session_dir)
                        cleaned += 1
                        logger.info(f"Cleaned up old session: {session_dir.name}")
        
        return cleaned
