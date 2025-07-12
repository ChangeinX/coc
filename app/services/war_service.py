from datetime import datetime
from asyncio import to_thread
from typing import TYPE_CHECKING

from app.extensions import db, cache
from app.models import WarSnapshot
from app.services.coc_client import get_client
from app.utils import normalize_tag


async def current_war(clan_tag: str) -> dict:
    clan_tag = normalize_tag(clan_tag)
    data = await get_client().current_war(clan_tag)

    ws = WarSnapshot(ts=datetime.utcnow(), clan_tag=clan_tag, data=data)
    db.session.add(ws)
    db.session.commit()

    return data



if TYPE_CHECKING:
    from typing import Optional, Dict  # noqa: F401

CACHE_TTL = 60  # seconds

def _last_war_sync(clan_tag: str) -> "dict | None":
    from app.models import WarSnapshot  # local import avoids circular refs
    row = (
        WarSnapshot.query.filter_by(clan_tag=clan_tag)
        .order_by(WarSnapshot.ts.desc())
        .first()
    )
    return None if row is None else row.data

async def current_war_snapshot(clan_tag: str) -> "dict | None":
    clan_tag = normalize_tag(clan_tag)
    cache_key = f"snapshot:war:{clan_tag}"
    if (cached := cache.get(cache_key)) is not None:
        return cached
    data = await to_thread(_last_war_sync, clan_tag)
    if data:
        cache.set(cache_key, data, timeout=CACHE_TTL)
    return data

__all__ = [*globals().get("__all__", []), "current_war_snapshot"]