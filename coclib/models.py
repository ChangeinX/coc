from datetime import datetime
from coclib.extensions import db


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
    data = db.Column(db.JSON)

    __table_args__ = (db.UniqueConstraint("clan_tag", "ts", name="uq_clan_ts"),)


class Clan(db.Model):
    __tablename__ = "clans"
    tag = db.Column(db.String(15), primary_key=True)
    data = db.Column(db.JSON)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )


class WarSnapshot(db.Model):
    __tablename__ = "war_snapshots"

    id = db.Column(db.BigInteger, primary_key=True)
    ts = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    clan_tag = db.Column(db.String(15), index=True)
    data = db.Column(db.JSON)  # full war JSON blob

    __table_args__ = (db.UniqueConstraint("clan_tag", "ts", name="uq_war_ts"),)


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
    data = db.Column(db.JSON)

    __table_args__ = (db.UniqueConstraint("player_tag", "ts", name="uq_player_ts"),)


class Player(db.Model):
    __tablename__ = "players"
    tag = db.Column(db.String(15), primary_key=True)
    name = db.Column(db.String(50))
    town_hall = db.Column(db.Integer)
    role = db.Column(db.String(20))
    clan_tag = db.Column(db.String(15), index=True)
    data = db.Column(db.JSON)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )


class LoyaltyMembership(db.Model):
    """Track how long a player has stayed in a particular clan."""

    __tablename__ = "clan_memberships"

    id = db.Column(db.BigInteger, primary_key=True)
    player_tag = db.Column(db.String(15), index=True)
    clan_tag = db.Column(db.String(15), index=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    left_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint(
            "player_tag",
            "clan_tag",
            "joined_at",
            name="uq_clan_membership",
        ),
    )


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.BigInteger, primary_key=True)
    sub = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    player_tag = db.Column(db.String(15), index=True)


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), unique=True, nullable=False)
    risk_weight_war = db.Column(db.Float, nullable=False, default=0.40)
    risk_weight_idle = db.Column(db.Float, nullable=False, default=0.35)
    risk_weight_don_deficit = db.Column(db.Float, nullable=False, default=0.15)
    risk_weight_don_drop = db.Column(db.Float, nullable=False, default=0.10)
    is_leader = db.Column(db.Boolean, nullable=False, default=False)

    user = db.relationship("User", backref=db.backref("profile", uselist=False))

