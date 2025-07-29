from flask import Blueprint, jsonify, request, g, abort, current_app
from coclib.extensions import db
from coclib.utils import normalize_tag
from coclib.models import UserProfile, FeatureFlag, Legal
from coclib.config import Config
from coclib.services.player_service import verify_token as verify_player_token
from . import API_PREFIX


bp = Blueprint("user", __name__, url_prefix=f"{API_PREFIX}/user")


async def _verify_player_token(tag: str, token: str) -> bool:
    return await verify_player_token(tag, token)


@bp.get("/me")
def me():
    return jsonify(
        {
            "id": g.user.id,
            "sub": g.user.sub,
            "email": g.user.email,
            "name": g.user.name,
            "player_tag": g.user.player_tag,
            "verified": g.user.is_verified,
        }
    )


@bp.post("/player-tag")
def set_player_tag():
    data = request.get_json(silent=True) or {}
    tag = data.get("player_tag", "").strip()
    if not tag:
        abort(400)
    if g.user.is_verified:
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
            "verified": g.user.is_verified,
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


@bp.post("/verify")
async def verify_player():
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()
    if not token or not g.user.player_tag:
        abort(400)
    if g.user.is_verified:
        abort(400)
    result = await _verify_player_token(g.user.player_tag, token)
    if not result:
        abort(400)
    g.user.player_tag = normalize_tag(g.user.player_tag)
    g.user.is_verified = True
    db.session.add(g.user)
    db.session.commit()
    return jsonify({"status": "ok", "player_tag": g.user.player_tag})


@bp.get("/features")
def get_features():
    prof = g.user.profile
    if not prof:
        prof = UserProfile(user_id=g.user.id)
        db.session.add(prof)
        db.session.commit()
    names = [f.name for f in prof.features]
    return jsonify({"all": prof.all_features, "features": names})


@bp.post("/features")
def update_features():
    data = request.get_json(silent=True) or {}
    prof = g.user.profile or UserProfile(user_id=g.user.id)
    prof.all_features = bool(data.get("all", prof.all_features))
    names = data.get("features", [])
    if prof.all_features:
        prof.features = FeatureFlag.query.all()
    else:
        prof.features = FeatureFlag.query.filter(FeatureFlag.name.in_(names)).all()
    db.session.add(prof)
    db.session.commit()
    return jsonify({"status": "ok"})


@bp.get("/legal")
def get_legal():
    version = current_app.config.get("LEGAL_VERSION")
    record = (
        Legal.query.filter_by(user_id=g.user.id, version=version)
        .order_by(Legal.created_at.desc())
        .first()
    )
    return jsonify(
        {
            "accepted": bool(record and record.accepted and record.version == Config.LEGAL_VERSION),
            "version": record.version if record else None,
        }
    )


@bp.post("/legal")
def accept_legal():
    data = request.get_json(silent=True) or {}
    version = data.get("version")
    rec = Legal(user_id=g.user.id, accepted=True, version=version)
    db.session.add(rec)
    db.session.commit()
    return jsonify({"status": "ok"})


@bp.get("/disclaimer")
def get_disclaimer():
    rec = (
        Legal.query.filter_by(user_id=g.user.id, acknowledged_disclaimer=True)
        .order_by(Legal.created_at.desc())
        .first()
    )
    return jsonify({"seen": bool(rec)})


@bp.post("/disclaimer")
def accept_disclaimer():
    g.user.seen_supercell_disclaimer = True
    rec = Legal(
        user_id=g.user.id,
        accepted=False,
        version=current_app.config.get("LEGAL_VERSION"),
        acknowledged_disclaimer=True,
    )
    db.session.add_all([g.user, rec])
    db.session.commit()
    return jsonify({"status": "ok"})
