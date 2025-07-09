from datetime import datetime

from app.services.coc_client import get_client
from app.extensions import db, cache
from app.models import PlayerSnapshot
from app.utils import normalize_tag


async def fetch_player(tag: str) -> dict:
    return await get_client().player(tag)


async def get_player(tag: str) -> dict:
    key = f"player:{tag}"
    cached = cache.get(key)
    if cached:
        return cached

    data = await fetch_player(tag)
    cache.set(key, data)

    ps = PlayerSnapshot(
        ts=datetime.utcnow(),
        player_tag=normalize_tag(tag),
        name=data["name"],
        clan_tag=normalize_tag(data.get("clan", {}).get("tag", "")),
        role=data.get("role"),
        town_hall=data["townHallLevel"],
        trophies=data["trophies"],
        donations=data.get("donations", 0),
        donations_received=data.get("donationsReceived", 0),
    )
    db.session.add(ps)
    db.session.commit()
    return data
