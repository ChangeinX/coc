from __future__ import annotations

import logging
import os
from datetime import datetime

import requests

from coclib.extensions import db
from coclib.models import Invite

logger = logging.getLogger(__name__)
NOTIFICATIONS_URL = os.getenv(
    "NOTIFICATIONS_URL", "http://notifications:8080/api/v1/notifications"
)


def send_invite(from_user_id: int, to_user_id: int) -> None:
    inv = Invite(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        created_at=datetime.utcnow(),
    )
    db.session.add(inv)
    db.session.commit()
    send_invite_notification(to_user_id)


def send_invite_notification(user_id: int) -> None:
    url = f"{NOTIFICATIONS_URL}/invite/{user_id}"
    try:
        requests.post(url, timeout=5)
    except Exception:
        logger.warning("Failed to send invite notification for %s", user_id)
