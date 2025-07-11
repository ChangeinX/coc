from __future__ import annotations

from datetime import datetime
from typing import Dict

from app.extensions import db
from app.models import LoyaltyMembership
from app.utils import normalize_tag

__all__ = [
    "ensure_membership",
    "get_player_loyalty",
    "get_clan_loyalty",
]


def ensure_membership(player_tag: str, current_clan_tag: str | None, ts: datetime) -> None:
    """Create/close :class:`LoyaltyMembership` rows for *player_tag*.

    Call this *once* each time you persist a :class:`PlayerSnapshot` so that the
    membership table reflects reality.
    """

    player_tag = normalize_tag(player_tag)
    current_clan_tag = normalize_tag(current_clan_tag or "")

    # The most recent open membership (if any)
    active: LoyaltyMembership | None = (
        LoyaltyMembership.query.filter_by(player_tag=player_tag, left_at=None)
        .order_by(LoyaltyMembership.joined_at.desc())
        .first()
    )

    # ---- Player is currently clan‑less
    if not current_clan_tag:
        if active:
            active.left_at = ts
            db.session.add(active)
            db.session.commit()
        return

    if active is None or active.clan_tag != current_clan_tag:
        # Close the previous open row (if any)
        if active:
            active.left_at = ts
            db.session.add(active)
            db.session.flush()

        # Open a new membership row for the new clan
        new_row = LoyaltyMembership(
            player_tag=player_tag,
            clan_tag=current_clan_tag,
            joined_at=ts,
        )
        db.session.add(new_row)
        db.session.commit()


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_player_loyalty(player_tag: str, clan_tag: str | None = None) -> int:
    """Return **whole days** the player has spent in *clan_tag* (defaults to current).

    If the player has never been observed in *clan_tag*, the function returns ``0``.
    """

    player_tag = normalize_tag(player_tag)
    qry = LoyaltyMembership.query.filter_by(player_tag=player_tag)

    if clan_tag:
        qry = qry.filter_by(clan_tag=normalize_tag(clan_tag))
    else:
        qry = qry.filter_by(left_at=None)  # current clan only

    membership: LoyaltyMembership | None = qry.order_by(LoyaltyMembership.joined_at.desc()).first()
    if membership is None:
        return 0

    ref = membership.left_at or datetime.utcnow()
    return (ref - membership.joined_at).days


def get_clan_loyalty(clan_tag: str) -> Dict[str, int]:
    """Return ``{player_tag: days_in_clan}`` for all *current* clan members."""

    clan_tag = normalize_tag(clan_tag)
    rows = LoyaltyMembership.query.filter_by(clan_tag=clan_tag, left_at=None).all()
    now = datetime.utcnow()
    return {r.player_tag: (now - r.joined_at).days for r in rows}