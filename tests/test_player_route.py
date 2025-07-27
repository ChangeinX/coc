import sys
import pathlib

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


def test_player_not_found_returns_404(monkeypatch):
    async def dummy(tag: str):
        return None

    monkeypatch.setattr(
        "app.api.player_routes.get_player_snapshot",
        dummy,
    )
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U", player_tag="AAA"))
        db.session.commit()
    resp = client.get(
        "/api/v1/player/UNKNOWN",
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 404


def test_player_by_user(monkeypatch):
    async def dummy(tag: str):
        return {"name": "User", "leagueIcon": "icon", "tag": tag}

    monkeypatch.setattr(
        "app.api.player_routes.get_player_snapshot",
        dummy,
    )
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U", player_tag="AAA"))
        db.session.add(User(id=2, sub="xyz", email="x@example.com", name="X", player_tag="BBB"))
        db.session.commit()
    resp = client.get(
        "/api/v1/player/by-user/xyz",
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["tag"] == "BBB"
