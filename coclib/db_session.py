"""
Standalone database session manager for Lambda functions.

This module provides database connectivity without Flask dependencies,
designed specifically for AWS Lambda and background worker environments.
"""

import logging
import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

# Models are defined using Flask-SQLAlchemy, no standalone Base needed

logger = logging.getLogger(__name__)

# Global engine and session factory
_engine = None
_SessionLocal = None


def init_database(database_url: str = None, **engine_kwargs) -> None:
    """
    Initialize database engine and session factory.
    
    Args:
        database_url: Database connection URL. Defaults to DATABASE_URL env var.
        **engine_kwargs: Additional arguments for create_engine
    """
    global _engine, _SessionLocal
    
    if database_url is None:
        database_url = os.getenv("DATABASE_URL")
        
    if not database_url:
        raise ValueError("DATABASE_URL must be provided either as argument or environment variable")
    
    # Default engine configuration for Lambda
    default_kwargs = {
        "poolclass": NullPool,  # No connection pooling in Lambda (short-lived)
        "echo": os.getenv("SQLALCHEMY_ECHO", "").lower() == "true",
        "pool_pre_ping": True,  # Validate connections before use
    }
    
    # Add database-specific connection args
    if "postgresql" in database_url or "postgres" in database_url:
        default_kwargs["connect_args"] = {
            "connect_timeout": 10,
            "sslmode": "require" if "localhost" not in database_url else "prefer"
        }
    elif "sqlite" not in database_url:
        # For other databases, add basic timeout
        default_kwargs["connect_args"] = {
            "connect_timeout": 10
        }
    
    # Merge user-provided kwargs
    default_kwargs.update(engine_kwargs)
    
    logger.info(f"Initializing database connection to {database_url}")
    _engine = create_engine(database_url, **default_kwargs)
    
    # Create session factory
    _SessionLocal = sessionmaker(
        bind=_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False  # Keep objects usable after commit in Lambda
    )
    
    # Test connection
    try:
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def get_engine():
    """Get the global database engine."""
    if _engine is None:
        init_database()
    return _engine


def get_session_factory():
    """Get the global session factory.""" 
    if _SessionLocal is None:
        init_database()
    return _SessionLocal


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Get a database session with automatic cleanup.
    
    Usage:
        with get_db_session() as session:
            user = session.query(User).first()
            session.commit()
    
    Yields:
        Session: SQLAlchemy database session
    """
    session_factory = get_session_factory()
    session = session_factory()
    
    try:
        yield session
    except Exception as e:
        logger.error(f"Database session error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def create_all_tables():
    """Tables already exist in production - this is a no-op for Lambda."""
    pass


def close_db_connections():
    """Close all database connections. Call at end of Lambda execution."""
    global _engine
    if _engine:
        _engine.dispose()
        logger.info("Database connections closed")


# Add connection pool events for logging
def setup_connection_events():
    """Setup SQLAlchemy events for connection monitoring."""
    engine = get_engine()
    
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_connection, connection_record):
        logger.debug("Database connection established")
    
    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logger.debug("Database connection checked out from pool")
    
    @event.listens_for(engine, "checkin")  
    def receive_checkin(dbapi_connection, connection_record):
        logger.debug("Database connection checked back into pool")


# Lambda-specific helpers
def lambda_db_setup() -> None:
    """
    Initialize database for Lambda environment.
    
    Call this at the beginning of Lambda handler for optimal performance.
    """
    # Get database URL to determine if we should use pool settings
    database_url = os.getenv("DATABASE_URL", "")
    
    if "postgresql" in database_url or "postgres" in database_url:
        # PostgreSQL supports pool settings - use optimized Lambda configuration
        init_database(
            pool_size=1,          # Minimal pool for Lambda
            max_overflow=0,       # No overflow connections
            pool_timeout=5,       # Quick timeout
            pool_recycle=3600     # Recycle connections after 1 hour
        )
    else:
        # For other databases (like SQLite in testing), use minimal settings
        init_database()
    
    setup_connection_events()


def lambda_db_cleanup() -> None:
    """
    Clean up database resources at end of Lambda execution.
    
    Call this at the end of Lambda handler to prevent connection leaks.
    """
    close_db_connections()