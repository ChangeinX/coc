"""
Pytest configuration and fixtures for Lambda worker tests.
"""

import sys
from unittest.mock import MagicMock

import pytest

# Add project root to path so we can import coclib
sys.path.insert(0, '../..')

from coclib.queue.refresh_queue import RefreshType, RefreshPriority, RefreshRequest


@pytest.fixture
def mock_queue():
    """Create a mock queue for testing."""
    queue = MagicMock()
    queue.get_queue_stats.return_value = {
        'high': 5,
        'medium': 10,
        'low': 15
    }
    return queue


@pytest.fixture
def mock_context():
    """Create a mock Lambda context object."""
    context = MagicMock()
    context.get_remaining_time_in_millis.return_value = 300000  # 5 minutes
    return context


@pytest.fixture
def clan_refresh_request():
    """Create a clan refresh request for testing."""
    request = MagicMock()
    request.type = RefreshType.CLAN
    request.tag = "CLAN123"
    request.retry_count = 0
    return request


@pytest.fixture
def player_refresh_request():
    """Create a player refresh request for testing."""
    request = MagicMock()
    request.type = RefreshType.PLAYER
    request.tag = "PLAYER123"
    request.retry_count = 0
    return request


@pytest.fixture
def war_refresh_request():
    """Create a war refresh request for testing."""
    request = MagicMock()
    request.type = RefreshType.WAR
    request.tag = "CLAN123"
    request.retry_count = 0
    return request


@pytest.fixture
def clan_data():
    """Sample clan data for testing."""
    return {
        "tag": "CLAN123",
        "name": "Test Clan",
        "members": 25,
        "shareLink": "https://link.clashofclans.com/?action=OpenClanProfile&tag=CLAN123"
    }


@pytest.fixture
def player_data():
    """Sample player data for testing."""
    return {
        "tag": "PLAYER123",
        "name": "Test Player",
        "expLevel": 150,
        "townHallLevel": 13,
        "shareLink": "https://link.clashofclans.com/?action=OpenPlayerProfile&tag=PLAYER123"
    }


@pytest.fixture
def war_data():
    """Sample war data for testing."""
    return {
        "state": "inWar",
        "clan": {
            "tag": "CLAN123",
            "name": "Test Clan"
        },
        "opponent": {
            "tag": "OPPONENT123",
            "name": "Opponent Clan"
        }
    }


@pytest.fixture
def empty_queue():
    """Create a mock empty queue for testing."""
    queue = MagicMock()
    queue.get_next_request.return_value = None
    queue.get_queue_stats.return_value = {
        'high': 0,
        'medium': 0,
        'low': 0
    }
    return queue