from flask import Blueprint, jsonify
from sync.services.player_service import get_player_snapshot
from coclib.services.loyalty_service import get_player_loyalty

bp = Blueprint("player", __name__, url_prefix="/player")


@bp.get("/<string:tag>")
async def player_profile(tag: str):
    norm_tag = tag.upper().lstrip("#")
    data = await get_player_snapshot(norm_tag)
    data["loyalty"] = get_player_loyalty(norm_tag)
    return jsonify(data)

