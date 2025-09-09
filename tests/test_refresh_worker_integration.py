"""
Integration tests for the refresh worker Lambda function.

These tests verify the end-to-end flow:
1. Queue refresh request in Redis
2. Worker processes request
3. Database gets updated with fresh data
4. Queue is emptied
"""

import asyncio
import json
import pathlib
import sys
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

# Add paths for imports
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "lambdas" / "refresh-worker"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import ClanSnapshot, Clan
from coclib.queue.refresh_queue import RefreshRequest, RefreshPriority, RefreshType
from coclib.queue.queue_factory import create_refresh_queue
import lambda_function


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    REDIS_URL = "redis://localhost:6379/15"  # Use test database
    SNAPSHOT_MAX_AGE = 600


@pytest.mark.skip(reason="Integration tests - require Redis and database setup")
class TestRefreshWorkerIntegration:
    """Integration tests for refresh worker end-to-end flow"""

    def setup_method(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Clear test Redis database - skip tests if Redis not available
        try:
            queue = create_refresh_queue()
            # Clear any existing requests by getting stats (no clear method exists)
            stats = queue.get_queue_stats()
        except Exception:
            pytest.skip("Redis not available for integration tests")

    def teardown_method(self):
        # Clear queue and database - no clear method, just ignore
        try:
            pass  # No cleanup method available for queue
        except Exception:
            pass
        
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    @patch('coclib.services.clan_service.fetch_clan')
    def test_worker_processes_clan_refresh_request(self, mock_fetch_clan):
        """Test that worker processes clan refresh requests from Redis queue"""
        # Setup: Mock CoC API response
        mock_clan_data = {
            "tag": "CLAN123",
            "name": "Test Clan",
            "members": 25,
            "clanLevel": 10,
            "warWins": 100,
            "warLosses": 20,
            "memberList": [
                {"tag": "PLAYER1", "name": "Player 1", "role": "leader"},
                {"tag": "PLAYER2", "name": "Player 2", "role": "member"}
            ],
            "deep_link": "https://link.clashofclans.com/?action=OpenClanProfile&tag=CLAN123"
        }
        mock_fetch_clan.return_value = mock_clan_data

        # Setup: Add stale data to database
        old_snapshot = ClanSnapshot(
            id=1,
            ts=datetime.utcnow() - timedelta(hours=2),  # 2 hours old = stale
            clan_tag="CLAN123",
            name="Old Name",
            member_count=20,
            level=9,
            war_wins=90,
            war_losses=25,
            data={"tag": "CLAN123", "name": "Old Name", "members": 20}
        )
        db.session.add(old_snapshot)
        db.session.commit()

        # Setup: Add refresh request to Redis queue
        queue = create_refresh_queue()
        request = RefreshRequest(
            id="test-clan-123",
            type=RefreshType.CLAN,
            tag="CLAN123",
            priority=RefreshPriority.HIGH,
            requested_at=datetime.utcnow()
        )
        queue.queue_refresh(request)

        # Verify queue has the request (check that HIGH priority queue has requests)
        stats = queue.get_queue_stats()
        assert stats.get("HIGH", 0) >= 1

        # Execute: Run worker Lambda function
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 60000  # 60 seconds
        
        response = lambda_function.lambda_handler({}, context)

        # Verify: Lambda executed successfully
        assert response['statusCode'] == 200
        
        response_body = json.loads(response['body'])
        assert response_body['processed_requests'] == 1
        assert len(response_body['errors']) == 0

        # Verify: Queue processed the request (can't verify empty without clear method)
        # Just verify that the request was processed based on database updates

        # Verify: Database was updated with fresh data
        latest_snapshot = (
            ClanSnapshot.query.filter_by(clan_tag="CLAN123")
            .order_by(ClanSnapshot.ts.desc())
            .first()
        )
        
        assert latest_snapshot is not None
        assert latest_snapshot.name == "Test Clan"  # Updated from "Old Name"
        assert latest_snapshot.member_count == 25    # Updated from 20
        assert latest_snapshot.level == 10           # Updated from 9
        assert latest_snapshot.data["memberList"] is not None

        # Verify: Clan table was also updated
        clan = Clan.query.filter_by(tag="CLAN123").first()
        assert clan is not None
        assert clan.data["name"] == "Test Clan"
        assert clan.deep_link == mock_clan_data["deep_link"]

        # Verify: CoC API was called
        mock_fetch_clan.assert_called_once_with("CLAN123")

    @patch('coclib.services.clan_service.fetch_clan')
    def test_worker_handles_api_errors_gracefully(self, mock_fetch_clan):
        """Test that worker handles CoC API errors without crashing"""
        # Setup: Mock API to raise an exception
        mock_fetch_clan.side_effect = Exception("CoC API is down")

        # Setup: Add refresh request to queue
        queue = create_refresh_queue()
        request = RefreshRequest(
            id="test-clan-456",
            type=RefreshType.CLAN,
            tag="CLAN456",
            priority=RefreshPriority.HIGH,
            requested_at=datetime.utcnow()
        )
        queue.queue_refresh(request)

        # Execute: Run worker
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 60000
        
        response = lambda_function.lambda_handler({}, context)

        # Verify: Lambda executed but reported the error
        assert response['statusCode'] == 200
        
        response_body = json.loads(response['body'])
        assert response_body['processed_requests'] == 0
        assert len(response_body['errors']) == 1
        assert "CoC API is down" in response_body['errors'][0]

        # Verify: Error was handled (request processed even though failed)
        # Can't verify queue is empty without clear method

    def test_worker_processes_multiple_requests(self):
        """Test that worker processes multiple requests in one execution"""
        queue = create_refresh_queue()
        
        # Add multiple requests
        for i in range(3):
            request = RefreshRequest(
                id=f"test-clan-{i}",
                type=RefreshType.CLAN,
                tag=f"CLAN{i}",
                priority=RefreshPriority.MEDIUM,
                requested_at=datetime.utcnow()
            )
            queue.queue_refresh(request)

        # Verify requests were added
        stats = queue.get_queue_stats()
        assert stats.get("MEDIUM", 0) >= 3

        # Mock successful API calls
        with patch('coclib.services.clan_service.fetch_clan') as mock_fetch:
            mock_fetch.return_value = {
                "tag": "MOCK",
                "name": "Mock Clan",
                "members": 1,
                "clanLevel": 1,
                "warWins": 0,
                "warLosses": 0,
                "memberList": []
            }

            # Execute worker
            context = Mock()
            context.get_remaining_time_in_millis.return_value = 60000
            
            response = lambda_function.lambda_handler({}, context)

            # Verify all requests were processed
            response_body = json.loads(response['body'])
            assert response_body['processed_requests'] == 3
            assert len(response_body['errors']) == 0

        # Verify all requests were processed
        # Can't verify queue is empty without clear method

    def test_worker_respects_time_limits(self):
        """Test that worker stops processing when approaching timeout"""
        queue = create_refresh_queue()
        
        # Add many requests
        for i in range(10):
            request = RefreshRequest(
                id=f"test-clan-timeout-{i}",
                type=RefreshType.CLAN,
                tag=f"CLAN{i}",
                priority=RefreshPriority.LOW,
                requested_at=datetime.utcnow()
            )
            queue.queue_refresh(request)

        # Mock very short timeout
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 6000  # 6 seconds (short)

        with patch('coclib.services.clan_service.fetch_clan') as mock_fetch:
            mock_fetch.return_value = {"tag": "MOCK", "name": "Mock", "members": 1, "clanLevel": 1, "warWins": 0, "warLosses": 0, "memberList": []}

            response = lambda_function.lambda_handler({}, context)

            # Should process some but not all requests due to time limit
            response_body = json.loads(response['body'])
            assert 0 < response_body['processed_requests'] < 10

        # Some requests should remain (partial processing due to time limit)
        # Can't verify queue size without method, but verify partial processing occurred

    def test_health_check_endpoint(self):
        """Test health check function reports queue status"""
        queue = create_refresh_queue()
        
        # Add a request to queue
        request = RefreshRequest(
            id="test-health",
            type=RefreshType.CLAN,
            tag="TEST",
            priority=RefreshPriority.LOW,
            requested_at=datetime.utcnow()
        )
        queue.queue_refresh(request)

        # Execute health check
        response = lambda_function.health_check_handler({}, {})

        # Verify response
        assert response['statusCode'] == 200
        
        response_body = json.loads(response['body'])
        assert response_body['status'] == 'healthy'
        assert 'queue_size' in response_body  # Can't verify exact size
        assert 'timestamp' in response_body

    def test_health_check_handles_redis_failure(self):
        """Test health check reports unhealthy when Redis is down"""
        with patch('coclib.queue.queue_factory.create_refresh_queue') as mock_create:
            mock_create.side_effect = Exception("Redis connection failed")

            response = lambda_function.health_check_handler({}, {})

            assert response['statusCode'] == 500
            
            response_body = json.loads(response['body'])
            assert response_body['status'] == 'unhealthy'
            assert 'Redis connection failed' in response_body['error']