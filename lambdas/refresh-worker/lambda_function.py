"""
AWS Lambda function for processing CoC data refresh requests from Redis queue.

This worker processes refresh requests from the Redis queue and calls the appropriate
CoC API refresh functions to keep the database up-to-date with fresh data.
"""

import asyncio
import json
import logging
import os
import sys
import time

try:
    import boto3
except ImportError:
    boto3 = None

# Add coclib to path for Lambda environment
sys.path.append('/opt/python')
sys.path.append('.')

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """
    Main Lambda handler that processes refresh requests from Redis queue.
    
    Args:
        event: Lambda event (can be CloudWatch Events trigger or manual invoke)
        context: Lambda context object
        
    Returns:
        dict: Response with processed request count and any errors
    """
    try:
        # Import here to handle potential import errors gracefully
        from coclib.queue.queue_factory import create_refresh_queue
        from coclib.db_session import lambda_db_setup, lambda_db_cleanup
        from coclib.config import Config
        
        processed_count = 0
        errors = []
        
        try:
            # Setup database connections for Lambda environment
            lambda_db_setup()
            
            # Create Redis queue connection
            queue = create_refresh_queue()
            
            # Process requests with rate limiting
            start_time = time.time()
            max_runtime = min(context.get_remaining_time_in_millis() / 1000 - 5, 300)  # Leave 5s buffer, max 5 min
            # Use coclib rate limiting configuration to stay consistent with services  
            requests_per_second = min(getattr(Config, 'COC_REQS_PER_SEC', 10), 30)  # Respect configured rate limit, max 30/sec for safety
            
            logger.info(f"Starting refresh worker, max runtime: {max_runtime}s")
            
            while time.time() - start_time < max_runtime:
                # Get next request from queue
                request = queue.get_next_request()
                if not request:
                    logger.info("No more requests in queue")
                    break
                
                try:
                    # Process the refresh request
                    result = asyncio.run(process_refresh_request(request, queue))
                    processed_count += 1
                    
                    logger.info(f"Processed {request.type.value} refresh for {request.tag}: {result}")
                    
                    # Rate limiting - ensure we don't exceed API limits
                    time.sleep(1.0 / requests_per_second)
                    
                except Exception as e:
                    error_msg = f"Failed to process {request.type.value} refresh for {request.tag}: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    errors.append(error_msg)
                    
                    # Handle retry logic with exponential backoff
                    handle_failed_request(request, str(e), queue)
                    continue
            
            # Publish CloudWatch metrics if available
            if boto3 and processed_count > 0:
                try:
                    publish_cloudwatch_metrics(processed_count, len(errors), queue)
                except Exception as e:
                    logger.warning(f"Failed to publish CloudWatch metrics: {str(e)}")
                    
        finally:
            # Clean up database connections
            lambda_db_cleanup()

        response = {
            'statusCode': 200,
            'body': json.dumps({
                'processed_requests': processed_count,
                'errors': errors,
                'runtime_seconds': round(time.time() - start_time, 2)
            })
        }
        
        logger.info(f"Completed processing: {processed_count} requests, {len(errors)} errors")
        return response
        
    except Exception as e:
        logger.error(f"Lambda handler failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'processed_requests': 0
            })
        }


def handle_failed_request(request, error_message: str, queue) -> None:
    """
    Handle failed refresh request with exponential backoff retry logic.
    
    Args:
        request: The failed RefreshRequest object
        error_message: Error message from the failure
        queue: Queue instance for retry scheduling
    """
    from coclib.queue.refresh_queue import RefreshRequest, RefreshPriority
    from datetime import datetime, timedelta
    
    # Increment retry count
    request.retry_count = getattr(request, 'retry_count', 0) + 1
    max_retries = 3
    
    # Check if we should retry
    if request.retry_count <= max_retries:
        # Exponential backoff: 2^retry_count minutes
        delay_minutes = 2 ** request.retry_count
        retry_time = datetime.utcnow() + timedelta(minutes=delay_minutes)
        
        # Lower priority for retries to avoid blocking fresh requests
        retry_priority = RefreshPriority.LOW
        
        # Create retry request
        retry_request = RefreshRequest(
            id=f"{request.id}-retry-{request.retry_count}",
            type=request.type,
            tag=request.tag,
            priority=retry_priority,
            requested_at=retry_time,
            retry_count=request.retry_count
        )
        
        try:
            queue.queue_refresh(retry_request)
            logger.info(f"Scheduled retry {request.retry_count}/{max_retries} for {request.tag} in {delay_minutes} minutes")
        except Exception as e:
            logger.error(f"Failed to schedule retry for {request.tag}: {str(e)}")
    else:
        # Max retries exceeded - log as permanent failure
        logger.error(f"Permanent failure for {request.type.value} refresh {request.tag} after {max_retries} retries: {error_message}")
        
        # TODO: Send to dead letter queue or alerting system
        # Could implement notification to ops team here


async def process_refresh_request(request, queue=None) -> str:
    """
    Process a single refresh request by calling the appropriate service function.
    
    Args:
        request: RefreshRequest object from queue
        queue: Queue instance for scheduling follow-up requests (optional)
        
    Returns:
        str: Success message with refresh details
        
    Raises:
        Exception: If refresh fails
    """
    from coclib.lambda_services import refresh_clan_from_api, refresh_player_from_api, refresh_war_from_api
    from coclib.queue.refresh_queue import RefreshType
    
    # Use direct SQL operations - no SQLAlchemy compatibility layer needed
    if request.type == RefreshType.CLAN:
        data = await refresh_clan_from_api(request.tag)
        return f"Refreshed clan {data.get('name', request.tag)} with {data.get('members', 0)} members"
    
    elif request.type == RefreshType.PLAYER:
        data = await refresh_player_from_api(request.tag)
        return f"Refreshed player {data.get('name', request.tag)} (level {data.get('expLevel', '?')})"
    
    elif request.type == RefreshType.WAR:
        data = await refresh_war_from_api(request.tag)
        war_state = data.get('state', 'unknown')
        
        # Queue follow-up refreshes if war is active and queue is available
        if queue and should_prioritize_war_data(data):
            queue_follow_up_refresh(request.tag, data, queue)
        
        return f"Refreshed war data for clan {request.tag} (state: {war_state})"
    
    else:
        raise ValueError(f"Unknown refresh type: {request.type}")


def health_check_handler(event, context):
    """
    Simple health check endpoint for monitoring.
    
    Returns:
        dict: Health status response
    """
    try:
        from coclib.queue.queue_factory import create_refresh_queue
        from coclib.db_session import lambda_db_setup, lambda_db_cleanup, get_db_session
        
        try:
            # Setup database connections
            lambda_db_setup()
            
            # Test database connection
            from coclib.db_session import get_db_session
            with get_db_session() as session:
                session.execute("SELECT 1")
                
            # Test Redis connection
            queue = create_refresh_queue()
            queue_stats = queue.get_queue_stats()
            queue_size = sum(queue_stats.values())  # Sum all priority levels
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'healthy',
                    'queue_size': queue_size,
                    'database': 'connected',
                    'timestamp': time.time()
                })
            }
        finally:
            # Clean up database connections
            lambda_db_cleanup()
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': time.time()
            })
        }


def publish_cloudwatch_metrics(processed_count: int, error_count: int, queue) -> None:
    """
    Publish custom metrics to CloudWatch for monitoring.
    
    Args:
        processed_count: Number of requests processed in this run
        error_count: Number of errors encountered
        queue: Queue instance for getting current stats
    """
    if not boto3:
        logger.warning("boto3 not available, skipping CloudWatch metrics")
        return
        
    try:
        cloudwatch = boto3.client('cloudwatch')
        
        # Get current queue size
        queue_stats = queue.get_queue_stats()
        queue_size = sum(queue_stats.values())
        
        # Prepare metrics data
        metrics = [
            {
                'MetricName': 'ProcessedRequests',
                'Value': processed_count,
                'Unit': 'Count',
                'Dimensions': [
                    {
                        'Name': 'Environment',
                        'Value': os.environ.get('ENVIRONMENT', 'unknown')
                    }
                ]
            },
            {
                'MetricName': 'ProcessingErrors',
                'Value': error_count,
                'Unit': 'Count',
                'Dimensions': [
                    {
                        'Name': 'Environment', 
                        'Value': os.environ.get('ENVIRONMENT', 'unknown')
                    }
                ]
            },
            {
                'MetricName': 'QueueSize',
                'Value': queue_size,
                'Unit': 'Count',
                'Dimensions': [
                    {
                        'Name': 'Environment',
                        'Value': os.environ.get('ENVIRONMENT', 'unknown')
                    }
                ]
            }
        ]
        
        # Add priority-specific queue metrics
        for priority, count in queue_stats.items():
            metrics.append({
                'MetricName': f'QueueSize_{priority.title()}Priority',
                'Value': count,
                'Unit': 'Count',
                'Dimensions': [
                    {
                        'Name': 'Environment',
                        'Value': os.environ.get('ENVIRONMENT', 'unknown')
                    }
                ]
            })
        
        # Publish metrics
        cloudwatch.put_metric_data(
            Namespace='CoC/RefreshWorker',
            MetricData=metrics
        )
        
        logger.info(f"Published CloudWatch metrics: {processed_count} processed, {error_count} errors, {queue_size} queued")
        
    except Exception as e:
        logger.error(f"Failed to publish CloudWatch metrics: {str(e)}")


def should_prioritize_war_data(war_data: dict) -> bool:
    """
    Determine if war data should get critical priority based on war state.
    
    Args:
        war_data: War data from CoC API
        
    Returns:
        bool: True if war data should get critical priority
    """
    war_state = war_data.get('state', '').lower()
    return war_state in ['preparation', 'inwar', 'warended']


def queue_follow_up_refresh(clan_tag: str, war_data: dict, queue) -> None:
    """
    Queue follow-up refreshes based on war state (context-aware priority).
    
    Args:
        clan_tag: Clan tag that was refreshed
        war_data: War data that was just refreshed
        queue: Queue instance for scheduling follow-ups
    """
    try:
        from coclib.queue.refresh_queue import RefreshRequest, RefreshType, RefreshPriority
        from datetime import datetime, timedelta
        import uuid
        
        if should_prioritize_war_data(war_data):
            # During active war, queue clan refresh with critical priority to get member updates
            follow_up_request = RefreshRequest(
                id=f"war-followup-{uuid.uuid4()}",
                type=RefreshType.CLAN,
                tag=clan_tag,
                priority=RefreshPriority.CRITICAL,
                requested_at=datetime.utcnow() + timedelta(minutes=2)  # Queue for 2 minutes later
            )
            
            queue.queue_refresh(follow_up_request)
            logger.info(f"Queued critical clan refresh follow-up for {clan_tag} due to active war")
            
    except Exception as e:
        logger.error(f"Failed to queue follow-up refresh for {clan_tag}: {str(e)}")