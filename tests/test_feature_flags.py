import pathlib
import sys

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, FeatureFlag, UserProfile


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "app.id_token.verify_oauth2_token",
        lambda t, req, cid: {"sub": "abc", "email": "u@example.com", "name": "U"},
    )


def setup_app(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add_all(
            [FeatureFlag(id=i + 1, name=n) for i, n in enumerate(["x", "y", "z"])]
        )
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.add(UserProfile(id=1, user_id=1))
        db.session.commit()
    return app


def test_update_and_get_features(monkeypatch):
    app = setup_app(monkeypatch)
    client: FlaskClient = app.test_client()
    hdrs = {"Authorization": "Bearer t"}

    resp = client.post(
        "/api/v1/user/features",
        json={"features": ["x", "z"], "all": False},
        headers=hdrs,
    )
    assert resp.status_code == 200

    resp = client.get("/api/v1/user/features", headers=hdrs)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["all"] is False
    assert sorted(data["features"]) == ["x", "z"]
