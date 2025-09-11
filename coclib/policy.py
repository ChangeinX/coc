from __future__ import annotations
# no-op: pre-commit python path test

from datetime import datetime, timedelta
from typing import Dict, Iterable

from coclib.extensions import db
from .models import BlockedUser, ModerationRecord, ModerationRule


class PolicyEngine:
    """Evaluate moderation events against database-driven rules."""

    def __init__(self, session: db.session.__class__):
        self.session = session

    def load_rules(self) -> Iterable[ModerationRule]:
        return self.session.query(ModerationRule).filter_by(active=True).all()

    def apply(self, record: ModerationRecord) -> None:
        for rule in self.load_rules():
            cfg: Dict = rule.definition or {}
            rtype = cfg.get("type")
            if rtype == "category_threshold":
                cat = cfg.get("category")
                threshold = cfg.get("threshold", 1.0)
                score = record.categories.get(cat, 0)
                if score >= threshold:
                    self._block(record.user_id, cfg)
            elif rtype == "category_any":
                threshold = cfg.get("threshold", 1.0)
                if any(v >= threshold for v in record.categories.values()):
                    self._mute(record.user_id, cfg)
            elif rtype == "toxicity_warning":
                min_v = cfg.get("min", 0.0)
                max_v = cfg.get("max", 1.0)
                tox = record.categories.get("toxicity", 0)
                if min_v <= tox < max_v:
                    record.action_taken = "toast"
            elif rtype == "duplicate":
                window = int(cfg.get("window", 10))
                since = datetime.utcnow() - timedelta(seconds=window)
                dup = (
                    self.session.query(ModerationRecord)
                    .filter(
                        ModerationRecord.user_id == record.user_id,
                        ModerationRecord.content == record.content,
                        ModerationRecord.created_at >= since,
                    )
                    .first()
                )
                if dup is not None:
                    self._readonly(record.user_id, cfg)
        self.session.commit()

    def _block(self, user_id: str, cfg: Dict) -> None:
        user = self.session.get(BlockedUser, user_id) or BlockedUser(user_id=user_id)
        user.permanent = True
        user.reason = cfg.get("reason", "policy")
        user.created_at = datetime.utcnow()
        self.session.merge(user)

    def _mute(self, user_id: str, cfg: Dict) -> None:
        duration = int(cfg.get("duration", 86400))
        user = self.session.get(BlockedUser, user_id) or BlockedUser(user_id=user_id)
        user.until = datetime.utcnow() + timedelta(seconds=duration)
        user.reason = cfg.get("reason", "mute")
        user.permanent = False
        self.session.merge(user)

    def _readonly(self, user_id: str, cfg: Dict) -> None:
        duration = int(cfg.get("duration", 600))
        user = self.session.get(BlockedUser, user_id) or BlockedUser(user_id=user_id)
        user.until = datetime.utcnow() + timedelta(seconds=duration)
        user.reason = cfg.get("reason", "readonly")
        user.permanent = False
        self.session.merge(user)
