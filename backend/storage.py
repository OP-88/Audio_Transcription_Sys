"""
Storage layer for Verba - handles session persistence using SQLite
"""
import json
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid

Base = declarative_base()


class Session(Base):
    """
    Represents a single meeting session with transcript and summary
    """
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String, nullable=True)
    transcript = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=False)  # JSON string of summary dict
    
    def to_dict(self, include_full=False):
        """Convert session to dictionary"""
        try:
            summary = json.loads(self.summary_json)
        except:
            summary = {}
        
        if include_full:
            return {
                "id": self.id,
                "created_at": self.created_at.isoformat(),
                "title": self.title or "Untitled Session",
                "transcript": self.transcript,
                "summary": summary
            }
        else:
            # For list view, just return preview
            return {
                "id": self.id,
                "created_at": self.created_at.isoformat(),
                "title": self.title or "Untitled Session",
                "transcript_preview": self.transcript[:100] + "..." if len(self.transcript) > 100 else self.transcript
            }


class StorageManager:
    """
    Manages all database operations for sessions
    """
    
    def __init__(self, db_path: str = "verba_sessions.db"):
        """Initialize database connection"""
        self.engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def create_session(self, transcript: str, summary: Dict, title: str = None) -> str:
        """
        Create a new session with transcript and summary
        Returns the session ID
        """
        session_id = str(uuid.uuid4())
        db_session = self.SessionLocal()
        
        try:
            new_session = Session(
                id=session_id,
                title=title,
                transcript=transcript,
                summary_json=json.dumps(summary)
            )
            db_session.add(new_session)
            db_session.commit()
            return session_id
        finally:
            db_session.close()
    
    def list_sessions(self, limit: int = 50) -> List[Dict]:
        """
        Get list of all sessions (with preview only)
        Returns most recent first
        """
        db_session = self.SessionLocal()
        
        try:
            sessions = db_session.query(Session).order_by(
                Session.created_at.desc()
            ).limit(limit).all()
            
            return [s.to_dict(include_full=False) for s in sessions]
        finally:
            db_session.close()
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """
        Get full session data by ID
        Returns None if not found
        """
        db_session = self.SessionLocal()
        
        try:
            session = db_session.query(Session).filter(
                Session.id == session_id
            ).first()
            
            if session:
                return session.to_dict(include_full=True)
            return None
        finally:
            db_session.close()
    
    def update_session(self, session_id: str, title: str = None, transcript: str = None, summary: Dict = None) -> bool:
        """
        Update an existing session
        Returns True if updated, False if not found
        """
        db_session = self.SessionLocal()
        
        try:
            session = db_session.query(Session).filter(
                Session.id == session_id
            ).first()
            
            if session:
                if title is not None:
                    session.title = title
                if transcript is not None:
                    session.transcript = transcript
                if summary is not None:
                    session.summary_json = json.dumps(summary)
                
                db_session.commit()
                return True
            return False
        finally:
            db_session.close()

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session by ID
        Returns True if deleted, False if not found
        """
        db_session = self.SessionLocal()
        
        try:
            session = db_session.query(Session).filter(
                Session.id == session_id
            ).first()
            
            if session:
                db_session.delete(session)
                db_session.commit()
                return True
            return False
        finally:
            db_session.close()


# Global storage instance
storage = StorageManager()
