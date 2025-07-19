import os
import sys
from datetime import datetime
from pathlib import Path
from unittest import mock

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("GOOGLE_CLIENT_ID", "dummy")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("COC_API_TOKEN", "dummy")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from coclib.config import MessagesTestConfig
from coclib.extensions import db
from messages import models
from messages.app import create_app, socketio, API_PREFIX
from messages.services import publisher
from coclib.models import User, ChatGroup, ChatGroupMember


def fake_verify(token, request, client_id):
    return {"sub": "abc", "email": "u@example.com", "name": "U"}


def fake_publish(channel: str, content: str, user_id: int) -> models.ChatMessage:
    msg = models.ChatMessage(channel=channel, user_id=user_id, content=content, ts=datetime.utcnow())
    publisher._broadcast(msg)
    return msg


def main() -> None:

    app = create_app(MessagesTestConfig)
    socketio.sockio_mw.engineio_path = "/socket.io/"
    client = app.test_client()
    with app.app_context():
        db.create_all()
        db.session.add_all([
            User(id=1, sub="abc", email="u@example.com", name="U"),
            ChatGroup(id=1, name="g"),
            ChatGroupMember(group_id=1, user_id=1),
        ])
        db.session.commit()

    with (
        mock.patch("messages.app.id_token.verify_oauth2_token", fake_verify),
        mock.patch("messages.services.publisher.publish_message", fake_publish),
        mock.patch("messages.app.api.publish_message", fake_publish),
        mock.patch("messages.app.graphql.publish_message", fake_publish),
        mock.patch("messages.services.publisher.verify_group_member", return_value=True),
        mock.patch("messages.app.api.verify_group_member", return_value=True),
        mock.patch("messages.app.graphql.verify_group_member", return_value=True),
    ):
        sio_client = socketio.test_client(
            app,
            namespace=f"{API_PREFIX}/chat",
            query_string="groupId=1&token=t",
            flask_test_client=client,
        )
        resp = client.post(
            f"{API_PREFIX}/chat/publish",
            json={"groupId": "1", "text": "hello"},
            headers={"Authorization": "Bearer t"},
        )
        assert resp.status_code == 200
        received = sio_client.get_received(f"{API_PREFIX}/chat")
        sio_client.disconnect(f"{API_PREFIX}/chat")
        assert received[0]["name"] == "message"
        assert received[0]["args"]["content"] == "hello"


if __name__ == "__main__":
    main()
