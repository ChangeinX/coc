from flask import Flask
from app.extensions import oauth


def register_oauth(app: Flask) -> None:
    """Configure OAuth clients."""
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=app.config.get("GOOGLE_CLIENT_ID"),
        client_secret=app.config.get("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    oauth.register(
        name="apple",
        client_id=app.config.get("APPLE_CLIENT_ID"),
        client_secret=app.config.get("APPLE_CLIENT_SECRET"),
        server_metadata_url="https://appleid.apple.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email name"},
    )
