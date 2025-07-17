from dataclasses import dataclass
from datetime import datetime


@dataclass
class ChatMessage:
    """Simple schema stored in DynamoDB."""

    channel: str
    user_id: int
    content: str
    ts: datetime
