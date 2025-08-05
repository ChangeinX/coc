from flask import Flask

API_PREFIX = "/api/v1"

from .recruit_routes import bp as recruit_bp  # noqa: E402


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(recruit_bp)
