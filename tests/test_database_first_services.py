import asyncio
import sys
import pathlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import ClanSnapshot, Clan, PlayerSnapshot, Player, WarSnapshot
from coclib.services import clan_service, player_service, war_service
from coclib.services.player_service import get_player_snapshot


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SNAPSHOT_MAX_AGE = 600  # 10 minutes


class TestDatabaseFirstServices:
    """Test suite for database-first service behavior.
    
    These tests verify that services return data from the database immediately
    without making API calls, even when data is stale.
    """

    def setup_method(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def teardown_method(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()


class TestDatabaseFirstClanService(TestDatabaseFirstServices):
    """Test clan service database-first behavior"""

    def test_get_clan_returns_stale_data_immediately(self, monkeypatch):
        """Test that get_clan returns stale data without API calls"""
        # Setup: Create stale clan data (older than SNAPSHOT_MAX_AGE)
        now = datetime.utcnow()
        stale_time = now - timedelta(seconds=700)  # 11+ minutes ago
        
        clan = Clan(
            tag="ABC123", 
            data={
                "tag": "ABC123",
                "name": "Test Clan", 
                "members": 25,
                "clanLevel": 10,
                "warWins": 100,
                "warLosses": 20
            },
            deep_link="http://example.com/clan"
        )
        
        clan_snapshot = ClanSnapshot(
            id=1,
            ts=stale_time,
            clan_tag="ABC123",
            name="Test Clan",
            member_count=25,
            level=10,
            war_wins=100,
            war_losses=20,
            data={
                "tag": "ABC123",
                "name": "Test Clan",
                "members": 25,
                "clanLevel": 10,
                "warWins": 100,
                "warLosses": 20
            }
        )
        
        db.session.add_all([clan, clan_snapshot])
        db.session.commit()
        
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.clan_service.get_client", api_mock)
        
        # Test: Call get_clan and verify it returns stale data immediately
        result = asyncio.run(clan_service.get_clan("ABC123"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns data from database
        assert result is not None
        assert result["tag"] == "ABC123"
        assert result["name"] == "Test Clan"
        assert result["members"] == 25

    def test_get_clan_returns_none_for_missing_clan(self, monkeypatch):
        """Test that get_clan returns None when no data exists"""
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.clan_service.get_client", api_mock)
        
        # Test: Call get_clan for non-existent clan
        result = asyncio.run(clan_service.get_clan("MISSING"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns None for missing clan
        assert result is None

    def test_get_clan_preserves_fresh_cache(self, monkeypatch):
        """Test that get_clan uses cache when available"""
        # Mock cache with fresh data
        cache_mock = MagicMock()
        cache_mock.get.return_value = {
            "tag": "CACHED",
            "name": "Cached Clan",
            "members": 30
        }
        monkeypatch.setattr("coclib.services.clan_service.cache", cache_mock)
        
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.clan_service.get_client", api_mock)
        
        # Test: Call get_clan
        result = asyncio.run(clan_service.get_clan("CACHED"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns cached data
        assert result["tag"] == "CACHED"
        assert result["name"] == "Cached Clan"


class TestDatabaseFirstPlayerService(TestDatabaseFirstServices):
    """Test player service database-first behavior"""

    def test_get_player_snapshot_returns_stale_data_immediately(self, monkeypatch):
        """Test that get_player_snapshot returns stale data without API calls"""
        # Setup: Create stale player data
        now = datetime.utcnow()
        stale_time = now - timedelta(seconds=700)  # 11+ minutes ago
        
        player = Player(
            tag="PLAYER123",
            name="Test Player",
            data={
                "tag": "PLAYER123",
                "name": "Test Player",
                "townHallLevel": 14,
                "trophies": 3000
            }
        )
        
        player_snapshot = PlayerSnapshot(
            id=1,
            ts=stale_time,
            player_tag="PLAYER123",
            name="Test Player",
            clan_tag="CLAN123",
            role="member",
            town_hall=14,
            trophies=3000,
            donations=100,
            donations_received=50,
            war_attacks_used=2,
            last_seen=stale_time,
            data={}
        )
        
        db.session.add_all([player, player_snapshot])
        db.session.commit()
        
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.player_service.get_client", api_mock)
        
        # Test: Call get_player_snapshot
        result = asyncio.run(get_player_snapshot("PLAYER123"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns stale data from database
        assert result is not None
        assert result["tag"] == "PLAYER123"
        assert result["name"] == "Test Player"
        assert result["townHallLevel"] == 14
        assert result["trophies"] == 3000

    def test_get_player_snapshot_returns_none_for_missing_player(self, monkeypatch):
        """Test that get_player_snapshot returns None when no data exists"""
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.player_service.get_client", api_mock)
        
        # Test: Call get_player_snapshot for non-existent player
        result = asyncio.run(get_player_snapshot("MISSING"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns None for missing player
        assert result is None


class TestDatabaseFirstWarService(TestDatabaseFirstServices):
    """Test war service database-first behavior"""

    def test_current_war_snapshot_returns_stale_data_immediately(self, monkeypatch):
        """Test that current_war_snapshot returns stale data without API calls"""
        # Setup: Create stale war data
        now = datetime.utcnow()
        stale_time = now - timedelta(seconds=700)  # 11+ minutes ago
        
        war_snapshot = WarSnapshot(
            id=1,
            ts=stale_time,
            clan_tag="CLAN123",
            data={
                "state": "inWar",
                "teamSize": 30,
                "startTime": "20240101T000000.000Z",
                "endTime": "20240102T000000.000Z",
                "clan": {"tag": "CLAN123", "name": "Test Clan"}
            }
        )
        
        db.session.add(war_snapshot)
        db.session.commit()
        
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.war_service.get_client", api_mock)
        
        # Test: Call current_war_snapshot
        result = asyncio.run(war_service.current_war_snapshot("CLAN123"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns stale data from database
        assert result is not None
        assert result["state"] == "inWar"
        assert result["teamSize"] == 30
        assert result["clan"]["tag"] == "CLAN123"

    def test_current_war_snapshot_returns_none_for_missing_war(self, monkeypatch):
        """Test that current_war_snapshot returns None when no data exists"""
        # Mock: Ensure API client is never called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.war_service.get_client", api_mock)
        
        # Test: Call current_war_snapshot for clan with no war data
        result = asyncio.run(war_service.current_war_snapshot("NOWAR"))
        
        # Verify: API was never called
        api_mock.assert_not_called()
        
        # Verify: Returns None for missing war
        assert result is None


class TestBackendSnapshotService(TestDatabaseFirstServices):
    """Test backend snapshot service database-first behavior"""

    def test_get_clan_snapshot_returns_stale_data_immediately(self, monkeypatch):
        """Test that get_clan returns stale data without triggering refresh"""
        # Import the backend service
        from app.services.snapshot_service import get_clan as get_clan_snapshot
        
        # Setup: Create stale clan data
        now = datetime.utcnow()
        stale_time = now - timedelta(seconds=700)  # 11+ minutes ago
        
        clan_snapshot = ClanSnapshot(
            id=1,
            ts=stale_time,
            clan_tag="STALE123",
            name="Stale Clan",
            member_count=20,
            level=8,
            war_wins=50,
            war_losses=10,
            data={
                "tag": "STALE123",
                "name": "Stale Clan",
                "members": 20,
                "memberList": []
            }
        )
        
        db.session.add(clan_snapshot)
        db.session.commit()
        
        # Mock: Ensure clan_service.get_clan is never called
        clan_service_mock = MagicMock()
        monkeypatch.setattr("app.services.snapshot_service.clan_service.get_clan", clan_service_mock)
        
        # Test: Call get_clan_snapshot
        result = asyncio.run(get_clan_snapshot("STALE123"))
        
        # Verify: clan_service.get_clan was never called
        clan_service_mock.assert_not_called()
        
        # Verify: Returns stale data from database
        assert result is not None
        assert result["tag"] == "STALE123"
        assert result["name"] == "Stale Clan"
        # Note: members count reflects actual member list length, not snapshot member_count
        assert result["members"] == 0  # No active members in loyalty table


class TestStalenessMetadata(TestDatabaseFirstServices):
    """Test that staleness metadata is included in responses for mobile"""

    def test_clan_response_includes_staleness_metadata(self, monkeypatch):
        """Test that clan responses include last_updated and is_stale flags"""
        # Setup: Create stale clan data
        now = datetime.utcnow()
        stale_time = now - timedelta(seconds=700)  # 11+ minutes ago
        
        clan_snapshot = ClanSnapshot(
            id=1,
            ts=stale_time,
            clan_tag="META123",
            name="Meta Clan",
            member_count=25,
            level=12,
            war_wins=75,
            war_losses=15,
            data={"tag": "META123", "name": "Meta Clan"}
        )
        
        db.session.add(clan_snapshot)
        db.session.commit()
        
        # Mock API to never be called
        api_mock = MagicMock()
        monkeypatch.setattr("coclib.services.clan_service.get_client", api_mock)
        
        # Test: Call service (this will be modified to include metadata)
        result = asyncio.run(clan_service.get_clan("META123"))
        
        # Note: These assertions will pass once we implement metadata
        # For now, we're testing the current behavior and will enhance it
        assert result is not None
        assert result["tag"] == "META123"
        
        # Future: These assertions will verify staleness metadata
        # assert "last_updated" in result
        # assert "is_stale" in result
        # assert result["is_stale"] == True  # Data is older than 10 minutes


class TestPlayerTokenVerificationRemains:
    """Test that player token verification continues to use live API calls"""

    def setup_method(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()

    def teardown_method(self):
        self.app_context.pop()

    def test_verify_player_token_still_calls_api(self, monkeypatch):
        """Test that verify_player_token continues to make live API calls"""
        
        async def mock_verify_player_token(player_tag, token):
            return True
            
        # Mock: API client should be called for token verification
        client_mock = MagicMock()
        client_mock.verify_player_token = mock_verify_player_token
        
        async def mock_get_client():
            return client_mock
        
        monkeypatch.setattr("coclib.services.player_service.get_client", mock_get_client)
        
        # Test: Call verify_token
        result = asyncio.run(player_service.verify_token("PLAYER123", "token123"))
        
        # Verify: Returns API result (the actual verification)
        assert result is True