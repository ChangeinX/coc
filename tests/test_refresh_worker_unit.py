"""
Unit tests for the refresh worker Lambda function.

Tests Lambda function logic without external dependencies.
"""

import json
import pathlib
import sys
import time
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

import pytest

# Add refresh-worker to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "lambdas" / "refresh-worker"))

import lambda_function


class TestLambdaFunction:
    """Unit tests for Lambda function logic"""

    @patch('coclib.db_session.lambda_db_setup')
    @patch('coclib.db_session.lambda_db_cleanup') 
    @patch('coclib.queue.queue_factory.create_refresh_queue')
    def test_lambda_handler_no_requests(self, mock_create_queue, mock_cleanup, mock_setup):
        """Test Lambda handler when queue is empty"""
        # Setup mocks
        mock_queue = Mock()
        mock_queue.get_next_request.return_value = None
        mock_create_queue.return_value = mock_queue
        
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 60000
        
        # Execute
        result = lambda_function.lambda_handler({}, context)
        
        # Verify
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['processed_requests'] == 0
        assert len(body['errors']) == 0
        
        mock_setup.assert_called_once()
        mock_cleanup.assert_called_once()

    @patch('coclib.db_session.lambda_db_setup')
    @patch('coclib.db_session.lambda_db_cleanup')
    @patch('coclib.queue.queue_factory.create_refresh_queue')
    @patch('lambda_function.process_refresh_request')
    def test_lambda_handler_processes_requests(self, mock_process, mock_create_queue, mock_cleanup, mock_setup):
        """Test Lambda handler processes requests successfully"""
        # Setup mocks
        mock_request = Mock()
        mock_request.type.value = "clan"
        mock_request.tag = "CLAN123"
        
        mock_queue = Mock()
        mock_queue.get_next_request.side_effect = [mock_request, None]  # Return request, then empty
        mock_create_queue.return_value = mock_queue
        
        # Mock async process function
        async def mock_async_process(req):
            return "Mocked refresh result"
        mock_process.side_effect = mock_async_process
        
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 60000
        
        with patch('asyncio.run', side_effect=lambda coro: "Mocked refresh result"):
            # Execute
            result = lambda_function.lambda_handler({}, context)
        
        # Verify
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['processed_requests'] == 1
        assert len(body['errors']) == 0

    @patch('coclib.db_session.lambda_db_setup')
    @patch('coclib.db_session.lambda_db_cleanup')
    @patch('coclib.queue.queue_factory.create_refresh_queue')  
    @patch('lambda_function.handle_failed_request')
    def test_lambda_handler_handles_errors(self, mock_handle_failed, mock_create_queue, mock_cleanup, mock_setup):
        """Test Lambda handler handles processing errors gracefully"""
        # Setup mocks
        mock_request = Mock()
        mock_request.type.value = "clan"
        mock_request.tag = "CLAN123"
        
        mock_queue = Mock()
        mock_queue.get_next_request.side_effect = [mock_request, None]
        mock_create_queue.return_value = mock_queue
        
        # Mock asyncio.run to raise exception
        with patch('asyncio.run', side_effect=Exception("CoC API Error")):
            context = Mock()
            context.get_remaining_time_in_millis.return_value = 60000
            
            # Execute
            result = lambda_function.lambda_handler({}, context)
        
        # Verify
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['processed_requests'] == 0
        assert len(body['errors']) == 1
        assert "CoC API Error" in body['errors'][0]
        
        mock_handle_failed.assert_called_once()

    def test_handle_failed_request_retry_logic(self):
        """Test retry logic with exponential backoff"""
        from coclib.queue.refresh_queue import RefreshRequest, RefreshType, RefreshPriority
        
        # Create mock request
        mock_request = Mock()
        mock_request.id = "test-123"
        mock_request.type = RefreshType.CLAN
        mock_request.tag = "CLAN123"
        mock_request.retry_count = 0
        
        # Create mock queue
        mock_queue = Mock()
        
        # Execute
        lambda_function.handle_failed_request(mock_request, "Test error", mock_queue)
        
        # Verify retry was scheduled
        mock_queue.queue_refresh.assert_called_once()
        
        # Check retry request properties
        retry_call = mock_queue.queue_refresh.call_args[0][0]
        assert retry_call.retry_count == 1
        assert retry_call.priority == RefreshPriority.LOW
        assert "retry-1" in retry_call.id

    def test_handle_failed_request_max_retries_exceeded(self):
        """Test that requests are abandoned after max retries"""
        # Create mock request with max retries
        mock_request = Mock()
        mock_request.id = "test-123"
        mock_request.type.value = "clan"
        mock_request.tag = "CLAN123"
        mock_request.retry_count = 3  # Already at max
        
        mock_queue = Mock()
        
        with patch('lambda_function.logger') as mock_logger:
            # Execute
            lambda_function.handle_failed_request(mock_request, "Test error", mock_queue)
            
            # Verify no retry was scheduled
            mock_queue.queue_refresh.assert_not_called()
            
            # Verify permanent failure was logged
            mock_logger.error.assert_called()
            error_call = mock_logger.error.call_args[0][0]
            assert "Permanent failure" in error_call
            assert "after 3 retries" in error_call


class TestProcessRefreshRequest:
    """Unit tests for process_refresh_request function"""

    @pytest.mark.skip(reason="Integration test - requires database and proper environment setup")
    @patch('coclib.db_session.get_db_session')
    @patch('coclib.services.clan_service')
    @pytest.mark.asyncio
    async def test_process_clan_refresh(self, mock_clan_service, mock_get_session):
        """Test clan refresh processing"""
        from coclib.queue.refresh_queue import RefreshRequest, RefreshType, RefreshPriority
        
        # Setup mock
        mock_session_context = Mock()
        mock_get_session.return_value.__enter__ = Mock(return_value=mock_session_context)
        mock_get_session.return_value.__exit__ = Mock(return_value=None)
        
        mock_clan_data = {
            "name": "Test Clan",
            "members": 25
        }
        mock_clan_service.refresh_clan_from_api.return_value = mock_clan_data
        
        # Create request
        request = Mock()
        request.type = RefreshType.CLAN
        request.tag = "CLAN123"
        
        # Execute
        result = await lambda_function.process_refresh_request(request)
        
        # Verify
        assert "Refreshed clan Test Clan" in result
        assert "25 members" in result
        mock_clan_service.refresh_clan_from_api.assert_called_once_with("CLAN123")

    @pytest.mark.skip(reason="Integration test - requires database and proper environment setup")
    @patch('coclib.db_session.get_db_session')
    @patch('coclib.services.player_service')
    @pytest.mark.asyncio
    async def test_process_player_refresh(self, mock_player_service, mock_get_session):
        """Test player refresh processing"""
        from coclib.queue.refresh_queue import RefreshType
        
        # Setup mock
        mock_session_context = Mock()
        mock_get_session.return_value.__enter__ = Mock(return_value=mock_session_context)
        mock_get_session.return_value.__exit__ = Mock(return_value=None)
        
        mock_player_data = {
            "name": "Test Player", 
            "expLevel": 150
        }
        mock_player_service.refresh_player_from_api.return_value = mock_player_data
        
        request = Mock()
        request.type = RefreshType.PLAYER
        request.tag = "PLAYER123"
        
        # Execute
        result = await lambda_function.process_refresh_request(request)
        
        # Verify
        assert "Refreshed player Test Player" in result
        assert "level 150" in result
        mock_player_service.refresh_player_from_api.assert_called_once_with("PLAYER123")

    @pytest.mark.skip(reason="Integration test - requires database and proper environment setup")
    @pytest.mark.asyncio
    async def test_process_unknown_type(self):
        """Test handling of unknown refresh type"""
        request = Mock()
        request.type = "UNKNOWN"
        
        with pytest.raises(ValueError, match="Unknown refresh type"):
            await lambda_function.process_refresh_request(request)


class TestHealthCheck:
    """Unit tests for health check function"""

    @patch('coclib.db_session.lambda_db_setup')
    @patch('coclib.db_session.lambda_db_cleanup')
    @patch('coclib.db_session.get_db_session')
    @patch('coclib.queue.queue_factory.create_refresh_queue')
    def test_health_check_success(self, mock_create_queue, mock_get_session, mock_cleanup, mock_setup):
        """Test successful health check"""
        # Setup mocks
        mock_session_context = Mock()
        mock_get_session.return_value.__enter__ = Mock(return_value=mock_session_context)
        mock_get_session.return_value.__exit__ = Mock(return_value=None)
        
        mock_queue = Mock()
        mock_queue.get_queue_stats.return_value = {"HIGH": 2, "MEDIUM": 5, "LOW": 1}
        mock_create_queue.return_value = mock_queue
        
        # Execute
        result = lambda_function.health_check_handler({}, {})
        
        # Verify
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['status'] == 'healthy'
        assert body['queue_size'] == 8  # Sum of all priorities
        assert body['database'] == 'connected'
        
        mock_setup.assert_called_once()
        mock_cleanup.assert_called_once()

    @patch('coclib.db_session.lambda_db_setup', side_effect=Exception("DB Connection Failed"))
    def test_health_check_failure(self, mock_setup):
        """Test health check failure"""
        # Execute
        result = lambda_function.health_check_handler({}, {})
        
        # Verify
        assert result['statusCode'] == 500
        body = json.loads(result['body'])
        assert body['status'] == 'unhealthy'
        assert 'DB Connection Failed' in body['error']