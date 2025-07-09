from app.extensions import scheduler
from app.services import clan_service, player_service, war_service
from app.extensions import db
from app.models import ClanSnapshot
from sqlalchemy import select

HOURLY = "cron", {"minute": 5}
WAR_CRON = "cron", {"minute": "*/10"}


def register_jobs():
    @scheduler.task(id="sync_clans", trigger=HOURLY[0], **HOURLY[1])
    async def sync_clans():
        # Fetch distinct clan tags we have seen
        tags = (
            db.session.execute(select(ClanSnapshot.clan_tag).distinct()).scalars().all()
        )
        for tag in tags:
            await clan_service.get_clan(tag)  # refresh + snapshot
            members = (await clan_service.fetch_clan(tag))["memberList"]
            for m in members:
                await player_service.get_player(m["tag"])

    @scheduler.task(id="sync_wars", trigger=WAR_CRON[0], **WAR_CRON[1])
    async def sync_wars():
        tags = (
            db.session.execute(select(ClanSnapshot.clan_tag).distinct()).scalars().all()
        )
        for tag in tags:
            await war_service.current_war(tag)
