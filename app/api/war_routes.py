from flask import Blueprint, jsonify
from app.services.war_service import current_war

bp = Blueprint("war", __name__, url_prefix="/war")


@bp.get("/<string:clan_tag>/current")
async def war_status(clan_tag: str):
    data = await current_war(clan_tag)
    if data is None:
        return jsonify({"state": "notInWar"}), 200
    return jsonify(data)
