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
        # Set up a user with a player tag (would normally come from Java service)
        user = User(id=1, sub="abc", email="u@example.com", name="U", player_tag="ABC")
        db.session.add(user)
        db.session.commit()

    hdrs = {"Authorization": "Bearer t"}
    
    # Test the verify endpoint (this remains in Flask)
    resp = client.post(
        "/api/v1/user/verify",
        json={"token": "tok"},
        headers=hdrs,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"
    assert data["player_tag"] == "ABC"
    
    # Verify the user is now marked as verified
    with app.app_context():
        user = User.query.get(1)
        assert user.is_verified is True
