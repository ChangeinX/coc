import logging
from datetime import datetime
from typing import Dict, Any, Tuple

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import scheduler, db
from app.models import ClanSnapshot, LoyaltyMembership, PlayerSnapshot
from app.services import clan_service, player_service, war_service
from app.services.loyalty_service import ensure_membership
from app.utils import normalize_tag

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
            # 1️⃣ Minimal clan snapshot (has its own commit)
            await clan_service.get_clan(tag)

            # 2️⃣ Live roster straight from the API (no cache)
            members = (await clan_service.fetch_clan(tag))["memberList"]
            current_tags = {normalize_tag(m["tag"]) for m in members}

            now = datetime.utcnow()

            # Close memberships for players who have left
            open_memberships = (
                LoyaltyMembership.query.filter_by(clan_tag=tag, left_at=None).all()
            )
            for rec in open_memberships:
                if rec.player_tag not in current_tags:
                    # Create a “clan-less” snapshot so history stays continuous
                    prev = (
                        PlayerSnapshot.query.filter_by(player_tag=rec.player_tag)
                        .order_by(PlayerSnapshot.ts.desc())
                        .first()
                    )
                    db.session.add(
                        PlayerSnapshot(
                            ts=now,
                            player_tag=rec.player_tag,
                            clan_tag="",          # ← left the clan
                            name=prev.name if prev else None,
                            role=prev.role if prev else None,
                            town_hall=prev.town_hall if prev else None,
                            trophies=prev.trophies if prev else None,
                            donations=prev.donations if prev else None,
                            donations_received=prev.donations_received if prev else None,
                            war_attacks_used=prev.war_attacks_used if prev else None,
                            last_seen=now,
                        )
                    )
                    # This *also* sets rec.left_at and commits once
                    ensure_membership(rec.player_tag, None, now)   # NEW ✔

            # Refresh / upsert every *current* member (commits internally)
            for m in members:
                try:
                    await player_service.get_player(m["tag"])
                except Exception as exc:
                    logger.warning("get_player(%s) failed: %s", m["tag"], exc)

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
