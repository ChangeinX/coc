from datetime import datetime
from app.extensions import db


class ClanSnapshot(db.Model):
    __tablename__ = "clan_snapshots"
    id = db.Column(db.BigInteger, primary_key=True)
    ts = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    clan_tag = db.Column(db.String(15), index=True)
    name = db.Column(db.String(50))
    member_count = db.Column(db.Integer)
    level = db.Column(db.Integer)
    war_wins = db.Column(db.Integer)
    war_losses = db.Column(db.Integer)

    __table_args__ = (db.UniqueConstraint("clan_tag", "ts", name="uq_clan_ts"),)


class PlayerSnapshot(db.Model):
    __tablename__ = "player_snapshots"
    id = db.Column(db.BigInteger, primary_key=True)
    ts = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    player_tag = db.Column(db.String(15), index=True)
    clan_tag = db.Column(db.String(15), index=True)
    name = db.Column(db.String(50))
    role = db.Column(db.String(20))
    town_hall = db.Column(db.Integer)
    trophies = db.Column(db.Integer)
    donations = db.Column(db.Integer)
    donations_received = db.Column(db.Integer)
    war_attacks_used = db.Column(db.Integer)
    last_seen = db.Column(db.DateTime, index=True)

    __table_args__ = (db.UniqueConstraint("player_tag", "ts", name="uq_player_ts"),)


class Player(db.Model):
    __tablename__ = "players"
    tag = db.Column(db.String(15), primary_key=True)
    name = db.Column(db.String(50))
    town_hall = db.Column(db.Integer)
    role = db.Column(db.String(20))
    clan_tag = db.Column(db.String(15), index=True)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
