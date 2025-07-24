from flask import Blueprint, jsonify, abort
from coclib.services.player_service import get_player_snapshot
from coclib.services.loyalty_service import get_player_loyalty
from coclib.models import User
from ..services.risk_service import get_history, score_breakdown
from . import API_PREFIX

bp = Blueprint("player", __name__, url_prefix=f"{API_PREFIX}/player")


async def _build_profile(tag: str) -> dict | None:
    norm_tag = tag.upper().lstrip("#")
    data = await get_player_snapshot(norm_tag)
    if data is None:
        return None
    data["loyalty"] = get_player_loyalty(norm_tag)

    history = await get_history(norm_tag, 30)
    score_val, _, breakdown = score_breakdown(history)
    data["risk_score"] = score_val
    data["risk_breakdown"] = breakdown
    return data


@bp.get("/<string:tag>")
async def player_profile(tag: str):
    data = await _build_profile(tag)
    if data is None:
        abort(404)
    return jsonify(data)


@bp.get("/by-user/<string:sub>")
async def player_profile_by_user(sub: str):
    user = User.query.filter_by(sub=sub).one_or_none()
    if user is None or not user.player_tag:
        abort(404)
    data = await _build_profile(user.player_tag)
    if data is None:
        abort(404)
    return jsonify(data)

