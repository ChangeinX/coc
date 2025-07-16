from datetime import timedelta, datetime
import logging
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import select, desc

from coclib.extensions import db
from coclib.models import PlayerSnapshot
from .snapshot_service import get_clan as refresh_clan

_WEIGHTS = {
    "war": 0.40,  # 40 pts when clan is actively warring
    "idle": 0.35,  # ↑ from 0.25 → emphasise recency of idleness
    "don_deficit": 0.15,
    "don_drop": 0.10,
}
_MAX = 100
_WAR_ATTACKS_TOTAL = 2
_DEFICIT_CEIL = 0.50
_DROP_CEIL = 0.30
_CLAN_WAR_WINDOW = 42

logger = logging.getLogger(__name__)


# Idle buckets → percentage contribution on the idle axis
def _idle_pct_from_days(days: int) -> float:
    """Return the idle axis percentage given whole *days* since last activity."""
    if days >= 4:
        return 1.0  # sitting duck
    if days == 3:
        return 0.75  # getting intense
    if days == 2:
        return 0.50  # mild concern
    return 0.0  # active within 24‑48h → no idle penalty


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _latest_war_snapshot(history: List[PlayerSnapshot]) -> Optional[PlayerSnapshot]:
    """Newest snapshot that still contains war info (player was in the roster)."""
    for snap in reversed(history):          # newest → oldest
        if snap.war_attacks_used is not None:
            return snap
    return None

def _infer_attack_cap(history: List[PlayerSnapshot]) -> int:
    """Best-guess the max attacks available in the observed war."""
    cap = max(
        (snap.war_attacks_used or 0)
        for snap in history
        if snap.war_attacks_used is not None
    )
    return cap or _WAR_ATTACKS_TOTAL


def _clan_has_war(history_map: dict[str, list]) -> bool:
    """Return *True* if ANY member has war attacks in the recent window."""
    cutoff = history_map["now"] - timedelta(days=_CLAN_WAR_WINDOW) # noqa
    for snapshots in history_map["all"]:
        if any(s.ts >= cutoff and s.war_attacks_used is not None for s in snapshots):
            return True
    return False


async def get_history(player_tag: str, days: int = 30):
    """Return **oldest→newest** snapshots for *player_tag* limited to *days*."""
    cutoff = db.func.now() - timedelta(days=days)
    stmt = (
        select(PlayerSnapshot)
        .where(PlayerSnapshot.player_tag == player_tag, PlayerSnapshot.ts >= cutoff) # noqa
        .order_by(desc(PlayerSnapshot.ts))
    )
    res = db.session.execute(stmt).scalars().all()
    return list(reversed(res))


def _axes_data(
    history: List[PlayerSnapshot], clan_history_map: dict | None = None
) -> Tuple[Dict[str, Any], datetime]:
    if not history:
        return {
            "war": 0.0,
            "idle": 0.0,
            "deficit": 0.0,
            "drop": 0.0,
            "war_used": None,
            "war_cap": None,
            "idle_days": 0,
        }, datetime.utcnow()

    latest = history[-1]
    if len(history) < 2:
        prev = history[0]
    else:
        prev = history[-8] if len(history) >= 8 else history[0]

    war_snap = _latest_war_snapshot(history)
    if war_snap is None:
        war_miss_pct = 0.0
        war_used = None
        cap = None
    else:
        cap = _infer_attack_cap(history)
        war_used = war_snap.war_attacks_used
        war_miss_pct = _clamp01((cap - war_used) / cap)
        if (
            war_used == 0
            and datetime.utcnow() - war_snap.ts < timedelta(hours=24)
        ):
            # War likely still in progress – don't penalize yet
            war_miss_pct = 0.0

    clan_active = True
    if clan_history_map is not None:
        clan_active = _clan_has_war(clan_history_map)
    if not clan_active:
        war_miss_pct = 0.0

    last_change = next(
        (
            s
            for s in reversed(history)
            if s.trophies != latest.trophies or s.donations != latest.donations
        ),
        history[0],
    )
    activity_ts = latest.last_seen or last_change.ts
    idle_days = (datetime.utcnow() - activity_ts).days
    idle_pct = _idle_pct_from_days(idle_days)

    ratio = latest.donations / max(latest.donations_received, 1)
    deficit_pct = _clamp01((_DEFICIT_CEIL - ratio) / _DEFICIT_CEIL)

    drop_ratio = (prev.donations - latest.donations) / max(prev.donations, 1)
    drop_pct = _clamp01(drop_ratio / _DROP_CEIL)

    return (
        {
            "war": war_miss_pct,
            "idle": idle_pct,
            "deficit": deficit_pct,
            "drop": drop_pct,
            "war_used": war_used,
            "war_cap": cap,
            "idle_days": idle_days,
        },
        activity_ts,
    )


def score(
    history: List[PlayerSnapshot], clan_history_map: dict | None = None
) -> tuple[int, datetime]:
    """Compute the 0-100 risk score for a single member."""
    axes, activity_ts = _axes_data(history, clan_history_map)

    raw = (
        _WEIGHTS["war"] * axes["war"]
        + _WEIGHTS["idle"] * axes["idle"]
        + _WEIGHTS["don_deficit"] * axes["deficit"]
        + _WEIGHTS["don_drop"] * axes["drop"]
    )

    return int(round(raw * _MAX)), activity_ts


def score_breakdown(
    history: List[PlayerSnapshot], clan_history_map: dict | None = None
) -> Tuple[int, datetime, List[Dict[str, Any]]]:
    """Return risk score along with per-axis point breakdown."""
    axes, activity_ts = _axes_data(history, clan_history_map)

    war_pts = int(round(_WEIGHTS["war"] * axes["war"] * _MAX))
    idle_pts = int(round(_WEIGHTS["idle"] * axes["idle"] * _MAX))
    deficit_pts = int(round(_WEIGHTS["don_deficit"] * axes["deficit"] * _MAX))
    drop_pts = int(round(_WEIGHTS["don_drop"] * axes["drop"] * _MAX))

    breakdown: List[Dict[str, Any]] = []
    if war_pts:
        if axes["war_used"] is None:
            reason = "not in war roster"
        elif axes["war_used"] == 0:
            reason = "no war attacks used"
        else:
            missed = (axes["war_cap"] or 0) - axes["war_used"]
            reason = f"missed {missed} war attack{'s' if missed != 1 else ''}"
        breakdown.append({"points": war_pts, "reason": reason})
    if idle_pts:
        reason = f"inactive for {axes['idle_days']} day{'s' if axes['idle_days'] != 1 else ''}"
        breakdown.append({"points": idle_pts, "reason": reason})
    if deficit_pts:
        breakdown.append({"points": deficit_pts, "reason": "donation deficit"})
    if drop_pts:
        breakdown.append({"points": drop_pts, "reason": "donations dropped"})

    total = war_pts + idle_pts + deficit_pts + drop_pts
    return total, activity_ts, breakdown


async def clan_at_risk(clan_tag: str) -> list[dict]:
    """Return sorted risk breakdown for every member in *clan_tag*.

    The latest clan snapshot is fetched first so member data stays fresh.
    """

    await refresh_clan(clan_tag.upper())

    # Get the latest snapshot for each member, then compute history & score
    subq = (
        select(
            PlayerSnapshot.player_tag,
            db.func.max(PlayerSnapshot.ts).label("max_ts"),
        )
        .where(PlayerSnapshot.clan_tag == clan_tag)
        .group_by(PlayerSnapshot.player_tag)
        .subquery()
    )
    latest_rows = select(PlayerSnapshot).join(
        subq,
        (PlayerSnapshot.player_tag == subq.c.player_tag)
        & (PlayerSnapshot.ts == subq.c.max_ts),
    )
    players = db.session.execute(latest_rows).scalars().all()

    results = []
    for p in players:
        hist = await get_history(p.player_tag, 30)
        score_val, last_seen_ts, breakdown = score_breakdown(hist)
        iso_val = last_seen_ts.isoformat()
        logger.debug("last_seen raw for %s: %s", p.player_tag, iso_val)
        results.append(
            {
                "player_tag": p.player_tag,
                "name": p.name,
                "risk_score": score_val,
                "last_seen": iso_val,
                "risk_breakdown": breakdown,
            }
        )

    return sorted(results, key=lambda r: r["risk_score"], reverse=True)
