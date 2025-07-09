from app.services.coc_client import get_client


async def current_war(clan_tag: str) -> dict:
    return await get_client().current_war(clan_tag)
