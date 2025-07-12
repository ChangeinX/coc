from flask import Blueprint, jsonify

from app.services.snapshot_service import get_clan as get_clan_snapshot
from coclib.services.loyalty_service import get_clan_loyalty
from app.services.risk_service import clan_at_risk

bp = Blueprint("clan", __name__, url_prefix="/clan")


@bp.get("/<string:tag>")
async def clan_profile(tag: str):
    data = await get_clan_snapshot(tag.upper())
    return jsonify(data)


@bp.get("/<string:tag>/members/at-risk")
async def at_risk(tag: str):
    scores = await clan_at_risk(tag.upper())
    return jsonify(scores)



@bp.get("/<string:tag>/members/loyalty")
async def loyalty(tag: str):
    data = get_clan_loyalty(tag.upper())
    return jsonify(data)