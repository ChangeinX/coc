import asyncio
from datetime import datetime, timedelta
import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import ClanSnapshot, PlayerSnapshot, Player, LoyaltyMembership, Clan
from coclib.services import clan_service
from app.services import snapshot_service


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


async def dummy_fetch_clan(tag: str) -> dict:
    return {
        "tag": "CLN",
        "name": "Clan",
        "clanLevel": 10,
        "members": 0,
        "warWins": 0,
        "warLosses": 0,
        "memberList": [],
    }


async def dummy_fetch_failure(tag: str) -> dict:
    return {}


def test_memberships_closed_on_departure(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        clan = Clan(tag="CLN", data={})
        cs = ClanSnapshot(
            id=1,
            ts=now - timedelta(minutes=1),
            clan_tag="CLN",
            name="Clan",
            member_count=1,
            level=10,
            war_wins=0,
            war_losses=0,
            data={},
        )
        player = Player(tag="P1", name="Tester", data={})
        ps = PlayerSnapshot(
            id=1,
            ts=now - timedelta(minutes=1),
            player_tag="P1",
            clan_tag="CLN",
            name="Tester",
            role="member",
            town_hall=15,
            trophies=0,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now - timedelta(minutes=1),
            data={},
        )
        mem = LoyaltyMembership(id=1, player_tag="P1", clan_tag="CLN", joined_at=now - timedelta(minutes=1))
        db.session.add_all([clan, cs, player, ps, mem])
        db.session.commit()

        # Ensure member shows initially
        data = asyncio.run(snapshot_service.get_clan("CLN"))
        assert data["memberList"]

        monkeypatch.setattr(clan_service, "fetch_clan", dummy_fetch_clan)
        asyncio.run(clan_service.refresh_clan_from_api("CLN"))

        snapshot_service.cache.clear()
        data = asyncio.run(snapshot_service.get_clan("CLN"))
        assert data["memberList"] == []


def test_memberships_unchanged_on_fetch_error(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        clan = Clan(tag="CLN", data={})
        cs = ClanSnapshot(
            id=2,
            ts=now - timedelta(minutes=1),
            clan_tag="CLN",
            name="Clan",
            member_count=1,
            level=10,
            war_wins=0,
            war_losses=0,
            data={},
        )
        player = Player(tag="P1", name="Tester", data={})
        ps = PlayerSnapshot(
            id=2,
            ts=now - timedelta(minutes=1),
            player_tag="P1",
            clan_tag="CLN",
            name="Tester",
            role="member",
            town_hall=15,
            trophies=0,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now - timedelta(minutes=1),
            data={},
        )
        mem = LoyaltyMembership(id=2, player_tag="P1", clan_tag="CLN", joined_at=now - timedelta(minutes=1))
        db.session.add_all([clan, cs, player, ps, mem])
        db.session.commit()

        monkeypatch.setattr(clan_service, "fetch_clan", dummy_fetch_failure)
        try:
            asyncio.run(clan_service.refresh_clan_from_api("CLN"))
        except RuntimeError:
            pass  # Expected failure

        snapshot_service.cache.clear()
        data = asyncio.run(snapshot_service.get_clan("CLN"))
        assert data["memberList"]


