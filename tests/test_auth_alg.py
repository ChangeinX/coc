import pathlib
import sys
import jwt
from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "supersecretkeylongerthan32bytes!"


def _make_token(key: str) -> str:
    return jwt.encode({"sub": "abc"}, key, algorithm="HS512")


def test_hs512_token(monkeypatch):
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U", player_tag="AAA"))
        db.session.commit()

    token = _make_token(TestConfig.JWT_SIGNING_KEY)
    resp = client.get(
        "/api/v1/user/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
