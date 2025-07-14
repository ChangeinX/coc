import logging

from pathlib import Path

from flask import Flask, g, request, abort
from flask_cors import CORS

from .api import register_blueprints
from .models import User
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from coclib.config import Config
from coclib.extensions import db, cache, migrate, scheduler
from coclib.logging_config import configure_logging

logger = logging.getLogger(__name__)


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    configure_logging(level=cfg_cls.LOG_LEVEL)
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    client_id = app.config.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID environment variable is required")

    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)

    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))


    def require_auth():
        path = request.path.rstrip("/")
        if request.method == "OPTIONS" or path == "/health":
            return
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            abort(401)
        token = auth.split(" ", 1)[1]
        try:
            info = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except Exception as exc:
            logger.warning("Token verification failed: %s", exc)
            abort(401)

        user = User.query.filter_by(sub=info["sub"]).one_or_none()
        if not user:
            user = User(
                sub=info["sub"],
                email=info.get("email"),
                name=info.get("name"),
            )
            db.session.add(user)
            db.session.commit()
        g.user = user

        if not user.player_tag and not path.startswith("/user"):
            abort(400)

    app.before_request(require_auth)

    register_blueprints(app)



    return app
