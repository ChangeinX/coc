from flask import Blueprint, g

from ..services import invite_service

bp = Blueprint("invite", __name__)


@bp.post("/invite/<int:player_id>")
def invite(player_id: int):
    invite_service.send_invite(g.user.id, player_id)
    return ("", 204)
