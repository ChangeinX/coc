from flask import Blueprint, jsonify, request, g, abort
from coclib.extensions import db
from coclib.utils import normalize_tag

bp = Blueprint("user", __name__, url_prefix="/user")


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
