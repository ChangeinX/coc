import sys
import pathlib
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


def test_clan_not_found_returns_404(monkeypatch):
    async def dummy(tag: str):
        return None

    monkeypatch.setattr("app.api.clan_routes.get_clan_snapshot", dummy)
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U", player_tag="AAA"))
        db.session.commit()
    resp = client.get(
        "/api/v1/clan/UNKNOWN",
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 404
