import logging

from pathlib import Path

from flask import Flask, g, request, abort
from flask_cors import CORS

from .api import register_blueprints, API_PREFIX
from .models import User
import jwt
from coclib.config import Config
from coclib.extensions import db, cache, migrate, scheduler
from coclib.logging_config import configure_logging

logger = logging.getLogger(__name__)


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    configure_logging(level=cfg_cls.LOG_LEVEL)
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    CORS(
        app,
        resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    print("Enabled CORS for origins:", app.config["CORS_ORIGINS"])
    print("Cookie domain:", app.config["COOKIE_DOMAIN"])

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)

    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))


    signing_key = app.config["JWT_SIGNING_KEY"]

    def require_auth():
        path = request.path.rstrip("/")
        asset_prefix = f"{API_PREFIX}/assets"
        if (
            request.method == "OPTIONS"
            or path.endswith("/health")
            or path.endswith("/log")
            or path.startswith(asset_prefix)
        ):
            return
        token = request.cookies.get("sid")
        if not token:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth.split(" ", 1)[1]
        if not token:
            abort(401)
        try:
            info = jwt.decode(token, signing_key, algorithms=["HS256", "HS384", "HS512"])
        except Exception as exc:
            logger.warning("Token verification failed: %s", exc)
            abort(401)

        user = User.query.filter_by(sub=info["sub"]).one_or_none()
        if not user:
            abort(401)
        g.user = user

        user_prefix = f"{API_PREFIX}/user"
        if not user.player_tag and not path.startswith(user_prefix):
            abort(400)

    app.before_request(require_auth)

    register_blueprints(app)



    return app
