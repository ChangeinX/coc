from sqlalchemy.dialects.postgresql import insert

from coclib.extensions import db
from coclib.models import Player
from coclib.utils import normalize_tag


def upsert_player(data: dict):
    stmt = insert(Player).values(
        tag=normalize_tag(data["tag"]),
        name=data["name"],
        town_hall=data["townHallLevel"],
        role=data.get("role"),
        clan_tag=normalize_tag(data.get("clan", {}).get("tag", "")),
        data=data,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[Player.tag],
        set_={
            "name": stmt.excluded.name,
            "town_hall": stmt.excluded.town_hall,
            "role": stmt.excluded.role,
            "clan_tag": stmt.excluded.clan_tag,
            "data": stmt.excluded.data,
            "updated_at": db.func.now(),
        },
    )
    db.session.execute(stmt)
