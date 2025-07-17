from dataclasses import dataclass
from datetime import datetime


@dataclass
class ChatMessage:
    """Simple schema stored in DynamoDB."""

    group_id: str
    user_id: int
    text: str
    ts: datetime
