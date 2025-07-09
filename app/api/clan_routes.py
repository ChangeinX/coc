from flask import Blueprint, jsonify
from app.services.clan_service import get_clan
from app.services.risk_service import clan_at_risk

bp = Blueprint("clan", __name__, url_prefix="/clan")


@bp.get("/<string:tag>")
async def clan_profile(tag: str):
    data = await get_clan(tag.upper())
    return jsonify(data)


@bp.get("/<string:tag>/members/at-risk")
async def at_risk(tag: str):
    scores = await clan_at_risk(tag.upper())
    return jsonify(scores)
