from flask import Flask
from app.api.clan_routes import bp as clan_bp
from app.api.player_routes import bp as player_bp
from app.api.war_routes import bp as war_bp


def register_blueprints(app: Flask):
    app.register_blueprint(clan_bp)
    app.register_blueprint(player_bp)
    app.register_blueprint(war_bp)
