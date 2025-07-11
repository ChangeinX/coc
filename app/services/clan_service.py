import logging
from asyncio import to_thread, gather
from datetime import datetime

from app.extensions import db, cache
from app.models import ClanSnapshot
from app.services.coc_client import get_client
from app.services.player_cache import upsert_player
from app.services.player_service import get_player
from app.utils import normalize_tag

logger = logging.getLogger(__name__)


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


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.snapshot_service import ClanDict  # noqa: F401

async def get_clan_snapshot(tag: str) -> "ClanDict | None":
    from app.services.snapshot_service import get_clan as _get_clan  # lazy import
    return await _get_clan(tag)


__all__ = [*globals().get("__all__", []), "get_clan_snapshot"]
