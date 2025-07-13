from __future__ import annotations

from typing import Optional, TypedDict

from asyncio import to_thread
from sqlalchemy import func

import os
import httpx
from coclib.extensions import cache, db
from coclib.models import ClanSnapshot, LoyaltyMembership, PlayerSnapshot
from coclib.utils import normalize_tag

SYNC_BASE_URL = os.getenv("SYNC_BASE_URL", "http://sync:8080")
CACHE_TTL = 60


class ClanDict(TypedDict):
    tag: str
    name: str
    members: int
    clanLevel: int
    warWins: int
    warLosses: int
    ts: str


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


def _clan_row_to_dict(row: ClanSnapshot) -> ClanDict:  # type: ignore[override]
    return ClanDict(
        tag=row.clan_tag,
        name=row.name,
        members=row.member_count,
        clanLevel=row.level,
        warWins=row.war_wins,
        warLosses=row.war_losses,
        ts=row.ts.isoformat(),
    )


def _player_row_to_dict(row: PlayerSnapshot) -> PlayerDict:  # type: ignore[override]
    return PlayerDict(
        tag=row.player_tag,
        name=row.name,
        role=row.role,
        townHallLevel=row.town_hall,
        trophies=row.trophies,
        donations=row.donations,
        donationsReceived=row.donations_received,
        warAttacksUsed=row.war_attacks_used,
        last_seen=(row.last_seen or row.ts).isoformat(),
        clanTag=row.clan_tag or None,
        ts=row.ts.isoformat(),
    )



def _latest_members_sync(clan_tag: str) -> list[dict]:
    """
    Return one latest snapshot per player whose **membership is still open**.
    Guarantees ≤50 rows.
    """
    clan_tag = normalize_tag(clan_tag)

    # 1️⃣  tags that are still in the clan (left_at IS NULL)
    active_tag_subq = (
        db.session.query(LoyaltyMembership.player_tag)
        .filter_by(clan_tag=clan_tag, left_at=None)
        .subquery()
    )

    # 2️⃣  latest snapshot per *active* tag
    max_ts_subq = (
        db.session.query(
            PlayerSnapshot.player_tag,
            func.max(PlayerSnapshot.ts).label("latest_ts"),
        )
        .filter(PlayerSnapshot.player_tag.in_(active_tag_subq))
        .group_by(PlayerSnapshot.player_tag)
        .subquery()
    )

    rows = (
        db.session.query(PlayerSnapshot)
        .join(
            max_ts_subq,
            (PlayerSnapshot.player_tag == max_ts_subq.c.player_tag)
            & (PlayerSnapshot.ts == max_ts_subq.c.latest_ts),
        )
        .all()
    )

    return [
        {
            "tag": r.player_tag,
            "name": r.name,
            "role": r.role,
            "townHallLevel": r.town_hall,
            "trophies": r.trophies,
            "donations": r.donations,
            "donationsReceived": r.donations_received,
            "warAttacksUsed": r.war_attacks_used,
            "last_seen": (r.last_seen or r.ts).isoformat(),
        }
        for r in rows
    ]




async def _attach_members(clan_dict: dict) -> dict:
    """Return a copy of *clan_dict* with memberList included."""
    clan_tag = normalize_tag(clan_dict["tag"])
    members = await to_thread(_latest_members_sync, clan_tag)
    enriched = clan_dict.copy()
    enriched["memberList"] = members
    enriched["members"] = len(members)  # keep count accurate
    return enriched


async def get_clan(tag: str) -> Optional[ClanDict]:
    tag = normalize_tag(tag)
    cache_key = f"snapshot:clan:{tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached

    row: ClanSnapshot | None = (
        ClanSnapshot.query
        .filter_by(clan_tag=tag)
        .order_by(ClanSnapshot.ts.desc())
        .first()
    )
    if row is None:
        async with httpx.AsyncClient(base_url=SYNC_BASE_URL, timeout=10) as client:
            await client.post(f"/internal/clan/{tag}")
        row = (
            ClanSnapshot.query
            .filter_by(clan_tag=tag)
            .order_by(ClanSnapshot.ts.desc())
            .first()
        )
        if row is None:
            return None

    base = _clan_row_to_dict(row)
    data = await _attach_members(base)

    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data



async def get_player(tag: str) -> Optional[PlayerDict]:
    """Return the latest Player snapshot or **None** if we have no data yet."""
    tag = normalize_tag(tag)
    cache_key = f"snapshot:player:{tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached  # pragma: no cover

    row: PlayerSnapshot | None = (
        PlayerSnapshot.query  # type: ignore[attr-defined]
        .filter_by(player_tag=tag)
        .order_by(PlayerSnapshot.ts.desc())
        .first()
    )
    if row is None:
        async with httpx.AsyncClient(base_url=SYNC_BASE_URL, timeout=10) as client:
            await client.post(f"/internal/player/{tag}")
        row = (
            PlayerSnapshot.query  # type: ignore[attr-defined]
            .filter_by(player_tag=tag)
            .order_by(PlayerSnapshot.ts.desc())
            .first()
        )
        if row is None:
            return None

    data = _player_row_to_dict(row)
    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data

