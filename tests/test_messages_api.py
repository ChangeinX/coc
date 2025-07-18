from datetime import datetime

from flask.testing import FlaskClient

from messages.app import create_app  # type: ignore
from coclib.config import MessagesConfig
from coclib.extensions import db
from coclib.models import User, ChatGroup, ChatGroupMember
from messages import models


class TestConfig(MessagesConfig):
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


def test_publish_ok(monkeypatch):
    _mock_verify(monkeypatch)
    called = {}
    def fake_publish(*args, **kwargs):
        called["args"] = args
        called["kwargs"] = kwargs
        return models.ChatMessage(channel="1", user_id=1, content="hi", ts=datetime.utcnow())

    monkeypatch.setattr("messages.app.api.publish_message", fake_publish)
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add_all([
            User(id=1, sub="abc", email="u@example.com", name="U"),
            ChatGroup(id=1, name="g"),
            ChatGroupMember(group_id=1, user_id=1),
        ])
        db.session.commit()

    hdrs = {"Authorization": "Bearer t"}
    resp = client.post("/api/v1/chat/publish", json={"groupId": "1", "text": "hi"}, headers=hdrs)
    assert resp.status_code == 200
    assert called["args"][0] == "1"


def test_history_returns_messages(monkeypatch):
    _mock_verify(monkeypatch)
    monkeypatch.setattr(
        "messages.app.api.fetch_recent_messages",
        lambda gid, limit=100: [
            models.ChatMessage(channel="1", user_id=1, content="hi", ts=datetime.utcnow())
        ],
    )
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add_all([
            User(id=1, sub="abc", email="u@example.com", name="U"),
            ChatGroup(id=1, name="g"),
            ChatGroupMember(group_id=1, user_id=1),
        ])
        db.session.commit()

    hdrs = {"Authorization": "Bearer t"}
    resp = client.get("/api/v1/chat/history/1", headers=hdrs)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data[0]["content"] == "hi"

