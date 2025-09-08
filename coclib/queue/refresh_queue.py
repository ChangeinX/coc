"""
Background refresh queue system for CoC API data updates.

This module provides a foundation for queueing stale data refresh requests
that will be processed by Lambda workers or other background services.
"""

import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class RefreshPriority(Enum):
    """Priority levels for refresh requests"""
    CRITICAL = 0  # War data during active wars - refresh every 5min
    HIGH = 1      # Recently requested data - refresh every 30min  
    MEDIUM = 2    # Active players (recent changes) - refresh every 2h
    LOW = 3       # Inactive/maintenance - refresh every 8h


class RefreshType(Enum):
    """Types of data that can be refreshed"""
    CLAN = "clan"
    PLAYER = "player" 
    WAR = "war"


@dataclass
class RefreshRequest:
    """A request to refresh specific data from CoC API"""
    id: str
    type: RefreshType
    tag: str  # clan_tag or player_tag
    priority: RefreshPriority
    requested_at: datetime
    last_updated: Optional[datetime] = None
    retry_count: int = 0
    
    @property
    def is_stale(self) -> bool:
        """Check if this request should be processed based on priority"""
        if self.last_updated is None:
            return True
            
        age = datetime.utcnow() - self.last_updated
        
        # Define staleness thresholds by priority
        thresholds = {
            RefreshPriority.CRITICAL: timedelta(minutes=5),
            RefreshPriority.HIGH: timedelta(minutes=30), 
            RefreshPriority.MEDIUM: timedelta(hours=2),
            RefreshPriority.LOW: timedelta(hours=8),
        }
        
        return age > thresholds[self.priority]


class RefreshQueue:
    """In-memory refresh queue for development/testing.
    
    In production, this would be replaced with Redis or AWS SQS.
    """
    
    def __init__(self):
        self._queues: Dict[RefreshPriority, List[RefreshRequest]] = {
            RefreshPriority.CRITICAL: [],
            RefreshPriority.HIGH: [],
            RefreshPriority.MEDIUM: [],
            RefreshPriority.LOW: [],
        }
        self._requests: Dict[str, RefreshRequest] = {}
    
    def queue_refresh(self, request: RefreshRequest) -> None:
        """Add a refresh request to the appropriate priority queue"""
        # Remove existing request for same data if present
        if request.id in self._requests:
            old_request = self._requests[request.id]
            self._queues[old_request.priority].remove(old_request)
        
        # Add new request
        self._requests[request.id] = request
        self._queues[request.priority].append(request)
        
        logger.info(f"Queued {request.type.value} refresh for {request.tag} "
                   f"(priority: {request.priority.name})")
    
    def get_next_request(self, max_priority: RefreshPriority = RefreshPriority.LOW) -> Optional[RefreshRequest]:
        """Get the next request to process, starting from highest priority"""
        for priority in RefreshPriority:
            if priority.value > max_priority.value:
                continue
                
            queue = self._queues[priority]
            # Find stale requests in this priority level
            for request in queue:
                if request.is_stale:
                    return request
        
        return None
    
    def mark_completed(self, request_id: str) -> None:
        """Mark a request as completed and update last_updated timestamp"""
        if request_id in self._requests:
            request = self._requests[request_id]
            request.last_updated = datetime.utcnow()
            request.retry_count = 0
            logger.info(f"Completed refresh for {request.type.value} {request.tag}")
    
    def mark_failed(self, request_id: str) -> None:
        """Mark a request as failed and increment retry count"""
        if request_id in self._requests:
            request = self._requests[request_id]
            request.retry_count += 1
            
            if request.retry_count >= 3:
                # Remove from queue after 3 failures
                self._queues[request.priority].remove(request)
                del self._requests[request_id]
                logger.warning(f"Removed failed refresh for {request.type.value} {request.tag} "
                             f"after {request.retry_count} retries")
            else:
                logger.warning(f"Retry {request.retry_count} for {request.type.value} {request.tag}")
    
    def get_queue_stats(self) -> Dict[str, int]:
        """Get statistics about queue contents"""
        return {
            priority.name: len([r for r in queue if r.is_stale])
            for priority, queue in self._queues.items()
        }


# Global refresh queue instance
_refresh_queue = RefreshQueue()


def queue_clan_refresh(clan_tag: str, priority: RefreshPriority = RefreshPriority.HIGH) -> None:
    """Queue a clan for background refresh"""
    request = RefreshRequest(
        id=f"clan:{clan_tag}",
        type=RefreshType.CLAN,
        tag=clan_tag,
        priority=priority,
        requested_at=datetime.utcnow()
    )
    _refresh_queue.queue_refresh(request)


def queue_player_refresh(player_tag: str, priority: RefreshPriority = RefreshPriority.MEDIUM) -> None:
    """Queue a player for background refresh"""
    request = RefreshRequest(
        id=f"player:{player_tag}",
        type=RefreshType.PLAYER, 
        tag=player_tag,
        priority=priority,
        requested_at=datetime.utcnow()
    )
    _refresh_queue.queue_refresh(request)


def queue_war_refresh(clan_tag: str, priority: RefreshPriority = RefreshPriority.CRITICAL) -> None:
    """Queue war data for background refresh"""
    request = RefreshRequest(
        id=f"war:{clan_tag}",
        type=RefreshType.WAR,
        tag=clan_tag, 
        priority=priority,
        requested_at=datetime.utcnow()
    )
    _refresh_queue.queue_refresh(request)


def get_refresh_queue() -> RefreshQueue:
    """Get the global refresh queue instance"""
    return _refresh_queue


def get_queue_stats() -> Dict[str, int]:
    """Get refresh queue statistics"""
    return _refresh_queue.get_queue_stats()