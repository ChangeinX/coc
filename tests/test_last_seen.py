from datetime import datetime, timedelta

from coclib.services import player_service

class Snap:
    def __init__(self, *, last_seen=None, trophies=0, donations=0, donations_received=0, war_attacks_used=None):
        self.last_seen = last_seen
        self.trophies = trophies
        self.donations = donations
        self.donations_received = donations_received
        self.war_attacks_used = war_attacks_used


def test_resolve_last_seen_changes():
    now = datetime.utcnow()
    prev = Snap(last_seen=now - timedelta(days=2), trophies=100)
    data = {"trophies": 101}
    result = player_service._resolve_last_seen(
        data=data,
        prev_snapshot=prev,
        attacks_used=None,
        now=now,
    )
    assert result >= now


def test_resolve_last_seen_no_changes():
    now = datetime.utcnow()
    prev = Snap(last_seen=now - timedelta(days=5), trophies=100)
    data = {"trophies": 100}
    result = player_service._resolve_last_seen(
        data=data,
        prev_snapshot=prev,
        attacks_used=None,
        now=now,
    )
    assert result == prev.last_seen
