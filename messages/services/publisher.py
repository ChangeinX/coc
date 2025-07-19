import logging
from datetime import datetime

import socketio

import boto3
from boto3.dynamodb.conditions import Key
from flask import current_app
from coclib.models import ChatGroup, ChatGroupMember
from messages import models

_socketio: socketio.AsyncServer | None = None


def set_socketio(sio: socketio.AsyncServer) -> None:
    """Store the SocketIO instance for broadcasting."""
    global _socketio
    _socketio = sio


def _broadcast(msg: models.ChatMessage) -> None:
    """Emit ``msg`` to all connected clients for its channel."""
    if _socketio is None:
        return
    data = {
        "channel": msg.channel,
        "userId": msg.user_id,
        "content": msg.content,
        "ts": msg.ts.isoformat(),
    }
    _socketio.emit("message", data, namespace="/api/v1/chat", room=msg.channel)

logger = logging.getLogger(__name__)



def verify_group_member(user_id: int, group_id: str) -> bool:
    """Return ``True`` if *user_id* belongs to *group_id*.

    ``group_id`` may be the numeric group identifier or the clan tag
    associated with the chat group.
    """
    try:
        gid = int(group_id)
        row = ChatGroupMember.query.filter_by(user_id=user_id, group_id=gid).first()
    except ValueError:
        row = (
            ChatGroupMember.query.join(ChatGroup)
            .filter(ChatGroupMember.user_id == user_id, ChatGroup.name == group_id.upper())
            .first()
        )
    return row is not None


def publish_message(channel: str, content: str, user_id: int) -> models.ChatMessage:
    """Persist ``content`` to ``channel`` and broadcast the message."""
    logger.info("Publishing message: channel=%s user=%s", channel, user_id)

    region = current_app.config.get("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)
    dynamodb = session.resource("dynamodb")
    table_name = current_app.config.get("MESSAGES_TABLE", "chat_messages")
    table = dynamodb.Table(table_name)

    ts = datetime.utcnow()
    table.put_item(
        Item={
            "channel": channel,
            "ts": ts.isoformat(),
            "userId": str(user_id),
            "content": content,
        }
    )

    msg = models.ChatMessage(channel=channel, user_id=user_id, content=content, ts=ts)
    _broadcast(msg)
    return msg


def fetch_recent_messages(channel: str, limit: int = 100) -> list[models.ChatMessage]:
    """Return up to ``limit`` recent messages for ``channel`` in chronological order."""
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 100
    limit = min(limit, 100)

    region = current_app.config.get("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)
    dynamodb = session.resource("dynamodb")
    table_name = current_app.config.get("MESSAGES_TABLE", "chat_messages")
    table = dynamodb.Table(table_name)

    resp = table.query(
        KeyConditionExpression=Key("channel").eq(channel),
        Limit=limit,
        ScanIndexForward=False,
    )

    items = resp.get("Items", [])
    messages: list[models.ChatMessage] = []
    for item in reversed(items):
        ts = datetime.fromisoformat(item["ts"])
        messages.append(
            models.ChatMessage(
                channel=item["channel"],
                user_id=int(item.get("userId", "0")),
                content=item.get("content", ""),
                ts=ts,
            )
        )
    return messages
