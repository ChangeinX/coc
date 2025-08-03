import asyncio
from datetime import datetime, timedelta

from coclib.services.player_service import get_player_snapshot

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import PlayerSnapshot, Player

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_old_war_attacks_returned(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        player = Player(tag="ABC", name="Test", data={})
        ps_old = PlayerSnapshot(
            id=1,
            ts=now - timedelta(days=2),
            player_tag="ABC",
            name="Test",
            clan_tag="CLAN",
            role="member",
            town_hall=15,
            trophies=1000,
            donations=0,
            donations_received=0,
            war_attacks_used=2,
            last_seen=now - timedelta(days=2),
            data={},
        )
        ps_new = PlayerSnapshot(
            id=2,
            ts=now - timedelta(days=1),
            player_tag="ABC",
            name="Test",
            clan_tag="CLAN",
            role="member",
            town_hall=15,
            trophies=1000,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now - timedelta(days=1),
            data={},
        )
        db.session.add_all([player, ps_old, ps_new])
        db.session.commit()

        async def dummy_player(tag: str, war_attacks_used=None):
            raise RuntimeError("offline")

        monkeypatch.setattr(
            "coclib.services.player_service.get_player",
            dummy_player,
        )

        result = asyncio.run(get_player_snapshot("ABC"))
        assert result["warAttacksUsed"] == 2


def test_war_attacks_reset_after_grace(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        player = Player(tag="XYZ", name="Again", data={})
        ps_old = PlayerSnapshot(
            id=3,
            ts=now - timedelta(days=10),
            player_tag="XYZ",
            name="Again",
            clan_tag="CLAN",
            role="member",
            town_hall=15,
            trophies=1000,
            donations=0,
            donations_received=0,
            war_attacks_used=2,
            last_seen=now - timedelta(days=10),
            data={},
        )
        ps_new = PlayerSnapshot(
            id=4,
            ts=now - timedelta(days=1),
            player_tag="XYZ",
            name="Again",
            clan_tag="CLAN",
            role="member",
            town_hall=15,
            trophies=1000,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now - timedelta(days=1),
            data={},
        )
        db.session.add_all([player, ps_old, ps_new])
        db.session.commit()

        async def dummy_player(tag: str, war_attacks_used=None):
            raise RuntimeError("offline")

        monkeypatch.setattr(
            "coclib.services.player_service.get_player",
            dummy_player,
        )

        result = asyncio.run(get_player_snapshot("XYZ"))
        assert result["warAttacksUsed"] is None


# Regression test for issue #117
def test_labels_returned_from_player_data(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        labels = [
            {"id": 1, "name": "Veteran", "iconUrls": {"small": "http://example.com/icon.png"}}
        ]
        player = Player(tag="LAB", name="Tester", data={"labels": labels})
        ps = PlayerSnapshot(
            id=5,
            ts=now,
            player_tag="LAB",
            name="Tester",
            clan_tag="CLAN",
            role="member",
            town_hall=15,
            trophies=0,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now,
            data={},
        )
        db.session.add_all([player, ps])
        db.session.commit()

        async def dummy_player(tag: str, war_attacks_used=None):
            raise RuntimeError("offline")

        monkeypatch.setattr(
            "coclib.services.player_service.get_player",
            dummy_player,
        )

        result = asyncio.run(get_player_snapshot("LAB"))
        assert result["labels"] == labels


def test_deep_link_returned(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        player = Player(tag="DLNK", name="DL", deep_link="http://example.com", data={})
        ps = PlayerSnapshot(
            id=6,
            ts=now,
            player_tag="DLNK",
            name="DL",
            clan_tag="CLAN",
            role="member",
            town_hall=10,
            trophies=0,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now,
            data={"deep_link": "http://example.com"},
        )
        db.session.add_all([player, ps])
        db.session.commit()

        async def dummy_player(tag: str, war_attacks_used=None):
            raise RuntimeError("offline")

        monkeypatch.setattr(
            "coclib.services.player_service.get_player",
            dummy_player,
        )

        result = asyncio.run(get_player_snapshot("DLNK"))
        assert result["deep_link"] == "http://example.com"
