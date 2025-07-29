import sys
import pathlib
from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, Legal


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"
    LEGAL_VERSION = "20250729"


def setup_app(monkeypatch):
    monkeypatch.setattr("app.jwt.decode", lambda t, key, algorithms: {"sub": "abc"})
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.commit()
    return app


def test_accept_and_get_legal(monkeypatch):
    app = setup_app(monkeypatch)
    client: FlaskClient = app.test_client()
    hdrs = {"Authorization": "Bearer t"}

    resp = client.get("/api/v1/user/legal", headers=hdrs)
    data = resp.get_json()
    assert data["accepted"] is False
    assert data["version"] is None

    resp = client.post(
        "/api/v1/user/legal",
        headers=hdrs,
        json={"version": "20250729"},
    )
    assert resp.status_code == 200

    resp = client.get("/api/v1/user/legal", headers=hdrs)
    data = resp.get_json()
    assert data["accepted"] is True
    assert data["version"] == "20250729"
    with app.app_context():
        assert Legal.query.filter_by(user_id=1).count() == 1

def test_requires_accept_on_version_change(monkeypatch):
    class OldConfig(TestConfig):
        LEGAL_VERSION = "20250728"

    monkeypatch.setattr("app.jwt.decode", lambda t, key, algorithms: {"sub": "abc"})
    app = create_app(OldConfig)
    monkeypatch.setattr("app.api.user_routes.Config.LEGAL_VERSION", "20250728")
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.commit()

    client: FlaskClient = app.test_client()
    hdrs = {"Authorization": "Bearer t"}

    # accept old version
    client.post("/api/v1/user/legal", headers=hdrs, json={"version": "20250728"})

    # confirm accepted for old version
    resp = client.get("/api/v1/user/legal", headers=hdrs)
    assert resp.get_json()["accepted"] is True

    # bump version
    monkeypatch.setattr("app.api.user_routes.Config.LEGAL_VERSION", "20250729")

    resp = client.get("/api/v1/user/legal", headers=hdrs)
    data = resp.get_json()
    assert data["accepted"] is False
    assert data["version"] == "20250728"


def test_disclaimer_endpoints(monkeypatch):
    app = setup_app(monkeypatch)
    client: FlaskClient = app.test_client()
    hdrs = {"Authorization": "Bearer t"}

    resp = client.get("/api/v1/user/disclaimer", headers=hdrs)
    assert resp.get_json()["seen"] is False

    resp = client.post("/api/v1/user/disclaimer", headers=hdrs)
    assert resp.status_code == 200

    with app.app_context():
        assert (
            Legal.query.filter_by(user_id=1, acknowledged_disclaimer=True).count() == 1
        )

    resp = client.get("/api/v1/user/disclaimer", headers=hdrs)
    assert resp.get_json()["seen"] is True
