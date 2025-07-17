import json
import logging
import os
from datetime import datetime

import boto3
import httpx
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from coclib.models import ChatGroupMember
from messages import models

logger = logging.getLogger(__name__)

session = boto3.Session(region_name=os.getenv("AWS_REGION", "us-east-1"))
dynamodb = session.resource("dynamodb")
table = dynamodb.Table(os.getenv("MESSAGES_TABLE", "chat_messages"))


def verify_group_member(user_id: int, group_id: str) -> bool:
    """Return ``True`` if *user_id* belongs to *group_id*."""
    row = ChatGroupMember.query.filter_by(user_id=user_id, group_id=int(group_id)).first()
    return row is not None


def _publish_to_appsync(channel: str, payload: dict) -> None:
    url = os.getenv("APPSYNC_EVENTS_URL")
    if not url:
        logger.info("APPSYNC_EVENTS_URL not configured, skipping publish")
        return
    region = os.getenv("AWS_REGION", session.region_name or "us-east-1")
    request = AWSRequest("POST", url, data=json.dumps({"channels": [channel], "message": payload}))
    SigV4Auth(session.get_credentials(), "appsync", region).add_auth(request)
    httpx.post(url, content=request.body, headers=dict(request.headers))


def publish_message(group_id: str, text: str, user_id: int) -> models.ChatMessage:
    ts = datetime.utcnow()
    msg = models.ChatMessage(group_id=group_id, user_id=user_id, text=text, ts=ts)
    logger.info("Publishing message: %s", msg)
    table.put_item(
        Item={
            "group_id": group_id,
            "ts": ts.isoformat(),
            "user_id": str(user_id),
            "text": text,
        }
    )
    _publish_to_appsync(f"/groups/{group_id}", {"text": text, "userId": user_id, "ts": ts.isoformat()})
    return msg
