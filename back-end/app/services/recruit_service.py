from __future__ import annotations

from datetime import datetime
from typing import List, Tuple, Optional

from sqlalchemy import or_, cast, String

from coclib.extensions import db
from coclib.models import RecruitPost, RecruitJoin

PAGE_SIZE = 100


def list_posts(
    cursor: Optional[int],
    filters: dict,
    sort: str,
) -> Tuple[List[RecruitPost], Optional[int]]:
    query = RecruitPost.query
    if league := filters.get("league"):
        query = query.filter_by(league=league)
    if language := filters.get("language"):
        query = query.filter_by(language=language)
    if war := filters.get("war"):
        query = query.filter_by(war=war)
    if q := filters.get("q"):
        pattern = f"%{q}%"
        query = query.filter(
            or_(
                RecruitPost.name.ilike(pattern),
                RecruitPost.description.ilike(pattern),
                cast(RecruitPost.tags, String).ilike(pattern),
            )
        )
    if sort == "new":
        query = query.order_by(RecruitPost.created_at.desc())
    else:
        query = query.order_by(RecruitPost.open_slots.desc())
    offset = int(cursor or 0)
    rows = query.offset(offset).limit(PAGE_SIZE + 1).all()
    next_cursor = offset + PAGE_SIZE if len(rows) > PAGE_SIZE else None
    return rows[:PAGE_SIZE], next_cursor


def record_join(user_id: int, post_id: int) -> None:
    post = RecruitPost.query.get(post_id)
    if post is None:
        raise ValueError("post not found")
    jr = RecruitJoin(post_id=post_id, user_id=user_id, created_at=datetime.utcnow())
    db.session.add(jr)
    db.session.commit()
