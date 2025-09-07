import logging

from pathlib import Path

from flask import Flask, g, request, abort
from flask_cors import CORS

from .api import register_blueprints, API_PREFIX
from .models import User
import jwt
import requests
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

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)

    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))

    signing_key = app.config["JWT_SIGNING_KEY"]
    # Use service discovery DNS for production, localhost for development
    auth_url = app.config.get("AUTH_URL", "http://user.clanboards.local:8020" if not app.config.get("DEBUG") else "http://localhost:8020")

    def verify_token_with_user_service(token: str) -> dict:
        """Verify token with user service and return user info."""
        try:
            response = requests.get(
                f"{auth_url}/api/v1/users/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.debug(f"User service token verification failed: {response.status_code}")
                return None
        except Exception as e:
            logger.warning(f"Failed to verify token with user service: {e}")
            return None

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
        info = None
        
        # First try HMAC verification for legacy tokens
        try:
            info = jwt.decode(token, signing_key, algorithms=["HS256", "HS384", "HS512"])
        except jwt.InvalidTokenError:
            # If HMAC fails, try user service verification for RS256 tokens
            user_info = verify_token_with_user_service(token)
            if user_info:
                # Convert user service response to expected format
                info = {"sub": user_info.get("sub")}
            
        if not info:
            logger.warning("Token verification failed with both methods")
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
