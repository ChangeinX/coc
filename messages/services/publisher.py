import json
import logging
from datetime import datetime

import boto3
import httpx
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from flask import current_app
from coclib.models import ChatGroupMember
from messages import models

logger = logging.getLogger(__name__)


def verify_group_member(user_id: int, group_id: str) -> bool:
    """Return ``True`` if *user_id* belongs to *group_id*."""
    row = ChatGroupMember.query.filter_by(user_id=user_id, group_id=int(group_id)).first()
    return row is not None


def _publish_to_appsync(channel: str, payload: dict) -> None:
    url = current_app.config.get("APPSYNC_EVENTS_URL")
    if not url:
        logger.info("APPSYNC_EVENTS_URL not configured, skipping publish")
        return

    # ensure the URL points to /event
    if url.endswith("/graphql"):
        url = url[:-len("/graphql")] + "/event"
    elif not url.endswith("/event"):
        url = url.rstrip("/") + "/event"

    region = current_app.config.get("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)

    body = {
        "channel": channel,
        "events": [json.dumps(payload)]
    }

    request = AWSRequest("POST", url, data=json.dumps(body))
    SigV4Auth(session.get_credentials(), "appsync", region).add_auth(request)
    headers = dict(request.headers)

    headers["Content-Type"] = "application/json"
    httpx.post(url, content=request.body, headers=headers)


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
    _publish_to_appsync(f"/groups/{channel}", {"content": content, "userId": user_id, "ts": ts.isoformat()})
    return msg
