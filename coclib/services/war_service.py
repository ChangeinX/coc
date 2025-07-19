from coclib.utils import safe_to_thread
from datetime import datetime, timedelta
import logging
import os
from typing import TYPE_CHECKING

from coclib.extensions import cache
from coclib.extensions import db
from coclib.models import WarSnapshot
from .coc_client import get_client
from coclib.utils import normalize_tag


logger = logging.getLogger(__name__)
STALE_AFTER = timedelta(seconds=int(os.getenv("SNAPSHOT_MAX_AGE", "600")))

async def current_war(clan_tag: str) -> dict:
    clan_tag = normalize_tag(clan_tag)
    data = await get_client().current_war(clan_tag)

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
    clan_tag = normalize_tag(clan_tag)
    cache_key = f"snapshot:war:{clan_tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached
    row = await safe_to_thread(_last_war_sync, clan_tag)
    needs_refresh = row is None or (datetime.utcnow() - row.ts > STALE_AFTER)
    if needs_refresh:
        await current_war(clan_tag)
        row = await safe_to_thread(_last_war_sync, clan_tag)
        if row is None:
            return None
    data = row.data
    cache.set(cache_key, data, timeout=CACHE_TTL)
    return data


__all__ = [*globals().get("__all__", []), "current_war", "current_war_snapshot"]
