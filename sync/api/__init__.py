from flask import Blueprint, jsonify, request, abort

from coclib.services import clan_service, player_service, war_service

bp = Blueprint("sync_api", __name__, url_prefix="/sync")


@bp.post("/player/<string:tag>")
async def fetch_player(tag: str):
    data = await player_service.get_player(tag.upper())
    return jsonify(data)


@bp.post("/clan/<string:tag>")
async def fetch_clan(tag: str):
    data = await clan_service.get_clan(tag.upper())
    return jsonify(data)


@bp.post("/war/<string:tag>")
async def fetch_war(tag: str):
    data = await war_service.current_war(tag.upper())
    return jsonify(data)


@bp.post("/verify/<string:tag>")
async def verify(tag: str):
    data = request.get_json(silent=True) or {}
    token = data.get("token", "")
    if not token:
        abort(400)
    result = await player_service.verify_token(tag.upper(), token)
    return jsonify(result)

