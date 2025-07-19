import logging
from pathlib import Path
from flask import Flask, g, request, abort
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from coclib.config import MessagesConfig
from coclib.extensions import db, cache, migrate, scheduler
from coclib.logging_config import configure_logging
from coclib.models import User

from .api import bp as messages_bp, API_PREFIX
from .api.health import bp as health_bp
from flask_socketio import SocketIO, join_room
from messages.services import publisher

socketio = SocketIO()  # initialized within create_app

logger = logging.getLogger(__name__)


def create_app(cfg_cls: type[MessagesConfig] = MessagesConfig) -> Flask:
    configure_logging(level=cfg_cls.LOG_LEVEL)
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    client_id = app.config.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID environment variable is required")

    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["CORS_ORIGINS"],
        path="socket.io",
    )
    publisher.set_socketio(socketio)

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)
    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))

    def require_auth():
        path = request.path.rstrip("/")
        if (
            request.method == "OPTIONS"
            or path.endswith("/health")
            or path.endswith("/socket.io")
        ):
            return
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            abort(401)
        token = auth.split(" ", 1)[1]
        try:
            info = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        except Exception as exc:
            logger.warning("Token verification failed: %s", exc)
            abort(401)
        user = User.query.filter_by(sub=info["sub"]).one_or_none()
        if not user:
            user = User(sub=info["sub"], email=info.get("email"), name=info.get("name"))
            db.session.add(user)
            db.session.commit()
        g.user = user
        chat_prefix = f"{API_PREFIX}/chat"
        if not user.player_tag and not path.startswith(chat_prefix):
            abort(400)

    app.before_request(require_auth)

    app.register_blueprint(messages_bp)
    app.register_blueprint(health_bp)

    @socketio.on("connect", namespace=f"{API_PREFIX}/chat")
    def chat_connect():
        group_id = request.args.get("groupId")
        token = request.args.get("token", "")
        if not token or not group_id:
            return False
        try:
            info = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        except Exception as exc:
            logger.warning("Socket token verification failed: %s", exc)
            return False
        user = User.query.filter_by(sub=info["sub"]).one_or_none()
        if not user:
            user = User(sub=info["sub"], email=info.get("email"), name=info.get("name"))
            db.session.add(user)
            db.session.commit()
        if not publisher.verify_group_member(user.id, str(group_id)):
            return False
        join_room(str(group_id))
        return None

    @socketio.on("disconnect", namespace=f"{API_PREFIX}/chat")
    def chat_disconnect():
        pass

    return app
