# ruff: noqa: E402
from flask import Flask

API_PREFIX = "/api/v1"

from .health_routes import bp as health_bp
from .user_routes import bp as user_bp


def register_blueprints(app: Flask):
    app.register_blueprint(health_bp)
    app.register_blueprint(user_bp)
