from app.services.coc_client import get_client
from app.utils import normalize_tag


async def current_war(clan_tag: str) -> dict:
    return await get_client().current_war(normalize_tag(clan_tag))
