from __future__ import annotations

from datetime import datetime
from flask import Blueprint, jsonify, request, g, abort

from . import API_PREFIX
from ..services import recruit_service

bp = Blueprint("recruit", __name__, url_prefix=f"{API_PREFIX}/recruiting")


@bp.get("/recruit")
def list_recruit():
    cursor = request.args.get("pageCursor", type=int)
    filters = {"q": request.args.get("q")}
    posts, next_cursor = recruit_service.list_posts(cursor, filters)
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
                "clanTag": p.clan_tag,
                "callToAction": p.call_to_action,
                "age": age,
                "ageValue": age_value,
            }
        )
    return jsonify({
        "items": items,
        "nextCursor": str(next_cursor) if next_cursor is not None else None,
    })


@bp.post("/recruit")
def create_recruit():
    data = request.get_json() or {}
    try:
        recruit_service.create_post(
            clan_tag=data.get("clanTag"),
            call_to_action=data.get("callToAction"),
        )
    except KeyError:
        abort(400)
    return ("", 201)


@bp.post("/join/<int:post_id>")
def join(post_id: int):
    try:
        recruit_service.record_join(g.user.id, post_id)
    except ValueError:
        abort(404)
    return ("", 204)
