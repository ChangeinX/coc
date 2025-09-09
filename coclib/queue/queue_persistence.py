"""
Queue persistence and recovery management for Redis-backed refresh queue.

Provides backup, restore, and migration functionality to ensure queue
state is preserved across system failures and Redis instance changes.
"""

import json
import logging
import os
import redis
from datetime import datetime, timedelta
from typing import Dict, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class QueueRecoveryManager:
    """
    Manages backup, restore, and migration of queue state.
    
    Provides functionality to save queue state to local storage,
    restore from backups, and migrate between Redis instances.
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379", backup_dir: str = "/tmp/queue_backups"):
        """Initialize recovery manager with Redis connection"""
        self.redis_url = redis_url
        self.backup_dir = backup_dir
        
        # Ensure backup directory exists
        os.makedirs(backup_dir, exist_ok=True)
        
        try:
            parsed_url = urlparse(redis_url)
            self.redis = redis.Redis(
                host=parsed_url.hostname or 'localhost',
                port=parsed_url.port or 6379,
                password=parsed_url.password,
                decode_responses=False
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis for recovery: {e}")
            self.redis = None
    
    def save_queue_state(self) -> str:
        """Save current queue state to backup file"""
        if not self.redis:
            raise Exception("Redis connection not available for backup")
        
        try:
            timestamp = datetime.utcnow()
            backup_filename = f"queue_backup_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Get all queue items with priorities
            queue_items = []
            
            # Get sorted set members with scores (priorities)
            queue_data = self.redis.zrange("refresh_queue", 0, -1, withscores=True)
            
            # Get all request data
            all_requests = self.redis.hgetall("refresh_requests")
            
            for request_id, priority_score in queue_data:
                request_id = request_id.decode('utf-8')
                request_data = all_requests.get(request_id.encode('utf-8'))
                
                if request_data:
                    queue_items.append({
                        "id": request_id,
                        "priority": priority_score,
                        "data": json.loads(request_data.decode('utf-8'))
                    })
            
            # Save to backup file
            backup_data = {
                "timestamp": timestamp.isoformat(),
                "redis_url": self.redis_url,
                "queue_items": queue_items
            }
            
            with open(backup_path, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            logger.info(f"Saved queue state to {backup_path} ({len(queue_items)} items)")
            return backup_path
            
        except Exception as e:
            logger.error(f"Failed to save queue state: {e}")
            raise
    
    def restore_queue_state(self, backup_file: Optional[str] = None, skip_invalid: bool = False) -> Dict[str, int]:
        """Restore queue state from backup file"""
        if not self.redis:
            raise Exception("Redis connection not available for restore")
        
        try:
            # Find backup file if not specified
            if not backup_file:
                backup_file = self._find_latest_backup()
                if not backup_file:
                    raise Exception("No backup file found")
            
            # Load backup data
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            restored_count = 0
            skipped_count = 0
            
            for item in backup_data['queue_items']:
                try:
                    # Validate item data
                    self._validate_queue_item(item)
                    
                    # Restore to Redis
                    request_id = item['id']
                    priority = item['priority']
                    request_data = item['data']
                    
                    # Add to sorted set and hash
                    self.redis.zadd("refresh_queue", {request_id: priority})
                    self.redis.hset("refresh_requests", request_id, json.dumps(request_data))
                    
                    restored_count += 1
                    
                except Exception as e:
                    if skip_invalid:
                        logger.warning(f"Skipping invalid queue item {item.get('id', 'unknown')}: {e}")
                        skipped_count += 1
                    else:
                        raise ValueError(f"Invalid queue item: {e}")
            
            logger.info(f"Restored {restored_count} items from backup, skipped {skipped_count}")
            
            return {
                "restored_count": restored_count,
                "skipped_count": skipped_count,
                "backup_file": backup_file
            }
            
        except Exception as e:
            logger.error(f"Failed to restore queue state: {e}")
            raise
    
    def migrate_queue_data(self, target_redis_url: str) -> Dict[str, int]:
        """Migrate queue data to a different Redis instance"""
        if not self.redis:
            raise Exception("Source Redis connection not available")
        
        try:
            # Connect to target Redis
            parsed_url = urlparse(target_redis_url)
            target_redis = redis.Redis(
                host=parsed_url.hostname or 'localhost',
                port=parsed_url.port or 6379,
                password=parsed_url.password,
                decode_responses=False
            )
            
            # Test target connection
            target_redis.ping()
            
            # Get all data from source
            queue_data = self.redis.zrange("refresh_queue", 0, -1, withscores=True)
            all_requests = self.redis.hgetall("refresh_requests")
            
            migrated_count = 0
            
            # Copy to target Redis
            for request_id, priority_score in queue_data:
                request_data = all_requests.get(request_id)
                if request_data:
                    target_redis.zadd("refresh_queue", {request_id.decode('utf-8'): priority_score})
                    target_redis.hset("refresh_requests", request_id, request_data)
                    migrated_count += 1
            
            logger.info(f"Migrated {migrated_count} items to {target_redis_url}")
            
            return {
                "migrated_count": migrated_count,
                "source_url": self.redis_url,
                "target_url": target_redis_url
            }
            
        except Exception as e:
            logger.error(f"Failed to migrate queue data: {e}")
            raise
    
    def check_queue_health(self) -> Dict[str, any]:
        """Check Redis queue health and connectivity"""
        try:
            if not self.redis:
                return {
                    "redis_available": False,
                    "error": "Redis connection not initialized"
                }
            
            # Test basic connectivity
            self.redis.ping()
            
            # Get queue statistics
            queue_size = self.redis.zcard("refresh_queue")
            request_count = self.redis.hlen("refresh_requests")
            
            return {
                "redis_available": True,
                "queue_size": queue_size,
                "request_count": request_count,
                "error": None
            }
            
        except Exception as e:
            return {
                "redis_available": False,
                "error": str(e)
            }
    
    def cleanup_old_backups(self, retention_days: int = 7) -> int:
        """Clean up backup files older than retention period"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=retention_days)
            removed_count = 0
            
            for filename in os.listdir(self.backup_dir):
                if filename.startswith("queue_backup_") and filename.endswith(".json"):
                    file_path = os.path.join(self.backup_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_time < cutoff_time:
                        os.remove(file_path)
                        removed_count += 1
                        logger.info(f"Removed old backup: {filename}")
            
            logger.info(f"Cleaned up {removed_count} old backup files")
            return removed_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old backups: {e}")
            return 0
    
    def _find_latest_backup(self) -> Optional[str]:
        """Find the most recent backup file"""
        try:
            backup_files = []
            
            for filename in os.listdir(self.backup_dir):
                if filename.startswith("queue_backup_") and filename.endswith(".json"):
                    file_path = os.path.join(self.backup_dir, filename)
                    file_time = os.path.getmtime(file_path)
                    backup_files.append((file_time, file_path))
            
            if backup_files:
                # Return most recent backup
                backup_files.sort(reverse=True)
                return backup_files[0][1]
            
            return None
            
        except Exception:
            return None
    
    def _validate_queue_item(self, item: dict) -> None:
        """Validate queue item structure and data"""
        required_fields = ['id', 'priority', 'data']
        
        for field in required_fields:
            if field not in item:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate priority is numeric
        if not isinstance(item['priority'], (int, float)):
            raise ValueError(f"Invalid priority type: {type(item['priority'])}")
        
        # Validate data structure
        data = item['data']
        if not isinstance(data, dict):
            raise ValueError("Item data must be a dictionary")
        
        # Validate required data fields
        required_data_fields = ['id', 'type', 'tag', 'priority', 'requested_at']
        for field in required_data_fields:
            if field not in data:
                raise ValueError(f"Missing required data field: {field}")