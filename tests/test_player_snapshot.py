import sys
import pathlib
import asyncio
from datetime import datetime, timedelta

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "sync"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import PlayerSnapshot, Player
from services.player_service import get_player_snapshot

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_old_war_attacks_returned():
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

        result = asyncio.run(get_player_snapshot("ABC"))
        assert result["warAttacksUsed"] == 2


def test_war_attacks_reset_after_grace():
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

        result = asyncio.run(get_player_snapshot("XYZ"))
        assert result["warAttacksUsed"] is None
