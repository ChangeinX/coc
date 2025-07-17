from flask import Blueprint, jsonify, request, g, abort

from messages.services.publisher import publish_message, verify_group_member

API_PREFIX = "/api/v1"

bp = Blueprint("messages", __name__, url_prefix=f"{API_PREFIX}/chat")


@bp.post("/publish")
def publish():
    data = request.get_json(silent=True) or {}
    group_id = data.get("groupId")
    text = (data.get("text") or "").strip()
    if not group_id or not text:
        abort(400)
    if not verify_group_member(g.user.id, str(group_id)):
        abort(403)
    msg = publish_message(str(group_id), text, g.user.id)
    return jsonify({"status": "ok", "ts": msg.ts.isoformat()})
