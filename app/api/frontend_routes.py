from flask import Blueprint, render_template
from app.services.clan_service import get_clan
from app.services.risk_service import clan_at_risk
from app.utils import normalize_tag

bp = Blueprint("front", __name__)


def _merge_risk(member_list: list[dict], risk_list: list[dict]) -> list[dict]:
    rmap = {r["player_tag"]: r["risk_score"] for r in risk_list}
    for m in member_list:
        m["risk_score"] = rmap.get(m["tag"].lstrip("#").upper(), 0)
    return member_list


@bp.get("/dashboard/")
@bp.get("/dashboard/<string:tag>")
async def dash(tag: str | None = None):
    ctx = {"tag": tag}
    if tag:
        try:
            clan = await get_clan(tag)
            risk = await clan_at_risk(normalize_tag(tag))
            members = _merge_risk(clan.get("memberList", []), risk)

            # expose top-N risk separately for convenience
            top_risk = sorted(members, key=lambda m: m["risk_score"], reverse=True)[:10]

            ctx.update(clan=clan, members=members, top_risk=top_risk)
        except Exception as e:
            ctx["error"] = str(e)
    return render_template("dashboard.html", **ctx)
