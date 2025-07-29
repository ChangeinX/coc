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
    assert resp.get_json()["accepted"] is False

    resp = client.post("/api/v1/user/legal", headers=hdrs)
    assert resp.status_code == 200

    resp = client.get("/api/v1/user/legal", headers=hdrs)
    assert resp.get_json()["accepted"] is True
    with app.app_context():
        assert Legal.query.filter_by(user_id=1).count() == 1

    # require re-acceptance when version changes
    app.config["LEGAL_VERSION"] = "20250730"
    resp = client.get("/api/v1/user/legal", headers=hdrs)
    assert resp.get_json()["accepted"] is False

