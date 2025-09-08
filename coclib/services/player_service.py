from coclib.utils import safe_to_thread
from datetime import datetime, timedelta
import logging
import os
from typing import TYPE_CHECKING

from coclib.extensions import db, cache
from coclib.models import PlayerSnapshot, Player
from coclib.api import get_client
from .player_cache import upsert_player
from coclib.services.loyalty_service import ensure_membership
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))


async def _fetch_player(tag: str) -> dict:
    client = await get_client()
    player = await client.get_player(tag)
    data = player._raw_data
    data["deep_link"] = player.share_link
    return data


async def verify_token(tag: str, token: str) -> bool:
    """Verify a player's API token via the Clash of Clans API."""
    client = await get_client()
    return await client.verify_player_token(player_tag=tag, token=token)


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
            data.get("trophies", 0) > prev_snapshot.trophies
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


async def get_player(tag: str, war_attacks_used: int | None = None) -> dict | None:
    """Return player data from database only, never make API calls.
    
    Returns cached data if available, otherwise returns None if no data exists.
    This replaces the old API-calling get_player function.
    """
    tag = tag.upper()
    cache_key = f"player:{tag}"
    if cached := cache.get(cache_key):
        return cached

    # Try to get data from database via get_player_snapshot
    snapshot_data = await get_player_snapshot(tag)
    if snapshot_data is None:
        return None
    
    # Convert snapshot format to the format expected by get_player
    # This maintains compatibility with existing code
    data = {
        "tag": snapshot_data["tag"],
        "name": snapshot_data["name"],
        "townHallLevel": snapshot_data["townHallLevel"],
        "trophies": snapshot_data["trophies"],
        "donations": snapshot_data["donations"],
        "donationsReceived": snapshot_data["donationsReceived"],
        "role": snapshot_data.get("role"),
        "warAttacksUsed": snapshot_data.get("warAttacksUsed"),
        "last_seen": snapshot_data["last_seen"],
    }
    
    # Add clan info if available
    if snapshot_data.get("clanTag"):
        data["clan"] = {"tag": snapshot_data["clanTag"]}
    
    cache.set(cache_key, data, timeout=300)
    return data


async def refresh_player_from_api(tag: str, war_attacks_used: int | None = None) -> dict:
    """Refresh player data from CoC API and update database.
    
    This function is used by background refresh workers to update stale data.
    It performs the full API fetch, database update, and membership processing.
    """
    tag = tag.upper()
    cache_key = f"player:{tag}"
    if cached := cache.get(cache_key):
        return cached

    data = await _fetch_player(tag)
    if "tag" not in data:
        raise RuntimeError("player-not-found")
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
        deep_link: str | None
        ts: str


async def get_player_snapshot(tag: str) -> "Optional[PlayerDict]":
    """Return player data from database only, never make API calls.
    
    Returns cached data if available, otherwise returns data from database.
    Returns None if no data exists for the player.
    """
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
    if row is None:
        # No data exists for this player
        return None

    # Get war attacks used - check for recent war data if current snapshot has None
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
        "deep_link": None,
    }

    player_row = Player.query.filter_by(tag=norm_tag).first()
    if player_row:
        if player_row.data:
            data["leagueIcon"] = (
                player_row.data.get("league", {}).get("iconUrls", {}).get("tiny")
            )
            # Include player labels for badge icons (refs #117)
            data["labels"] = player_row.data.get("labels", [])
        data["deep_link"] = player_row.deep_link
    
    # Add staleness metadata for mobile apps
    if row:
        data["last_updated"] = row.ts.isoformat() + "Z"  
        data["is_stale"] = (datetime.utcnow() - row.ts) > STALE_AFTER

    cache.set(cache_key, data, timeout=300)
    return data


__all__ = [*globals().get("__all__", []), "get_player_snapshot", "verify_token"]
