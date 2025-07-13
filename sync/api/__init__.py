from flask import Blueprint, jsonify

from sync.services import clan_service, player_service

bp = Blueprint("sync_api", __name__, url_prefix="/sync")


@bp.post("/player/<string:tag>")
async def fetch_player(tag: str):
    data = await player_service.get_player(tag.upper())
    return jsonify(data)


@bp.post("/clan/<string:tag>")
async def fetch_clan(tag: str):
    data = await clan_service.get_clan(tag.upper())
    return jsonify(data)
