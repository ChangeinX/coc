from flask import Blueprint, jsonify

bp = Blueprint("health", __name__, url_prefix="/health")


@bp.route("/", methods=["GET"], strict_slashes=False)
async def health_check():
    return jsonify({"status": "ok"}), 200
