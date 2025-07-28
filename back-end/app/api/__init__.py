# ruff: noqa: E402
from flask import Flask

API_PREFIX = "/api/v1"

from .clan_routes import bp as clan_bp
from .player_routes import bp as player_bp
from .war_routes import bp as war_bp
from .health_routes import bp as health_bp
from .user_routes import bp as user_bp
from .asset_routes import bp as asset_bp
from .log_routes import bp as log_bp


def register_blueprints(app: Flask):
    app.register_blueprint(clan_bp)
    app.register_blueprint(player_bp)
    app.register_blueprint(war_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(asset_bp)
    app.register_blueprint(log_bp)
