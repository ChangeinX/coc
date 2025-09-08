from coclib.utils import safe_to_thread
from datetime import datetime, timedelta
import logging
import os
from typing import TYPE_CHECKING

from coclib.extensions import cache
from coclib.extensions import db
from coclib.models import WarSnapshot
from coclib.api import get_client
from coclib.utils import normalize_tag


logger = logging.getLogger(__name__)
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))

async def refresh_war_from_api(clan_tag: str) -> dict:
    """Refresh war data from CoC API and update database.
    
    This function is used by background refresh workers to update stale data.
    It performs the full API fetch and database update.
    """
    client = await get_client()
    clan_tag = normalize_tag(clan_tag)
    data = (await client.get_current_war(clan_tag))._raw_data

    last = (
        WarSnapshot.query.filter_by(clan_tag=clan_tag)
        .order_by(WarSnapshot.ts.desc())
        .first()
    )
    if not last or last.data != data:
        ws = WarSnapshot(ts=datetime.utcnow(), clan_tag=clan_tag, data=data)
        db.session.add(ws)
        db.session.commit()

    return data


if TYPE_CHECKING:
    from typing import Optional, Dict  # noqa: F401

CACHE_TTL = 60  # seconds


def _last_war_sync(clan_tag: str) -> "WarSnapshot | None":
    from coclib.models import WarSnapshot  # local import avoids circular refs
    return (
        WarSnapshot.query.filter_by(clan_tag=clan_tag)
        .order_by(WarSnapshot.ts.desc())
        .first()
    )


async def current_war_snapshot(clan_tag: str) -> "dict | None":
    """Return war data from database only, never make API calls.
    
    Returns cached data if available, otherwise returns data from database.
    Returns None if no war data exists for the clan.
    """
    clan_tag = normalize_tag(clan_tag)
    cache_key = f"snapshot:war:{clan_tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached
    
    row = await safe_to_thread(_last_war_sync, clan_tag)
    if row is None:
        # No war data exists for this clan
        return None
    
    data = row.data
    
    # Add staleness metadata for mobile apps
    if row:
        data["last_updated"] = row.ts.isoformat() + "Z"
        data["is_stale"] = (datetime.utcnow() - row.ts) > STALE_AFTER
    
    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data


__all__ = [*globals().get("__all__", []), "refresh_war_from_api", "current_war_snapshot"]
