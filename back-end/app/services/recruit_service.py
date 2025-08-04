from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func

from coclib.extensions import db
from coclib.models import Clan, RecruitJoin, RecruitPost

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
