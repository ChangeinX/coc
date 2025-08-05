from __future__ import annotations

import jwt
from flask import Flask, g, request, abort

from coclib.config import Config
from coclib.extensions import db
from coclib.models import User

from .api import register_blueprints


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    db.init_app(app)
    signing_key = app.config["JWT_SIGNING_KEY"]

    def require_auth():
        path = request.path.rstrip("/")
        if (
                request.method == "OPTIONS"
                or path.endswith("/health")
                or path.endswith("/log")
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
        except Exception:
            abort(401)
        user = User.query.filter_by(sub=info["sub"]).one_or_none()
        if not user:
            abort(401)
        g.user = user

    app.before_request(require_auth)

    register_blueprints(app)

    return app
