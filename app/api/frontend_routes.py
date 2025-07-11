import logging

from flask import Blueprint, render_template
from app.services.clan_service import get_clan
from app.services.risk_service import clan_at_risk
from app.services.loyalty_service import get_player_loyalty
from app.utils import normalize_tag

bp = Blueprint("front", __name__)
logger = logging.getLogger(__name__)


def _merge_risk(members: list[dict], risk: list[dict]) -> list[dict]:
    rmap = {r["player_tag"]: r for r in risk}
    for m in members:
        info = rmap.get(m["tag"].lstrip("#").upper())
        if info:
            m["risk_score"] = info["risk_score"]
            m["last_seen"] = info["last_seen"]
        else:
            m["risk_score"] = 0
            m["last_seen"] = None
        m["loyalty"] = get_player_loyalty(m["tag"])
    return members


DEFAULT_TAG = "UV0YR2Q8"


@bp.get("/", defaults={"tag": DEFAULT_TAG})
@bp.get("/dashboard/", defaults={"tag": DEFAULT_TAG})
@bp.get("/dashboard/<string:tag>")
async def dash(tag: str | None = None):
    ctx = {"tag": tag}
    if tag:
        try:
            clan = await get_clan(tag)
            risk = await clan_at_risk(normalize_tag(tag))
            members = _merge_risk(clan.get("memberList", []), risk)
            logger.info(f"Found {len(members)} members in clan {tag}")

            # expose top-N risk separately for convenience
            top_risk = sorted(members, key=lambda m: m["risk_score"], reverse=True)[:10]

            ctx.update(clan=clan, members=members, top_risk=top_risk)
        except Exception as e:
            ctx["error"] = str(e)
    return render_template("dashboard.html", **ctx)
