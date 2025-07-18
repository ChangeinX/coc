import json
import logging
from datetime import datetime

import boto3
import httpx
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from boto3.dynamodb.conditions import Key
from flask import current_app
from coclib.models import ChatGroup, ChatGroupMember
from messages import models

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


def _publish_to_appsync(channel: str, user_id: int, content: str) -> None:
    url = current_app.config.get("APPSYNC_EVENTS_URL")
    if not url:
        logger.info("APPSYNC_EVENTS_URL not configured, skipping publish")
        return
    logger.info("Publishing to AppSync URL: %s", url)
    region = current_app.config.get("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)

    payload = {
        "operationName": "SendMessage",
        "query": (
            "mutation SendMessage($channel: String!, $userId: String!, $content: String!) "
            "{ sendMessage(channel: $channel, userId: $userId, content: $content) "
            "{ channel ts userId content } }"
        ),
        "variables": {
            "channel": channel,
            "userId": str(user_id),
            "content": content,
        },
    }

    request = AWSRequest("POST", url, data=json.dumps(payload))
    SigV4Auth(session.get_credentials(), "appsync", region).add_auth(request)
    httpx.post(url, content=request.body, headers=dict(request.headers))


def publish_message(channel: str, content: str, user_id: int) -> models.ChatMessage:
    ts = datetime.utcnow()
    msg = models.ChatMessage(channel=channel, user_id=user_id, content=content, ts=ts)
    logger.info("Publishing message: %s", msg)
    region = current_app.config.get("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)
    dynamodb = session.resource("dynamodb")
    table_name = current_app.config.get("MESSAGES_TABLE", "chat_messages")
    table = dynamodb.Table(table_name)
    table.put_item(
        Item={
            "channel": channel,
            "ts": ts.isoformat(),
            "userId": str(user_id),
            "content": content,
        }
    )
    _publish_to_appsync(channel, user_id, content)
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
