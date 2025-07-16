from coclib.utils import safe_to_thread
from datetime import datetime, timedelta
import logging
import os
import httpx
from typing import TYPE_CHECKING

from coclib.extensions import db, cache
from coclib.models import PlayerSnapshot, Player
from .coc_client import get_client
from .player_cache import upsert_player
from coclib.services.loyalty_service import ensure_membership
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)
SYNC_BASE = os.getenv("SYNC_BASE")
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))


async def _trigger_sync(tag: str) -> None:
    if not SYNC_BASE:
        return
    url = f"{SYNC_BASE.rstrip('/')}/player/{tag}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url)
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("Sync request to %s failed: %s", url, exc)


async def _fetch_player(tag: str) -> dict:
    return await get_client().player(tag)


def _resolve_last_seen(
    *,
    data: dict,
    prev_snapshot: PlayerSnapshot | None,
    attacks_used: int | None,
    now: datetime,
) -> datetime:
    """Compute the player's last seen timestamp."""

    if prev_snapshot is None:
        changed = True
        prev_seen = None
    else:
        prev_seen = prev_snapshot.last_seen
        changed = (
            data.get("trophies") != prev_snapshot.trophies
            or data.get("donations", 0) != prev_snapshot.donations
            or data.get("donationsReceived", 0) != prev_snapshot.donations_received
            or attacks_used != prev_snapshot.war_attacks_used
        )

    last_seen = prev_seen

    if changed:
        if last_seen is None or now > last_seen:
            last_seen = now

    if last_seen is None:
        last_seen = now

    return last_seen


async def get_player(tag: str, war_attacks_used: int | None = None) -> dict:
    tag = tag.upper()
    cache_key = f"player:{tag}"
    if cached := cache.get(cache_key):
        return cached

    data = await _fetch_player(tag)
    upsert_player(data)

    now = datetime.utcnow()
    norm_tag = normalize_tag(tag)
    prev_snapshot = (
        PlayerSnapshot.query.filter_by(player_tag=norm_tag)
        .order_by(PlayerSnapshot.ts.desc())
        .first()
    )


    attacks_used_val = (
        war_attacks_used if war_attacks_used is not None else data.get("warAttacksUsed")
    )

    last_seen = _resolve_last_seen(
        data=data,
        prev_snapshot=prev_snapshot,
        attacks_used=attacks_used_val,
        now=now,
    )

    last = prev_snapshot
    if (
        last is None
        or last.data != data
        or last.last_seen != last_seen
        or last.war_attacks_used != attacks_used_val
    ):
        ps = PlayerSnapshot(
            ts=now,
            player_tag=norm_tag,
            name=data["name"],
            clan_tag=normalize_tag(data.get("clan", {}).get("tag", "")),
            role=data.get("role"),
            town_hall=data["townHallLevel"],
            trophies=data["trophies"],
            donations=data.get("donations", 0),
            donations_received=data.get("donationsReceived", 0),
            war_attacks_used=attacks_used_val,
            last_seen=last_seen,
            data=data,
        )
        db.session.add(ps)
        db.session.commit()
    ensure_membership(norm_tag, data.get("clan", {}).get("tag"), now)

    data["last_seen"] = last_seen.isoformat().replace(" ", "T") + "Z"

    cache.set(cache_key, data, timeout=300)
    return data


if TYPE_CHECKING:  # pragma: no cover - used for IDE type hints only
    from typing import Optional, TypedDict

    class PlayerDict(TypedDict):
        tag: str
        name: str
        role: str | None
        townHallLevel: int
        trophies: int
        donations: int
        donationsReceived: int
        warAttacksUsed: int | None
        last_seen: str
        clanTag: str | None
        leagueIcon: str | None
        ts: str


async def get_player_snapshot(tag: str) -> "Optional[PlayerDict]":
    norm_tag = normalize_tag(tag)
    cache_key = f"snapshot:player:{norm_tag}"
    if (cached := cache.get(cache_key)) is not None:
        cached_ts = datetime.fromisoformat(cached["ts"]).replace(tzinfo=None)
        if datetime.utcnow() - cached_ts <= STALE_AFTER:
            return cached

    def _latest() -> PlayerSnapshot | None:
        return (
            PlayerSnapshot.query.filter_by(player_tag=norm_tag)
            .order_by(PlayerSnapshot.ts.desc())
            .first()
        )

    def _latest_with_war() -> PlayerSnapshot | None:
        return (
            PlayerSnapshot.query
            .filter(
                PlayerSnapshot.player_tag == norm_tag,
                PlayerSnapshot.war_attacks_used.isnot(None),
            )
            .order_by(PlayerSnapshot.ts.desc())
            .first()
        )

    row = await safe_to_thread(_latest)
    needs_refresh = row is None or (datetime.utcnow() - row.ts > STALE_AFTER)
    if needs_refresh:
        await _trigger_sync(norm_tag)
        row = await safe_to_thread(_latest)
        if row is None:
            return None

    war_used = row.war_attacks_used
    if war_used is None:
        older = await safe_to_thread(_latest_with_war)
        if older is not None and (row.ts - older.ts) <= timedelta(days=7):
            war_used = older.war_attacks_used

    data: PlayerDict = {
        "tag": row.player_tag,
        "name": row.name,
        "role": row.role,
        "townHallLevel": row.town_hall,
        "trophies": row.trophies,
        "donations": row.donations,
        "donationsReceived": row.donations_received,
        "warAttacksUsed": war_used,
        "last_seen": (row.last_seen or row.ts).isoformat().replace(" ", "T") + "Z",
        "clanTag": row.clan_tag or None,
        "ts": row.ts.isoformat().replace(" ", "T") + "Z",
        "leagueIcon": None,
    }

    player_row = Player.query.filter_by(tag=norm_tag).first()
    if player_row and player_row.data:
        data["leagueIcon"] = (
            player_row.data.get("league", {}).get("iconUrls", {}).get("tiny")
        )

    cache.set(cache_key, data, timeout=300)
    return data


__all__ = [*globals().get("__all__", []), "get_player_snapshot"]
