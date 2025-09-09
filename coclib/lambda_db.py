"""
Direct PostgreSQL database operations for Lambda functions.

This module provides simple database helpers using psycopg2 without SQLAlchemy,
designed specifically for Lambda environments where we want minimal dependencies.
"""

import json
import logging
import os
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, List

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


@contextmanager
def get_db_connection():
    """Get a database connection with automatic cleanup."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    conn = None
    try:
        conn = psycopg2.connect(database_url)
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()


def upsert_clan(tag: str, data: dict, deep_link: Optional[str] = None) -> None:
    """Insert or update clan data."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO clans (tag, data, deep_link, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (tag) DO UPDATE SET
                data = EXCLUDED.data,
                deep_link = EXCLUDED.deep_link,
                updated_at = NOW()
        """, (tag, json.dumps(data), deep_link))
        conn.commit()
        logger.info(f"Upserted clan {tag}")


def insert_clan_snapshot(tag: str, data: dict) -> None:
    """Insert a new clan snapshot if data has changed."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        
        # Check if last snapshot has same data
        cur.execute("""
            SELECT data FROM clan_snapshots 
            WHERE clan_tag = %s 
            ORDER BY ts DESC 
            LIMIT 1
        """, (tag,))
        
        result = cur.fetchone()
        if result and result[0] == data:
            logger.info(f"Clan {tag} data unchanged, skipping snapshot")
            return
        
        # Extract key fields from data for indexing
        name = data.get("name")
        member_count = data.get("members", 0) if isinstance(data.get("members"), int) else len(data.get("memberList", []))
        level = data.get("clanLevel")
        war_wins = data.get("warWins")
        war_losses = data.get("warLosses")
        
        cur.execute("""
            INSERT INTO clan_snapshots (clan_tag, name, member_count, level, war_wins, war_losses, data, ts)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """, (tag, name, member_count, level, war_wins, war_losses, json.dumps(data)))
        
        conn.commit()
        logger.info(f"Created clan snapshot for {tag}")


def upsert_player(tag: str, data: dict, deep_link: Optional[str] = None) -> None:
    """Insert or update player data."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        
        # Extract key fields from data
        name = data.get("name")
        town_hall = data.get("townHallLevel")
        role = data.get("role")
        clan_tag = data.get("clan", {}).get("tag") if data.get("clan") else None
        
        cur.execute("""
            INSERT INTO players (tag, name, town_hall, role, clan_tag, data, deep_link, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (tag) DO UPDATE SET
                name = EXCLUDED.name,
                town_hall = EXCLUDED.town_hall,
                role = EXCLUDED.role,
                clan_tag = EXCLUDED.clan_tag,
                data = EXCLUDED.data,
                deep_link = EXCLUDED.deep_link,
                updated_at = NOW()
        """, (tag, name, town_hall, role, clan_tag, json.dumps(data), deep_link))
        
        conn.commit()
        logger.info(f"Upserted player {tag}")


def insert_player_snapshot(tag: str, data: dict, war_attacks_used: Optional[int] = None) -> None:
    """Insert a new player snapshot."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        
        # Extract key fields from data
        name = data.get("name")
        role = data.get("role")
        town_hall = data.get("townHallLevel")
        trophies = data.get("trophies")
        donations = data.get("donations")
        donations_received = data.get("donationsReceived")
        clan_tag = data.get("clan", {}).get("tag") if data.get("clan") else None
        
        cur.execute("""
            INSERT INTO player_snapshots (
                player_tag, clan_tag, name, role, town_hall, trophies, 
                donations, donations_received, war_attacks_used, data, ts, last_seen
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (tag, clan_tag, name, role, town_hall, trophies, donations, 
              donations_received, war_attacks_used, json.dumps(data)))
        
        conn.commit()
        logger.info(f"Created player snapshot for {tag}")


def insert_war_snapshot(clan_tag: str, data: dict) -> None:
    """Insert a new war snapshot."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO war_snapshots (clan_tag, data, ts)
            VALUES (%s, %s, NOW())
        """, (clan_tag, json.dumps(data)))
        
        conn.commit()
        logger.info(f"Created war snapshot for clan {clan_tag}")


def update_loyalty_membership(player_tag: str, clan_tag: Optional[str], timestamp: datetime) -> None:
    """Update player loyalty membership records."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        
        if clan_tag is None:
            # Player left clan - close existing membership
            cur.execute("""
                UPDATE loyalty_memberships 
                SET left_at = %s 
                WHERE player_tag = %s AND left_at IS NULL
            """, (timestamp, player_tag))
        else:
            # Player joined clan - close old membership and create new one
            cur.execute("""
                UPDATE loyalty_memberships 
                SET left_at = %s 
                WHERE player_tag = %s AND left_at IS NULL
            """, (timestamp, player_tag))
            
            cur.execute("""
                INSERT INTO loyalty_memberships (player_tag, clan_tag, joined_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (player_tag, clan_tag, joined_at) DO NOTHING
            """, (player_tag, clan_tag, timestamp))
        
        conn.commit()
        logger.info(f"Updated loyalty membership for player {player_tag}")


def get_active_clan_members(clan_tag: str) -> List[str]:
    """Get list of active member tags for a clan."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT player_tag FROM loyalty_memberships 
            WHERE clan_tag = %s AND left_at IS NULL
        """, (clan_tag,))
        
        return [row[0] for row in cur.fetchall()]


def clan_exists(tag: str) -> bool:
    """Check if clan exists in database."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM clans WHERE tag = %s LIMIT 1", (tag,))
        return cur.fetchone() is not None