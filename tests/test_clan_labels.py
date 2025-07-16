import sys
import pathlib
import asyncio
from datetime import datetime

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import ClanSnapshot, PlayerSnapshot, Player, Clan, LoyaltyMembership
from app.services import snapshot_service


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_member_labels_in_clan_snapshot():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        now = datetime.utcnow()
        labels = [
            {"id": 1, "name": "Veteran", "iconUrls": {"small": "http://example.com/icon.png"}}
        ]
        clan = Clan(tag="CLN", data={"badgeUrls": {"small": "b.png"}})
        cs = ClanSnapshot(
            id=1,
            ts=now,
            clan_tag="CLN",
            name="Clan",
            member_count=1,
            level=10,
            war_wins=0,
            war_losses=0,
            data={},
        )
        player = Player(tag="P1", name="Tester", data={"labels": labels, "league": {"iconUrls": {"tiny": "http://e.com/l.png"}}})
        ps = PlayerSnapshot(
            id=1,
            ts=now,
            player_tag="P1",
            clan_tag="CLN",
            name="Tester",
            role="member",
            town_hall=15,
            trophies=0,
            donations=0,
            donations_received=0,
            war_attacks_used=None,
            last_seen=now,
            data={},
        )
        mem = LoyaltyMembership(id=1, player_tag="P1", clan_tag="CLN", joined_at=now)
        db.session.add_all([clan, cs, player, ps, mem])
        db.session.commit()

        data = asyncio.run(snapshot_service.get_clan("CLN"))
        assert data["memberList"][0]["labels"] == labels

