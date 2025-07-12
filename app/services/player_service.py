from asyncio import to_thread
from datetime import datetime
from typing import TYPE_CHECKING

from app.extensions import db, cache
from app.models import PlayerSnapshot
from app.services.coc_client import get_client
from app.services.loyalty_service import ensure_membership
from app.utils import normalize_tag


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


if TYPE_CHECKING:
    from app.services.snapshot_service import PlayerDict  # noqa: F401


async def get_player_snapshot(tag: str) -> "PlayerDict | None":
    from app.services.snapshot_service import get_player as _get_player
    return await to_thread(_get_player, tag)


__all__ = [*globals().get("__all__", []), "get_player_snapshot"]
