import logging
from flask import Blueprint, redirect, url_for
from flask_login import login_user, logout_user

from app.extensions import db, login_manager, oauth
from app.models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")
logger = logging.getLogger(__name__)


@login_manager.user_loader
def load_user(user_id: str):
    return User.query.get(int(user_id))


@bp.get("/login/<provider>")
def login(provider: str):
    client = oauth.create_client(provider)
    redirect_uri = url_for("auth.authorize", provider=provider, _external=True)
    return client.authorize_redirect(redirect_uri)


@bp.get("/authorize/<provider>")
def authorize(provider: str):
    client = oauth.create_client(provider)
    token = client.authorize_access_token()
    user_info = token.get("userinfo") or client.parse_id_token(token)
    email = user_info.get("email")
    provider_id = user_info.get("sub")
    user = User.query.filter_by(provider=provider, provider_id=provider_id).first()
    if not user:
        user = User(email=email, provider=provider, provider_id=provider_id)
        db.session.add(user)
        db.session.commit()
    login_user(user)
    return redirect(url_for("front.dash"))


@bp.get("/logout")
def logout():
    logout_user()
    return redirect(url_for("front.dash"))
