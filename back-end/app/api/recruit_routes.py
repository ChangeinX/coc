from __future__ import annotations

from datetime import datetime
from flask import Blueprint, jsonify, request, g, abort

from ..services import recruit_service

bp = Blueprint("recruit", __name__)


@bp.get("/recruit")
def list_recruit():
    cursor = request.args.get("pageCursor", type=int)
    filters = {
        "league": request.args.get("league"),
        "language": request.args.get("language"),
        "war": request.args.get("war"),
        "q": request.args.get("q"),
    }
    sort = request.args.get("sort", "slots")
    posts, next_cursor = recruit_service.list_posts(cursor, filters, sort)
    now = datetime.utcnow()
    items: list[dict] = []
    for p in posts:
        delta = now - p.created_at
        age_value = int(delta.total_seconds())
        if age_value < 3600:
            age = f"{age_value // 60}m"
        else:
            age = f"{age_value // 3600}h"
        items.append(
            {
                "id": p.id,
                "badge": p.badge,
                "name": p.name,
                "tags": p.tags or [],
                "openSlots": p.open_slots,
                "totalSlots": p.total_slots,
                "age": age,
                "ageValue": age_value,
                "league": p.league,
                "language": p.language,
                "war": p.war,
                "description": p.description,
            }
        )
    return jsonify({
        "items": items,
        "nextCursor": str(next_cursor) if next_cursor is not None else None,
    })


@bp.post("/join/<int:post_id>")
def join(post_id: int):
    try:
        recruit_service.record_join(g.user.id, post_id)
    except ValueError:
        abort(404)
    return ("", 204)
