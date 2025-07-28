import logging
from flask import Blueprint, request, jsonify
from . import API_PREFIX

bp = Blueprint("log", __name__, url_prefix=f"{API_PREFIX}")

logger = logging.getLogger(__name__)

@bp.post("/log")
def log_message():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    logger.info("SW log: %s", message)
    return jsonify({"status": "ok"})
