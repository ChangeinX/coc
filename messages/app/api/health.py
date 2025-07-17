from flask import Blueprint, jsonify
from . import API_PREFIX

bp = Blueprint("health", __name__, url_prefix=f"{API_PREFIX}/health")


@bp.route("/", methods=["GET"], strict_slashes=False)
async def health_check():
    return jsonify({"status": "ok"}), 200
