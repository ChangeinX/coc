from flask import Blueprint, jsonify, request, g, abort

from messages.services.publisher import (
    publish_message,
    verify_group_member,
    fetch_recent_messages,
)

API_PREFIX = "/api/v1"

bp = Blueprint("messages", __name__, url_prefix=f"{API_PREFIX}/chat")


@bp.post("/publish")
def publish():
    data = request.get_json(silent=True) or {}
    group_id = data.get("groupId")
    content = (data.get("text") or "").strip()
    if not group_id or not content:
        abort(400)
    if not verify_group_member(g.user.id, str(group_id)):
        abort(403)
    msg = publish_message(str(group_id), content, g.user.id)
    return jsonify({"status": "ok", "ts": msg.ts.isoformat()})


@bp.get("/history/<group_id>")
def history(group_id: str):
    limit_str = request.args.get("limit", "100")
    try:
        limit = int(limit_str)
    except ValueError:
        limit = 100
    limit = min(limit, 100)
    if not verify_group_member(g.user.id, str(group_id)):
        abort(403)
    msgs = fetch_recent_messages(str(group_id), limit)
    return jsonify([
        {"userId": m.user_id, "content": m.content, "ts": m.ts.isoformat()}
        for m in msgs
    ])
