from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func

from coclib.extensions import db
from coclib.models import (
    Clan,
    PlayerRecruitPost,
    RecruitJoin,
    RecruitPost,
    User,
)

PAGE_SIZE = 100


def list_posts(
    cursor: Optional[int],
    filters: Dict[str, Optional[str]],
) -> Tuple[List[Dict[str, object]], Optional[int]]:
    """Return recruitment posts enriched with clan details."""

    query = db.session.query(RecruitPost, Clan).join(Clan, RecruitPost.clan_tag == Clan.tag)

    if q := filters.get("q"):
        pattern = f"%{q}%"
        query = query.filter(RecruitPost.call_to_action.ilike(pattern))
    if league := filters.get("league"):
        query = query.filter(Clan.data["warLeague"]["name"].astext == league)
    if language := filters.get("language"):
        query = query.filter(Clan.data["chatLanguage"]["name"].astext == language)
    if war := filters.get("warFrequency"):
        query = query.filter(Clan.data["warFrequency"].astext == war)

    query = query.order_by(RecruitPost.created_at.desc())
    offset = int(cursor or 0)
    rows = query.offset(offset).limit(PAGE_SIZE + 1).all()
    next_cursor = offset + PAGE_SIZE if len(rows) > PAGE_SIZE else None

    items: List[Dict[str, object]] = []
    for post, clan in rows[:PAGE_SIZE]:
        clan_data = {**(clan.data or {}), "tag": clan.tag}
        if clan.deep_link:
            clan_data["deep_link"] = clan.deep_link
        items.append(
            {
                "id": post.id,
                "call_to_action": post.call_to_action,
                "created_at": post.created_at,
                "clan": clan_data,
            }
        )

    return items, next_cursor


def create_post(*, clan_tag: Optional[str], call_to_action: Optional[str]) -> RecruitPost:
    """Create a recruitment post for an existing clan."""

    if not clan_tag:
        raise KeyError("clan_tag is required")

    clan = Clan.query.get(clan_tag)
    if clan is None:
        raise ValueError("clan not found")

    max_id = db.session.query(func.max(RecruitPost.id)).scalar() or 0
    post = RecruitPost(
        id=max_id + 1,
        clan_tag=clan.tag,
        call_to_action=call_to_action,
        created_at=datetime.utcnow(),
    )
    db.session.add(post)
    db.session.commit()
    return post


def record_join(user_id: int, post_id: int) -> None:
    post = RecruitPost.query.get(post_id)
    if post is None:
        raise ValueError("post not found")
    jr = RecruitJoin(post_id=post_id, user_id=user_id, created_at=datetime.utcnow())
    db.session.add(jr)
    db.session.commit()


def list_player_posts(
    cursor: Optional[int],
    filters: Dict[str, Optional[str]],
) -> Tuple[List[Dict[str, object]], Optional[int]]:
    """Return player recruitment posts with user details."""

    query = db.session.query(PlayerRecruitPost, User).join(
        User, PlayerRecruitPost.user_id == User.id
    )

    if q := filters.get("q"):
        pattern = f"%{q}%"
        query = query.filter(PlayerRecruitPost.description.ilike(pattern))
    if league := filters.get("league"):
        query = query.filter(PlayerRecruitPost.league == league)
    if language := filters.get("language"):
        query = query.filter(PlayerRecruitPost.language == language)
    if war := filters.get("warFrequency"):
        query = query.filter(PlayerRecruitPost.war == war)

    query = query.order_by(PlayerRecruitPost.created_at.desc())
    offset = int(cursor or 0)
    rows = query.offset(offset).limit(PAGE_SIZE + 1).all()
    next_cursor = offset + PAGE_SIZE if len(rows) > PAGE_SIZE else None

    items: List[Dict[str, object]] = []
    for post, user in rows[:PAGE_SIZE]:
        items.append(
            {
                "id": post.id,
                "description": post.description,
                "created_at": post.created_at,
                "name": user.name,
                "tag": user.player_tag,
                "avatar": getattr(user, "avatar", None),
            }
        )

    return items, next_cursor


def create_player_post(
    *,
    user_id: int,
    description: Optional[str],
    league: Optional[str] = None,
    language: Optional[str] = None,
    war: Optional[str] = None,
) -> PlayerRecruitPost:
    """Create a player recruitment post for an existing user."""

    if not description:
        raise KeyError("description is required")

    user = User.query.get(user_id)
    if user is None:
        raise ValueError("user not found")

    max_id = db.session.query(func.max(PlayerRecruitPost.id)).scalar() or 0
    post = PlayerRecruitPost(
        id=max_id + 1,
        user_id=user_id,
        description=description,
        league=league,
        language=language,
        war=war,
        created_at=datetime.utcnow(),
    )
    db.session.add(post)
    db.session.commit()
    return post
