from flask import Blueprint, jsonify, request, g, abort
from coclib.extensions import db
from coclib.utils import normalize_tag
from coclib.models import UserProfile
from . import API_PREFIX

bp = Blueprint("user", __name__, url_prefix=f"{API_PREFIX}/user")


@bp.get("/me")
def me():
    return jsonify(
        {
            "email": g.user.email,
            "name": g.user.name,
            "player_tag": g.user.player_tag,
        }
    )


@bp.post("/player-tag")
def set_player_tag():
    data = request.get_json(silent=True) or {}
    tag = data.get("player_tag", "").strip()
    if not tag:
        abort(400)
    g.user.player_tag = normalize_tag(tag)
    db.session.add(g.user)
    db.session.commit()
    return jsonify({"player_tag": g.user.player_tag})


@bp.get("/profile")
def get_profile():
    prof = g.user.profile
    if not prof:
        prof = UserProfile(user_id=g.user.id)
        db.session.add(prof)
        db.session.commit()
    return jsonify(
        {
            "risk_weight_war": prof.risk_weight_war,
            "risk_weight_idle": prof.risk_weight_idle,
            "risk_weight_don_deficit": prof.risk_weight_don_deficit,
            "risk_weight_don_drop": prof.risk_weight_don_drop,
            "is_leader": prof.is_leader,
        }
    )


@bp.post("/profile")
def update_profile():
    data = request.get_json(silent=True) or {}
    prof = g.user.profile or UserProfile(user_id=g.user.id)
    prof.risk_weight_war = float(data.get("risk_weight_war", prof.risk_weight_war))
    prof.risk_weight_idle = float(data.get("risk_weight_idle", prof.risk_weight_idle))
    prof.risk_weight_don_deficit = float(data.get("risk_weight_don_deficit", prof.risk_weight_don_deficit))
    prof.risk_weight_don_drop = float(data.get("risk_weight_don_drop", prof.risk_weight_don_drop))
    prof.is_leader = bool(data.get("is_leader", prof.is_leader))
    db.session.add(prof)
    db.session.commit()
    return jsonify({"status": "ok"})
