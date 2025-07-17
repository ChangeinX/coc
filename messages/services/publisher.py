import logging
from datetime import datetime

from messages import models

logger = logging.getLogger(__name__)


def verify_group_member(user_id: int, group_id: str) -> bool:
    """Placeholder group membership check."""
    return True


def publish_message(group_id: str, text: str, user_id: int) -> models.ChatMessage:
    msg = models.ChatMessage(group_id=group_id, user_id=user_id, text=text, ts=datetime.utcnow())
    logger.info("Publishing message: %s", msg)
    # In real implementation this would publish via AWS AppSync.
    return msg
