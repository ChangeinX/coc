from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from typing import Optional, TypedDict

from coclib.utils import safe_to_thread
from coclib.services import clan_service  # noqa: F401 - imported for monkeypatch targets
from sqlalchemy import func

from coclib.extensions import cache, db
from coclib.models import ClanSnapshot, LoyaltyMembership, PlayerSnapshot, Clan, Player
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)

CACHE_TTL = 60
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))


class ClanDict(TypedDict):
    tag: str
    name: str
    members: int
    clanLevel: int
    warWins: int
    warLosses: int
    warWinStreak: int | None
    ts: str
    description: str | None
    badgeUrls: dict | None
    deep_link: str | None


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
    labels: list | None
    deep_link: str | None
    ts: str


def _clan_row_to_dict(row: ClanSnapshot) -> ClanDict:  # type: ignore[override]
    return ClanDict(
        tag=row.clan_tag,
        name=row.name,
        members=row.member_count,
        clanLevel=row.level,
        warWins=row.war_wins,
        warLosses=row.war_losses,
        warWinStreak=(row.data or {}).get("warWinStreak"),
        ts=row.ts.isoformat().replace(" ", "T") + "Z",
        description=None,
        badgeUrls=None,
        deep_link=None,
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
        last_seen=(row.last_seen or row.ts).isoformat().replace(" ", "T") + "Z",
        clanTag=row.clan_tag or None,
        leagueIcon=(row.data or {}).get("league", {}).get("iconUrls", {}).get("tiny"),
        labels=(row.data or {}).get("labels", []),
        deep_link=(row.data or {}).get("deep_link"),
        ts=row.ts.isoformat().replace(" ", "T") + "Z",
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
        db.session.query(PlayerSnapshot, Player.data)
        .join(
            max_ts_subq,
            (PlayerSnapshot.player_tag == max_ts_subq.c.player_tag)
            & (PlayerSnapshot.ts == max_ts_subq.c.latest_ts),
        )
        .outerjoin(Player, Player.tag == PlayerSnapshot.player_tag)
        .all()
    )

    return [
        {
            "tag": ps.player_tag,
            "name": ps.name,
            "role": ps.role,
            "townHallLevel": ps.town_hall,
            "trophies": ps.trophies,
            "donations": ps.donations,
            "donationsReceived": ps.donations_received,
            "warAttacksUsed": ps.war_attacks_used,
            "last_seen": (ps.last_seen or ps.ts).isoformat().replace(" ", "T") + "Z",
            "leagueIcon": (pdata or {}).get("league", {}).get("iconUrls", {}).get("tiny"),
            "labels": (pdata or {}).get("labels", []),
            "deep_link": (pdata or {}).get("deep_link") or (ps.data or {}).get("deep_link"),
        }
        for ps, pdata in rows
    ]




async def _attach_members(clan_dict: dict) -> dict:
    """Return a copy of *clan_dict* with memberList included."""
    clan_tag = normalize_tag(clan_dict["tag"])
    members = await safe_to_thread(_latest_members_sync, clan_tag)
    enriched = clan_dict.copy()
    enriched["memberList"] = members
    enriched["members"] = len(members)  # keep count accurate
    return enriched


async def get_clan(tag: str) -> Optional[ClanDict]:
    tag = normalize_tag(tag)
    cache_key = f"snapshot:clan:{tag}"
    if (cached := cache.get(cache_key)) is not None:
        cached_ts = datetime.fromisoformat(cached["ts"]).replace(tzinfo=None)
        if datetime.utcnow() - cached_ts <= STALE_AFTER:
            return cached

    row: ClanSnapshot | None = (
        ClanSnapshot.query
        .filter_by(clan_tag=tag)
        .order_by(ClanSnapshot.ts.desc())
        .first()
    )
    if row is None:
        return None

    base = _clan_row_to_dict(row)
    cdata = Clan.query.filter_by(tag=tag).first()
    if cdata:
        base["description"] = (cdata.data or {}).get("description")
        base["badgeUrls"] = (cdata.data or {}).get("badgeUrls")
        if base.get("warWinStreak") is None:
            base["warWinStreak"] = (cdata.data or {}).get("warWinStreak")
        base["deep_link"] = cdata.deep_link
    data = await _attach_members(base)

    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data



async def get_player(tag: str) -> Optional[PlayerDict]:
    """Return the latest Player snapshot or **None** if we have no data yet."""
    tag = normalize_tag(tag)
    cache_key = f"snapshot:player:{tag}"
    if (cached := cache.get(cache_key)) is not None:
        cached_ts = datetime.fromisoformat(cached["ts"]).replace(tzinfo=None)
        if datetime.utcnow() - cached_ts <= STALE_AFTER:
            return cached  # pragma: no cover

    row: PlayerSnapshot | None = (
        PlayerSnapshot.query  # type: ignore[attr-defined]
        .filter_by(player_tag=tag)
        .order_by(PlayerSnapshot.ts.desc())
        .first()
    )
    if row is None:
        return None

    data = _player_row_to_dict(row)
    if data.get("deep_link") is None:
        prow = Player.query.filter_by(tag=tag).first()
        if prow:
            data["deep_link"] = prow.deep_link
    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data
