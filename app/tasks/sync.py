import logging
from typing import Dict, Any, Tuple

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import scheduler, db
from app.models import ClanSnapshot, PlayerSnapshot
from app.services import clan_service, player_service, war_service

Trigger = Tuple[str, Dict[str, Any]]
HOURLY = "cron", {"minute": 5}
WAR_CRON = "cron", {"minute": "*/10"}

logger = logging.getLogger(__name__)


def register_jobs():
    @scheduler.task(id="sync_clans", trigger=HOURLY[0], **HOURLY[1])
    async def sync_clans() -> None:
        tags = (
            db.session.execute(select(ClanSnapshot.clan_tag).distinct())
            .scalars()
            .all()
        )
        for tag in tags:
            # Snapshot the clan itself
            await clan_service.get_clan(tag)

            # Snapshot every current member
            members = (await clan_service.fetch_clan(tag))["memberList"]
            for m in members:
                await player_service.get_player(m["tag"])

    @scheduler.task(id="sync_wars", trigger=WAR_CRON[0], **WAR_CRON[1])
    async def sync_wars() -> None:
        tags = (
            db.session.execute(select(ClanSnapshot.clan_tag).distinct())
            .scalars()
            .all()
        )
        for tag in tags:
            try:
                war = await war_service.current_war(tag)
            except Exception as exc:  # keep scheduler alive
                logger.error("Failed to sync war for clan %s: %s", tag, exc)
                continue

            if war.get("state") in ("notInWar", None):
                continue  # clan not currently in war

            for member in war["clan"]["members"]:
                p_tag = member["tag"]
                attacks_used = len(member.get("attacks", []))

                # Snapshot player (this also updates LoyaltyMembership)
                await player_service.get_player(p_tag, war_attacks_used=attacks_used)

                # Patch the latest snapshot with the attack count if it changed
                try:
                    latest = (
                        PlayerSnapshot.query.filter_by(player_tag=p_tag)
                        .order_by(PlayerSnapshot.ts.desc())
                        .first()
                    )
                    if latest and latest.war_attacks_used != attacks_used:
                        latest.war_attacks_used = attacks_used
                        db.session.commit()
                except SQLAlchemyError:
                    db.session.rollback()
