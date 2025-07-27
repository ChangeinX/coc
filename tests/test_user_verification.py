import pathlib
import sys

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "app.jwt.decode",
        lambda t, key, algorithms: {"sub": "abc"},
    )


async def dummy_verify(tag: str, token: str):
    return True


def test_verify_sets_flag(monkeypatch):
    _mock_verify(monkeypatch)
    monkeypatch.setattr("app.api.user_routes._verify_player_token", dummy_verify)

    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.commit()

    hdrs = {"Authorization": "Bearer t"}
    resp = client.get("/api/v1/user/me", headers=hdrs)
    assert resp.status_code == 200

    resp = client.post(
        "/api/v1/user/player-tag",
        json={"player_tag": "abc"},
        headers=hdrs,
    )
    assert resp.status_code == 200

    resp = client.post(
        "/api/v1/user/verify",
        json={"token": "tok"},
        headers=hdrs,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"

    resp = client.post(
        "/api/v1/user/player-tag",
        json={"player_tag": "zzz"},
        headers=hdrs,
    )
    assert resp.status_code == 400
