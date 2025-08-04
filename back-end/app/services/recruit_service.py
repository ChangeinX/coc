from __future__ import annotations

from datetime import datetime
from typing import List, Tuple, Optional

from sqlalchemy import func

from coclib.extensions import db
from coclib.models import RecruitPost, RecruitJoin

PAGE_SIZE = 100


def list_posts(
    cursor: Optional[int],
    filters: dict,
) -> Tuple[List[RecruitPost], Optional[int]]:
    query = RecruitPost.query
    if q := filters.get("q"):
        pattern = f"%{q}%"
        query = query.filter(RecruitPost.call_to_action.ilike(pattern))
    query = query.order_by(RecruitPost.created_at.desc())
    offset = int(cursor or 0)
    rows = query.offset(offset).limit(PAGE_SIZE + 1).all()
    next_cursor = offset + PAGE_SIZE if len(rows) > PAGE_SIZE else None
    return rows[:PAGE_SIZE], next_cursor


def create_post(
    *,
    clan_tag: Optional[str],
    call_to_action: Optional[str],
) -> RecruitPost:
    max_id = db.session.query(func.max(RecruitPost.id)).scalar() or 0
    post = RecruitPost(
        id=max_id + 1,
        clan_tag=clan_tag,
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
