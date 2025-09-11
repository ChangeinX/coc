from flask import Blueprint, jsonify, request, g, abort
from coclib.extensions import db
from coclib.utils import normalize_tag
from coclib.services.player_service import verify_token as verify_player_token
from . import API_PREFIX


bp = Blueprint("user", __name__, url_prefix=f"{API_PREFIX}/user")


async def _verify_player_token(tag: str, token: str) -> bool:
    return await verify_player_token(tag, token)


@bp.post("/verify")
async def verify_player():
    """Verify a player's API token via the Clash of Clans API.
    
    This endpoint remains in Flask as it depends on the CoC API integration.
    All other user endpoints have been migrated to the Java user_service.
    """
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()
    if not token or not g.user.player_tag:
        abort(400)
    if g.user.is_verified:
        abort(400)
    result = await _verify_player_token(g.user.player_tag, token)
    if not result:
        abort(400)
    g.user.player_tag = normalize_tag(g.user.player_tag)
    g.user.is_verified = True
    db.session.add(g.user)
    db.session.commit()
    return jsonify({"status": "ok", "player_tag": g.user.player_tag})
