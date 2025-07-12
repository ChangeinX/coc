from asyncio import to_thread
from datetime import datetime
from typing import TYPE_CHECKING

from coclib.extensions import db, cache
from coclib.models import PlayerSnapshot
from sync.services.coc_client import get_client
from coclib.services.loyalty_service import ensure_membership
from coclib.utils import normalize_tag


def _activity(prev: PlayerSnapshot, now: dict) -> bool:
    return (
            now["trophies"] > prev.trophies
            or now.get("donations", 0) > prev.donations
            or now.get("donationsReceived", 0) > prev.donations_received
            or (now.get("warAttacksUsed") or 0) > (prev.war_attacks_used or 0)
    )


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

    if not prev_snapshot:
        last_seen = now
    else:
        active = _activity(prev_snapshot, data)
        last_seen = now if active else (prev_snapshot.last_seen or prev_snapshot.ts)

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
        lastSeen: str
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
        "lastSeen": (row.last_seen or row.ts).isoformat(),
        "clanTag": row.clan_tag or None,
        "ts": row.ts.isoformat(),
    }

    cache.set(cache_key, data, timeout=300)
    return data


__all__ = [*globals().get("__all__", []), "get_player_snapshot"]
