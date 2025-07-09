from sqlalchemy import select, desc
from datetime import timedelta, datetime

from app.extensions import db
from app.models import PlayerSnapshot


_WEIGHTS = {
    "war": 0.40,       # 40 pts when clan is actively warring
    "idle": 0.35,      # ↑ from 0.25 → emphasise recency of idleness
    "don_deficit": 0.15,
    "don_drop": 0.10,
}
_MAX = 100
_WAR_ATTACKS_TOTAL = 4
_IDLE_DAYS_CEIL = 4  # cap for bucket lookup – kept for compatibility
_DEFICIT_CEIL = 0.50
_DROP_CEIL = 0.30
_CLAN_WAR_WINDOW = 42

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


def _clan_has_war(history_map: dict[str, list]) -> bool:
    """Return *True* if ANY member has war attacks in the recent window."""
    cutoff = history_map["now"] - timedelta(days=_CLAN_WAR_WINDOW)
    for snapshots in history_map["all"]:
        if any(
            s.ts >= cutoff and s.war_attacks_used is not None for s in snapshots
        ):
            return True
    return False


async def get_history(player_tag: str, days: int = 30):
    """Return **oldest→newest** snapshots for *player_tag* limited to *days*."""
    cutoff = db.func.now() - timedelta(days=days)
    stmt = (
        select(PlayerSnapshot)
        .where(PlayerSnapshot.player_tag == player_tag, PlayerSnapshot.ts >= cutoff)
        .order_by(desc(PlayerSnapshot.ts))
    )
    res = db.session.execute(stmt).scalars().all()
    return list(reversed(res))

def score(history: list["PlayerSnapshot"], clan_history_map: dict | None = None) -> tuple[int, datetime]:
    if len(history) < 2:
        return 0, history[-1].ts

    latest = history[-1]
    prev = history[-8] if len(history) >= 8 else history[0]

    if latest.war_attacks_used is None:
        war_miss_pct = 0.0
    else:
        war_miss_pct = _clamp01(
            (_WAR_ATTACKS_TOTAL - latest.war_attacks_used) / _WAR_ATTACKS_TOTAL
        )

    # Disable war axis if the whole clan has been dormant.
    clan_active = True
    if clan_history_map is not None:
        clan_active = _clan_has_war(clan_history_map)

    last_change = next(
        (s for s in reversed(history)
         if s.trophies != latest.trophies or s.donations != latest.donations),
        history[0],
    )
    activity_ts = latest.last_seen or last_change.ts
    idle_days = (latest.ts - activity_ts).days
    idle_pct = _idle_pct_from_days(idle_days)

    ratio = latest.donations / max(latest.donations_received, 1)
    deficit_pct = _clamp01((_DEFICIT_CEIL - ratio) / _DEFICIT_CEIL)

    drop_ratio = (prev.donations - latest.donations) / max(prev.donations, 1)
    drop_pct = _clamp01(drop_ratio / _DROP_CEIL)

    raw = (
        (_WEIGHTS["war"] if clan_active else 0) * war_miss_pct
        + _WEIGHTS["idle"] * idle_pct
        + _WEIGHTS["don_deficit"] * deficit_pct
        + _WEIGHTS["don_drop"] * drop_pct
    )

    return int(round(raw * _MAX)), activity_ts


async def clan_at_risk(clan_tag: str) -> list[dict]:
    """Return sorted risk breakdown for every member in *clan_tag*."""
    # latest snapshot for each member → compute history & score
    subq = (
        select(
            PlayerSnapshot.player_tag, db.func.max(PlayerSnapshot.ts).label("max_ts")
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
        score_val, last_seen_ts = score(hist)
        results.append({
            "player_tag": p.player_tag,
            "name": p.name,
            "risk_score": score_val,
            "last_seen": last_seen_ts.date().isoformat(),
        })

    return sorted(results, key=lambda r: r["risk_score"], reverse=True)
