from flask import Blueprint, jsonify
from app.services.player_service import get_player

bp = Blueprint("player", __name__, url_prefix="/player")


@bp.get("/<string:tag>")
async def player_profile(tag: str):
    data = await get_player(tag.upper())
    return jsonify(data)
