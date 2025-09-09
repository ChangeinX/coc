"""
Queue factory for creating appropriate queue instances based on configuration.

Provides a factory pattern to create either in-memory or Redis-backed queues
based on environment configuration and availability.
"""

import logging
from typing import Union

from .refresh_queue import RefreshQueue
from .redis_queue import RedisRefreshQueue
from ..config import Config

logger = logging.getLogger(__name__)


def create_refresh_queue(config: Config = None) -> Union[RefreshQueue, RedisRefreshQueue]:
    """
    Create and return an appropriate refresh queue instance.
    
    Attempts to create a Redis queue if Redis URL is configured and available.
    Falls back to in-memory queue if Redis is not available or disabled.
    
    Args:
        config: Configuration object with Redis settings
        
    Returns:
        Either a RedisRefreshQueue or in-memory RefreshQueue instance
    """
    if config is None:
        config = Config()
    
    # Check if Redis queue is disabled
    if getattr(config, 'DISABLE_AUTO_REFRESH_QUEUE', False):
        logger.info("Auto refresh queue is disabled by configuration")
        return RefreshQueue()
    
    # Try to create Redis queue if URL is configured
    redis_url = getattr(config, 'REDIS_URL', None)
    if redis_url and redis_url != "redis://localhost:6379":
        try:
            logger.info(f"Attempting to create Redis queue with URL: {redis_url}")
            redis_queue = RedisRefreshQueue(redis_url=redis_url)
            
            # Test connection
            health = redis_queue.health_check()
            if health['redis_available']:
                logger.info("Successfully connected to Redis queue")
                return redis_queue
            else:
                logger.warning(f"Redis health check failed: {health['error']}")
                
        except Exception as e:
            logger.warning(f"Failed to create Redis queue: {e}")
    
    # Fall back to in-memory queue
    logger.info("Using in-memory refresh queue")
    return RefreshQueue()


def get_default_queue() -> Union[RefreshQueue, RedisRefreshQueue]:
    """Get the default configured refresh queue instance"""
    return create_refresh_queue()


class QueueManager:
    """
    Singleton manager for refresh queue instances.
    
    Provides a single point of access to the refresh queue and handles
    queue switching between in-memory and Redis implementations.
    """
    
    _instance = None
    _queue = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_queue(self, force_recreate: bool = False) -> Union[RefreshQueue, RedisRefreshQueue]:
        """
        Get the current refresh queue instance.
        
        Args:
            force_recreate: Force recreation of the queue instance
            
        Returns:
            The current refresh queue instance
        """
        if self._queue is None or force_recreate:
            self._queue = create_refresh_queue()
        return self._queue
    
    def switch_to_redis(self, redis_url: str) -> bool:
        """
        Switch to a Redis-backed queue.
        
        Args:
            redis_url: Redis connection URL
            
        Returns:
            True if switch was successful, False otherwise
        """
        try:
            new_queue = RedisRefreshQueue(redis_url=redis_url)
            health = new_queue.health_check()
            
            if health['redis_available']:
                self._queue = new_queue
                logger.info(f"Switched to Redis queue: {redis_url}")
                return True
            else:
                logger.error(f"Redis queue health check failed: {health['error']}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to switch to Redis queue: {e}")
            return False
    
    def switch_to_memory(self) -> None:
        """Switch to in-memory queue"""
        self._queue = RefreshQueue()
        logger.info("Switched to in-memory queue")
    
    def get_queue_type(self) -> str:
        """Get the type of the current queue"""
        if self._queue is None:
            return "none"
        elif isinstance(self._queue, RedisRefreshQueue):
            return "redis"
        else:
            return "memory"


# Global queue manager instance
_queue_manager = QueueManager()


def get_queue_manager() -> QueueManager:
    """Get the global queue manager instance"""
    return _queue_manager