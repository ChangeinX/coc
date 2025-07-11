from flask import Flask
from app.api.clan_routes import bp as clan_bp
from app.api.frontend_routes import bp as frontend_bp
from app.api.player_routes import bp as player_bp
from app.api.war_routes import bp as war_bp
from app.api.auth_routes import bp as auth_bp


def register_blueprints(app: Flask):
    app.register_blueprint(clan_bp)
    app.register_blueprint(player_bp)
    app.register_blueprint(war_bp)
    app.register_blueprint(frontend_bp)
    app.register_blueprint(auth_bp)
