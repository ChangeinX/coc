import sys
import pathlib

for m in list(sys.modules):
    if m == "app" or m.startswith("app."):
        sys.modules.pop(m)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "clan-service"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "app.id_token.verify_oauth2_token",
        lambda t, req, cid: {"sub": "abc", "email": "u@example.com", "name": "U"},
    )


def test_player_not_found_returns_404(monkeypatch):
    async def dummy(tag: str):
        return None

    monkeypatch.setattr(
        "coclib.services.player_service.get_player_snapshot",
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
