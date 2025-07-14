from flask import Flask

from .clan_routes import bp as clan_bp
from .player_routes import bp as player_bp
from .war_routes import bp as war_bp
from .health_routes import bp as health_bp


def register_blueprints(app: Flask):
    app.register_blueprint(clan_bp)
    app.register_blueprint(player_bp)
    app.register_blueprint(war_bp)
    app.register_blueprint(health_bp)
