from asyncio import to_thread
from datetime import datetime
import logging
import os
import httpx
from typing import TYPE_CHECKING

from coclib.extensions import db, cache
from coclib.models import PlayerSnapshot
from .coc_client import get_client
from coclib.services.loyalty_service import ensure_membership
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)
SYNC_BASE = os.getenv("SYNC_BASE")


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


async def get_player(tag: str, war_attacks_used: int | None = None) -> dict:
    tag = tag.upper()
    cache_key = f"player:{tag}"
    if cached := cache.get(cache_key):
        return cached

    data = await _fetch_player(tag)

    now = datetime.utcnow()
    norm_tag = normalize_tag(tag)
    prev_snapshot = (
        PlayerSnapshot.query.filter_by(player_tag=norm_tag)
        .order_by(PlayerSnapshot.ts.desc())
        .first()
    )

    last_seen_api = now
    if (ls := data.get("lastSeen")):
        try:
            last_seen_api = datetime.strptime(ls, "%Y%m%dT%H%M%S.%fZ")
        except ValueError:
            logger.warning("Invalid lastSeen %s for %s", ls, tag)

    if prev_snapshot and last_seen_api < (prev_snapshot.last_seen or prev_snapshot.ts):
        last_seen = prev_snapshot.last_seen or prev_snapshot.ts
    else:
        last_seen = last_seen_api

    attacks_used_val = (
        war_attacks_used if war_attacks_used is not None else data.get("warAttacksUsed")
    )

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
    )
    db.session.add(ps)
    db.session.commit()
    ensure_membership(norm_tag, data.get("clan", {}).get("tag"), now)

    data["last_seen"] = last_seen.isoformat()

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
        ts: str


async def get_player_snapshot(tag: str) -> "Optional[PlayerDict]":
    norm_tag = normalize_tag(tag)
    cache_key = f"snapshot:player:{norm_tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached

    def _latest() -> PlayerSnapshot | None:
        return (
            PlayerSnapshot.query.filter_by(player_tag=norm_tag)
            .order_by(PlayerSnapshot.ts.desc())
            .first()
        )

    row = await to_thread(_latest)
    if row is None:
        await _trigger_sync(norm_tag)
        row = await to_thread(_latest)
        if row is None:
            return None

    data: PlayerDict = {
        "tag": row.player_tag,
        "name": row.name,
        "role": row.role,
        "townHallLevel": row.town_hall,
        "trophies": row.trophies,
        "donations": row.donations,
        "donationsReceived": row.donations_received,
        "warAttacksUsed": row.war_attacks_used,
        "last_seen": (row.last_seen or row.ts).isoformat(),
        "clanTag": row.clan_tag or None,
        "ts": row.ts.isoformat(),
    }

    cache.set(cache_key, data, timeout=300)
    return data


__all__ = [*globals().get("__all__", []), "get_player_snapshot"]
