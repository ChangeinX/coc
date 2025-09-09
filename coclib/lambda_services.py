"""
Lambda-specific service functions using direct SQL operations.

These functions replicate the functionality of the main service modules
but use direct psycopg2 operations instead of SQLAlchemy for Lambda compatibility.
"""

import logging
from datetime import datetime
from typing import Dict, Any

from .lambda_db import (
    upsert_clan, insert_clan_snapshot, upsert_player, insert_player_snapshot,
    insert_war_snapshot, update_loyalty_membership, get_active_clan_members, clan_exists
)
from .api.coc_client import fetch_clan, fetch_player, fetch_war
from .util.clan_utils import normalize_tag

logger = logging.getLogger(__name__)


async def refresh_clan_from_api(tag: str) -> Dict[str, Any]:
    """Refresh clan data from CoC API and update database using direct SQL."""
    norm_tag = normalize_tag(tag)
    data = await fetch_clan(tag)

    data_valid = "tag" in data
    if not data_valid and not clan_exists(norm_tag):
        raise RuntimeError("clan-not-found")

    logger.info(f"Data refreshed for clan {tag}: {data.get('name', 'Unknown')}")

    # Update Clan table with latest data
    deep_link = data.get("shareLink") if data_valid else None
    upsert_clan(norm_tag, data, deep_link)

    # Close memberships for players no longer in the clan
    if data_valid and "memberList" in data:
        current_tags = {normalize_tag(m["tag"]) for m in data["memberList"]}
        active_members = get_active_clan_members(norm_tag)
        
        for player_tag in active_members:
            if player_tag not in current_tags:
                update_loyalty_membership(player_tag, None, datetime.utcnow())

    # Create new snapshot if data is valid
    if data_valid:
        insert_clan_snapshot(norm_tag, data)

    # Process members (create player snapshots and update memberships)
    if data_valid and "memberList" in data:
        for member in data["memberList"]:
            member_tag = normalize_tag(member["tag"])
            
            # Update membership if needed
            if member_tag not in [m for m in get_active_clan_members(norm_tag)]:
                update_loyalty_membership(member_tag, norm_tag, datetime.utcnow())
            
            # Create player snapshot from member data
            insert_player_snapshot(member_tag, member)

    # Ensure deep_link is in response
    if data_valid and "shareLink" in data:
        data["deep_link"] = data["shareLink"]

    return data


async def refresh_player_from_api(tag: str, war_attacks_used: int = None) -> Dict[str, Any]:
    """Refresh player data from CoC API and update database using direct SQL."""
    norm_tag = normalize_tag(tag)
    data = await fetch_player(tag)

    data_valid = "tag" in data
    
    if data_valid:
        logger.info(f"Data refreshed for player {tag}: {data.get('name', 'Unknown')} (TH{data.get('townHallLevel', '?')})")

        # Update Player table with latest data
        deep_link = data.get("shareLink")
        upsert_player(norm_tag, data, deep_link)

        # Create player snapshot
        insert_player_snapshot(norm_tag, data, war_attacks_used)

        # Update clan membership if needed
        clan_info = data.get("clan")
        if clan_info and clan_info.get("tag"):
            clan_tag = normalize_tag(clan_info["tag"])
            current_members = get_active_clan_members(clan_tag)
            if norm_tag not in current_members:
                update_loyalty_membership(norm_tag, clan_tag, datetime.utcnow())
        else:
            # Player not in any clan - close existing membership
            update_loyalty_membership(norm_tag, None, datetime.utcnow())

        # Ensure deep_link is in response
        if "shareLink" in data:
            data["deep_link"] = data["shareLink"]

    return data


async def refresh_war_from_api(clan_tag: str) -> Dict[str, Any]:
    """Refresh war data from CoC API and update database using direct SQL."""
    norm_tag = normalize_tag(clan_tag)
    data = await fetch_war(clan_tag)

    data_valid = "state" in data and data["state"] != "notInWar"
    
    if data_valid:
        logger.info(f"War data refreshed for clan {clan_tag}: {data.get('state', 'Unknown')} state")

        # Create war snapshot
        insert_war_snapshot(norm_tag, data)
        
        # Process member war data if available
        if "clan" in data and "members" in data["clan"]:
            for member in data["clan"]["members"]:
                member_tag = normalize_tag(member["tag"])
                attacks_used = len(member.get("attacks", []))
                
                # Create player snapshot with war attack info
                # Note: We only have limited player data from war, so we create a minimal snapshot
                player_data = {
                    "tag": member["tag"],
                    "name": member["name"],
                    "townHallLevel": member["townhallLevel"],
                    "mapPosition": member["mapPosition"]
                }
                insert_player_snapshot(member_tag, player_data, attacks_used)

    return data


def ensure_membership(player_tag: str, clan_tag: str = None, timestamp: datetime = None) -> None:
    """Lambda-compatible membership management."""
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    update_loyalty_membership(player_tag, clan_tag, timestamp)