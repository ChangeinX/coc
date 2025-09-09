"""
Redis-backed refresh queue implementation for production use.

This module provides a Redis-backed implementation of the RefreshQueue
that supports persistence, high availability, and distributed processing.
"""

import json
import logging
import redis
from datetime import datetime
from typing import Dict, Optional
from urllib.parse import urlparse

from .refresh_queue import RefreshRequest, RefreshPriority, RefreshType

logger = logging.getLogger(__name__)


class RedisRefreshQueue:
    """
    Redis-backed refresh queue for production use.
    
    Uses Redis sorted sets for priority ordering and Redis hashes for request data storage.
    Provides persistence across restarts and supports distributed workers.
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection and queue structures"""
        try:
            parsed_url = urlparse(redis_url)
            self.redis = redis.Redis(
                host=parsed_url.hostname or 'localhost',
                port=parsed_url.port or 6379,
                password=parsed_url.password,
                decode_responses=False  # We'll handle encoding manually
            )
            
            # Test connection
            self.redis.ping()
            
            # Redis key names
            self.queue_key = "refresh_queue"  # Sorted set for priority ordering
            self.requests_key = "refresh_requests"  # Hash for request data
            
            logger.info(f"Connected to Redis at {redis_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis at {redis_url}: {e}")
            raise
    
    def queue_refresh(self, request: RefreshRequest) -> None:
        """Add a refresh request to the Redis queue"""
        try:
            # Remove existing request if present
            if self.redis.hexists(self.requests_key, request.id):
                self.redis.zrem(self.queue_key, request.id)
                self.redis.hdel(self.requests_key, request.id)
            
            # Serialize request data
            request_data = {
                "id": request.id,
                "type": request.type.value,
                "tag": request.tag,
                "priority": request.priority.value,
                "requested_at": request.requested_at.isoformat(),
                "last_updated": request.last_updated.isoformat() if request.last_updated else None,
                "retry_count": request.retry_count
            }
            
            # Add to sorted set with priority as score (lower score = higher priority)
            self.redis.zadd(self.queue_key, {request.id: request.priority.value})
            
            # Store request data in hash
            self.redis.hset(self.requests_key, request.id, json.dumps(request_data))
            
            logger.info(f"Queued {request.type.value} refresh for {request.tag} "
                       f"(priority: {request.priority.name})")
                       
        except Exception as e:
            logger.error(f"Failed to queue refresh request {request.id}: {e}")
            raise
    
    def get_next_request(self, max_priority: RefreshPriority = RefreshPriority.LOW) -> Optional[RefreshRequest]:
        """Get the next highest priority stale request from Redis"""
        try:
            # Get requests in priority order (lowest score first)
            request_ids = self.redis.zrange(
                self.queue_key, 
                0, 
                max_priority.value,  # Only get requests up to max_priority
                byscore=True
            )
            
            for request_id in request_ids:
                # Get request data
                request_data = self.redis.hget(self.requests_key, request_id)
                if not request_data:
                    # Clean up orphaned queue entry
                    self.redis.zrem(self.queue_key, request_id)
                    continue
                
                # Deserialize request
                data = json.loads(request_data.decode('utf-8'))
                request = self._deserialize_request(data)
                
                # Check if request is stale
                if request.is_stale:
                    return request
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get next request: {e}")
            return None
    
    def mark_completed(self, request_id: str) -> None:
        """Mark a request as completed and update timestamp"""
        try:
            if not self.redis.hexists(self.requests_key, request_id):
                logger.warning(f"Request {request_id} not found for completion")
                return
            
            # Get current request data
            request_data = json.loads(
                self.redis.hget(self.requests_key, request_id).decode('utf-8')
            )
            
            # Update completion data
            request_data['last_updated'] = datetime.utcnow().isoformat()
            request_data['retry_count'] = 0
            
            # Store updated data
            self.redis.hset(self.requests_key, request_id, json.dumps(request_data))
            
            logger.info(f"Completed refresh for {request_data['type']} {request_data['tag']}")
            
        except Exception as e:
            logger.error(f"Failed to mark request {request_id} as completed: {e}")
    
    def mark_failed(self, request_id: str) -> None:
        """Mark a request as failed and increment retry count"""
        try:
            if not self.redis.hexists(self.requests_key, request_id):
                logger.warning(f"Request {request_id} not found for failure marking")
                return
            
            # Get current request data
            request_data = json.loads(
                self.redis.hget(self.requests_key, request_id).decode('utf-8')
            )
            
            # Increment retry count
            request_data['retry_count'] += 1
            
            if request_data['retry_count'] >= 3:
                # Remove from queue after max retries
                self.redis.zrem(self.queue_key, request_id)
                self.redis.hdel(self.requests_key, request_id)
                logger.warning(f"Removed failed refresh for {request_data['type']} "
                             f"{request_data['tag']} after {request_data['retry_count']} retries")
            else:
                # Update retry count
                self.redis.hset(self.requests_key, request_id, json.dumps(request_data))
                logger.warning(f"Retry {request_data['retry_count']} for "
                             f"{request_data['type']} {request_data['tag']}")
                
        except Exception as e:
            logger.error(f"Failed to mark request {request_id} as failed: {e}")
    
    def get_queue_stats(self) -> Dict[str, int]:
        """Get statistics about queue contents by priority"""
        try:
            stats = {}
            
            for priority in RefreshPriority:
                # Count requests at this priority level
                count = self.redis.zcount(
                    self.queue_key,
                    priority.value,
                    priority.value
                )
                stats[priority.name] = count
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {}
    
    def _deserialize_request(self, data: dict) -> RefreshRequest:
        """Convert stored dict back to RefreshRequest object"""
        return RefreshRequest(
            id=data['id'],
            type=RefreshType(data['type']),
            tag=data['tag'],
            priority=RefreshPriority(data['priority']),
            requested_at=datetime.fromisoformat(data['requested_at']),
            last_updated=datetime.fromisoformat(data['last_updated']) if data.get('last_updated') else None,
            retry_count=data.get('retry_count', 0)
        )
    
    def health_check(self) -> Dict[str, any]:
        """Check Redis connection health"""
        try:
            latency = self.redis.ping()
            queue_size = self.redis.zcard(self.queue_key)
            
            return {
                "redis_available": True,
                "latency": latency,
                "queue_size": queue_size,
                "error": None
            }
        except Exception as e:
            return {
                "redis_available": False,
                "latency": None,
                "queue_size": 0,
                "error": str(e)
            }