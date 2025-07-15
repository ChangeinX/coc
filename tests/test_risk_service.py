from dataclasses import dataclass
from datetime import datetime, timedelta
import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app.services import risk_service


@dataclass
class Snap:
    ts: datetime
    donations: int = 0
    donations_received: int = 0
    war_attacks_used: int | None = None
    trophies: int = 0
    last_seen: datetime | None = None


def test_clamp01():
    assert risk_service._clamp01(-1) == 0.0
    assert risk_service._clamp01(0.5) == 0.5
    assert risk_service._clamp01(2) == 1.0


def test_idle_pct_from_days():
    assert risk_service._idle_pct_from_days(1) == 0.0
    assert risk_service._idle_pct_from_days(2) == 0.5
    assert risk_service._idle_pct_from_days(3) == 0.75
    assert risk_service._idle_pct_from_days(4) == 1.0


def test_latest_war_snapshot_and_cap():
    now = datetime.utcnow()
    history = [
        Snap(now - timedelta(days=2), war_attacks_used=None),
        Snap(now - timedelta(days=1), war_attacks_used=1),
        Snap(now, war_attacks_used=0),
    ]
    war_snap = risk_service._latest_war_snapshot(history)
    assert war_snap is history[-1]
    cap = risk_service._infer_attack_cap(history)
    assert cap in {1, 2}
