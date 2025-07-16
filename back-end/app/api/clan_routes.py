from flask import Blueprint, jsonify, g

from ..services.snapshot_service import get_clan as get_clan_snapshot
from coclib.services.loyalty_service import get_clan_loyalty
from ..services.risk_service import clan_at_risk
from . import API_PREFIX

bp = Blueprint("clan", __name__, url_prefix=f"{API_PREFIX}/clan")


@bp.get("/<string:tag>")
async def clan_profile(tag: str):
    data = await get_clan_snapshot(tag.upper())
    return jsonify(data)


@bp.get("/<string:tag>/members/at-risk")
async def at_risk(tag: str):
    weights = None
    profile = getattr(g.user, "profile", None)
    if profile:
        weights = {
            "war": profile.risk_weight_war,
            "idle": profile.risk_weight_idle,
            "don_deficit": profile.risk_weight_don_deficit,
            "don_drop": profile.risk_weight_don_drop,
        }
    scores = await clan_at_risk(tag.upper(), weights=weights)
    return jsonify(scores)



@bp.get("/<string:tag>/members/loyalty")
async def loyalty(tag: str):
    # Refresh clan snapshot to ensure membership list is current
    await get_clan_snapshot(tag.upper())
    data = get_clan_loyalty(tag.upper())
    return jsonify(data)
