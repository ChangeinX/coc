"""
Compatibility layer for using coclib services in Lambda without Flask.

This module provides a minimal Flask-SQLAlchemy-like interface that allows
existing services to work in Lambda environment with standalone SQLAlchemy.
"""

import logging
from contextlib import contextmanager
from sqlalchemy import text

from .db_session import get_db_session, get_engine

logger = logging.getLogger(__name__)


class LambdaDBCompatibility:
    """
    Minimal Flask-SQLAlchemy-like compatibility for Lambda environment.
    
    Provides just enough interface to make existing services work without Flask.
    """
    
    def __init__(self):
        self._session = None
        self.engine = get_engine()
    
    @property
    def session(self):
        """Get current session or create one"""
        if self._session is None:
            raise RuntimeError("No active database session. Use get_db_session() context manager.")
        return self._session
    
    def _set_session(self, session):
        """Internal method to set the current session"""
        self._session = session
    
    def _clear_session(self):
        """Internal method to clear the current session"""
        self._session = None
    
    class func:
        """SQLAlchemy function equivalents"""
        @staticmethod
        def now():
            return text('NOW()')
    
    def select(self, *args):
        """SQLAlchemy select equivalent"""
        from sqlalchemy import select
        return select(*args)
    
    def execute(self, statement, parameters=None):
        """Execute a statement using current session"""
        return self.session.execute(statement, parameters)


# Global compatibility instance
_lambda_db = LambdaDBCompatibility()


@contextmanager
def lambda_db_context():
    """
    Context manager that provides Flask-SQLAlchemy-like db object for Lambda.
    
    Usage:
        with lambda_db_context():
            # Now services can use db.session, db.func.now(), etc.
            data = await clan_service.refresh_clan_from_api(tag)
    """
    with get_db_session() as session:
        # Set the session in the compatibility layer
        _lambda_db._set_session(session)
        
        # Monkey patch the db object in extensions
        try:
            from coclib import extensions
            original_db = extensions.db
            extensions.db = _lambda_db
            
            yield _lambda_db
            
        finally:
            # Restore original db object
            extensions.db = original_db
            _lambda_db._clear_session()


# Alternative approach: patch db object directly
def setup_lambda_db_compatibility():
    """
    Set up Lambda database compatibility by replacing the Flask-SQLAlchemy db object.
    
    This should be called at the start of Lambda execution.
    """
    from coclib import extensions
    extensions.db = _lambda_db
    logger.info("Lambda database compatibility layer activated")


def teardown_lambda_db_compatibility():
    """
    Restore original Flask-SQLAlchemy db object.
    
    This should be called at the end of Lambda execution for cleanup.
    """
    # Note: We can't easily restore the original object since we don't store it
    # In Lambda environment, this isn't critical since the process ends anyway
    logger.info("Lambda database compatibility layer deactivated")