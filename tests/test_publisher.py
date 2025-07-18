import json
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
    APPSYNC_EVENTS_URL = "https://api.test/graphql"


def test_publish_message_posts_graphql(monkeypatch):
    app = Flask(__name__)
    app.config.from_object(TestConfig)

    posted = {}
    monkeypatch.setattr(publisher, "SigV4Auth", lambda *a, **k: type("A", (), {"add_auth": lambda self, r: None})())

    class DummyTable:
        def __init__(self):
            self.items = []

        def put_item(self, Item):
            self.items.append(Item)

    dummy_table = DummyTable()

    class DummyResource:
        def Table(self, name):
            return dummy_table

    class DummySession:
        def __init__(self, *a, **k):
            pass

        def resource(self, service):
            assert service == "dynamodb"
            return DummyResource()

        def get_credentials(self):
            return None

    monkeypatch.setattr(publisher.boto3, "Session", DummySession)

    def fake_post(url, content=None, headers=None):
        posted["url"] = url
        posted["body"] = content
        posted["headers"] = headers
        class Resp:
            status_code = 200
        return Resp()

    monkeypatch.setattr(publisher, "httpx", type("M", (), {"post": staticmethod(fake_post)}))

    with app.app_context():
        publisher.publish_message("1", "hi", 5)

    body = json.loads(posted["body"])
    assert body["operationName"] == "SendMessage"
    assert body["variables"] == {"channel": "1", "userId": "5", "content": "hi"}


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



