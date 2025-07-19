from flask import Flask
from messages.services import publisher
from messages.app import create_app  # type: ignore
from coclib.config import MessagesConfig
from coclib.extensions import db
from coclib.models import User, ChatGroup, ChatGroupMember

class TestConfig(MessagesConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"
    MESSAGES_TABLE = "chat_messages"


def test_publish_message_saves(monkeypatch):
    app = Flask(__name__)
    app.config.from_object(TestConfig)

    put_called = {}

    class DummyTable:
        def put_item(self, Item=None):
            put_called["item"] = Item

    class DummyResource:
        def Table(self, name):
            put_called["table"] = name
            return DummyTable()

    class DummySession:
        def __init__(self, *a, **k):
            pass

        def resource(self, *_a, **_k):
            return DummyResource()

    monkeypatch.setattr(publisher.boto3, "Session", DummySession)
    class DummySocketIO:
        def __init__(self):
            self.calls = []

        def emit(self, event, data, namespace=None, room=None):
            self.calls.append((event, data, namespace, room))

    dummy_sio = DummySocketIO()
    monkeypatch.setattr(publisher, "_socketio", dummy_sio)

    with app.app_context():
        msg = publisher.publish_message("1", "hi", 5)

    assert put_called["table"] == "chat_messages"
    assert put_called["item"]["channel"] == "1"
    assert put_called["item"]["userId"] == "5"
    assert msg.content == "hi"
    assert dummy_sio.calls[0][0] == "message"
    assert dummy_sio.calls[0][3] == "1"


def test_verify_group_member_accepts_tag(monkeypatch):
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add_all([
            User(id=2, sub="s", email="e", name="N"),
            ChatGroup(id=1, name="CLAN"),
            ChatGroupMember(group_id=1, user_id=2),
        ])
        db.session.commit()

        assert publisher.verify_group_member(2, "CLAN") is True
        assert publisher.verify_group_member(2, "999") is False



