import logging
import os
from asyncio import gather
from datetime import datetime, timedelta


from coclib.extensions import db, cache
from sqlalchemy.dialects.postgresql import insert
from coclib.models import ClanSnapshot, Clan, LoyaltyMembership
from coclib.api import get_client
from .player_cache import upsert_player
from .player_service import get_player
from .loyalty_service import ensure_membership
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))


async def fetch_clan(tag: str) -> dict:
    """Fetch clan data from CoC API - used by background refresh workers only"""
    client = await get_client()
    clan = await client.get_clan(tag)
    data = clan._raw_data
    data["deep_link"] = clan.share_link
    return data


async def refresh_clan_from_api(tag: str) -> dict:
    """Refresh clan data from CoC API and update database.
    
    This function is used by background refresh workers to update stale data.
    It performs the full API fetch, database update, and member processing.
    """
    norm_tag = normalize_tag(tag)
    data = await fetch_clan(tag)

    data_valid = "tag" in data
    if not data_valid and Clan.query.filter_by(tag=norm_tag).first() is None:
        raise RuntimeError("clan-not-found")

    logger.info(f"Data refreshed for clan {tag}: {data.get('name', 'Unknown')}")

    # Update Clan table with latest data
    stmt = insert(Clan).values(
        tag=norm_tag,
        data=data,
        deep_link=data.get("deep_link"),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[Clan.tag],
        set_={
            "data": stmt.excluded.data,
            "deep_link": stmt.excluded.deep_link,
            "updated_at": db.func.now(),
        },
    )
    db.session.execute(stmt)

    # Close memberships for players no longer in the clan
    if data_valid and "memberList" in data:
        current_tags = {normalize_tag(m["tag"]) for m in data["memberList"]}
        active_rows = LoyaltyMembership.query.filter_by(clan_tag=norm_tag, left_at=None).all()
        for row in active_rows:
            if row.player_tag not in current_tags:
                ensure_membership(row.player_tag, None, datetime.utcnow())

    # Create new snapshot
    last = (
        ClanSnapshot.query.filter_by(clan_tag=norm_tag)
        .order_by(ClanSnapshot.ts.desc())
        .first()
    )
    if data_valid and (not last or last.data != data):
        next_id = (db.session.execute(db.select(db.func.max(ClanSnapshot.id))).scalar() or 0) + 1
        snap = ClanSnapshot(
            id=next_id,
            ts=datetime.utcnow(),
            clan_tag=norm_tag,
            name=data["name"],
            member_count=data["members"],
            level=data["clanLevel"],
            war_wins=data.get("warWins", 0),
            war_losses=data.get("warLosses", 0),
            data=data,
        )
        db.session.add(snap)

    # Process members (upsert locally, schedule background refresh)
    member_tasks = []
    for member in data.get("memberList", []):
        upsert_player(member)  # cheap local upsert
        # TODO: Queue member refresh for background processing instead of blocking
        member_tasks.append(get_player(member["tag"]))
    if member_tasks:
        # Run them concurrently; httpx handles connection pooling.
        await gather(*member_tasks)

    db.session.commit()
    return data


async def get_clan(tag: str) -> dict | None:
    """Return clan data from database only, never make API calls.
    
    Returns cached data if available, otherwise returns data from database.
    Returns None if no data exists for the clan.
    """
    key = f"clan:{tag}"
    cached = cache.get(key)
    if cached:
        return cached

    norm_tag = normalize_tag(tag)
    
    # Get latest clan snapshot from database
    clan_snapshot = (
        ClanSnapshot.query.filter_by(clan_tag=norm_tag)
        .order_by(ClanSnapshot.ts.desc())
        .first()
    )
    
    if clan_snapshot is None:
        # No data exists for this clan
        return None
    
    # Build response from database snapshot
    data = clan_snapshot.data or {}
    
    # Ensure basic fields are present
    if not data.get("tag"):
        data.update({
            "tag": clan_snapshot.clan_tag,
            "name": clan_snapshot.name,
            "members": clan_snapshot.member_count,
            "clanLevel": clan_snapshot.level,
            "warWins": clan_snapshot.war_wins,
            "warLosses": clan_snapshot.war_losses,
        })
    
    # Add deep link from Clan table if available
    clan_row = Clan.query.filter_by(tag=norm_tag).first()
    if clan_row and clan_row.deep_link:
        data["deep_link"] = clan_row.deep_link
    
    # Add staleness metadata for mobile apps
    is_stale = False
    if clan_snapshot:
        data["last_updated"] = clan_snapshot.ts.isoformat() + "Z"
        is_stale = (datetime.utcnow() - clan_snapshot.ts) > STALE_AFTER
        data["is_stale"] = is_stale
        
        # Queue refresh if data is stale (optional - can be disabled in production)
        if is_stale:
            try:
                from coclib.queue.refresh_queue import queue_clan_refresh, RefreshPriority
                queue_clan_refresh(norm_tag, RefreshPriority.HIGH)
            except ImportError:
                # Graceful fallback if queue system not available
                pass
    
    # Cache the result
    cache.set(key, data)
    
    return data

__all__ = [*globals().get("__all__", [])]
