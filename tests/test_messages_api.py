from flask.testing import FlaskClient

from messages.app import create_app  # type: ignore
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "messages.app.id_token.verify_oauth2_token",
        lambda t, req, cid: {"sub": "abc", "email": "u@example.com", "name": "U"},
    )


def test_publish_requires_membership(monkeypatch):
    _mock_verify(monkeypatch)
    monkeypatch.setattr(
        "messages.app.api.verify_group_member",
        lambda u, g: False,
    )
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.commit()

    hdrs = {"Authorization": "Bearer t"}
    resp = client.post("/api/v1/chat/publish", json={"groupId": "1", "text": "hi"}, headers=hdrs)
    assert resp.status_code == 403
