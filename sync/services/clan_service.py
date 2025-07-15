import logging
import os
from asyncio import gather
from datetime import datetime, timedelta


from coclib.extensions import db, cache
from sqlalchemy.dialects.postgresql import insert
from coclib.models import ClanSnapshot, Clan
from .coc_client import get_client
from .player_cache import upsert_player
from .player_service import get_player
from coclib.utils import normalize_tag

logger = logging.getLogger(__name__)
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))


async def fetch_clan(tag: str) -> dict:
    client = get_client()
    return await client.clan(tag)


async def get_clan(tag: str) -> dict:
    key = f"clan:{tag}"
    cached = cache.get(key)
    if cached:
        return cached

    data = await fetch_clan(tag)

    logger.info(f"Data fetched for clan {tag}: {data.get('name', 'Unknown')}")

    cache.set(key, data)

    stmt = insert(Clan).values(tag=normalize_tag(tag), data=data)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Clan.tag],
        set_={"data": stmt.excluded.data, "updated_at": db.func.now()},
    )
    db.session.execute(stmt)

    # Persist minimal snapshot (async context outside of event loop)
    snap = ClanSnapshot(
        ts=datetime.utcnow(),
        clan_tag=normalize_tag(tag),
        name=data["name"],
        member_count=data["members"],
        level=data["clanLevel"],
        war_wins=data.get("warWins", 0),
        war_losses=data.get("warLosses", 0),
    )
    db.session.add(snap)

    member_tasks = []
    for member in data.get("memberList", []):
        upsert_player(member)  # cheap local upsert
        # Schedule a full get_player() to also write a snapshot
        member_tasks.append(get_player(member["tag"]))
    if member_tasks:
        # Run them concurrently; httpx handles connection pooling.
        await gather(*member_tasks)

    db.session.commit()
    return data

__all__ = [*globals().get("__all__", [])]
