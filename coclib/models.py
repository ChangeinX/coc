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
    is_verified = db.Column(db.Boolean, nullable=False, default=False)


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), unique=True, nullable=False)
    risk_weight_war = db.Column(db.Float, nullable=False, default=0.40)
    risk_weight_idle = db.Column(db.Float, nullable=False, default=0.35)
    risk_weight_don_deficit = db.Column(db.Float, nullable=False, default=0.15)
    risk_weight_don_drop = db.Column(db.Float, nullable=False, default=0.10)
    is_leader = db.Column(db.Boolean, nullable=False, default=False)
    all_features = db.Column(db.Boolean, nullable=False, default=False)

    user = db.relationship("User", backref=db.backref("profile", uselist=False))
    features = db.relationship(
        "FeatureFlag",
        secondary="user_profile_features",
        backref="profiles",
    )


user_profile_features = db.Table(
    "user_profile_features",
    db.Column("profile_id", db.BigInteger, db.ForeignKey("user_profiles.id"), primary_key=True),
    db.Column("feature_id", db.BigInteger, db.ForeignKey("feature_flags.id"), primary_key=True),
)


class FeatureFlag(db.Model):
    __tablename__ = "feature_flags"

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)




class ChatGroup(db.Model):
    __tablename__ = "chat_groups"

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100))


class ChatGroupMember(db.Model):
    __tablename__ = "chat_group_members"

    group_id = db.Column(db.BigInteger, db.ForeignKey("chat_groups.id"), primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), primary_key=True)

    group = db.relationship("ChatGroup", backref=db.backref("members", lazy="dynamic"))
    user = db.relationship("User", backref=db.backref("chat_groups", lazy="dynamic"))


class FriendRequest(db.Model):
    __tablename__ = "friend_requests"

    id = db.Column(db.BigInteger, primary_key=True)
    from_user_id = db.Column(db.BigInteger, index=True)
    to_user_id = db.Column(db.BigInteger, index=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)



class PushSubscription(db.Model):
    __tablename__ = "push_subscriptions"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    endpoint = db.Column(db.Text, unique=True, nullable=False)
    p256dh_key = db.Column(db.Text, nullable=False)
    auth_key = db.Column(db.Text, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship("User", backref=db.backref("push_subscriptions", lazy="dynamic"))

    __table_args__ = (db.Index("ix_push_subscriptions_user_id", "user_id"),)


class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    refresh_token_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    ip = db.Column(db.String(50))
    user_agent = db.Column(db.String(255))

    user = db.relationship("User", backref=db.backref("sessions", lazy="dynamic"))


class Legal(db.Model):
    """Track user acceptance of the Terms of Service."""

    __tablename__ = "legal"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    accepted = db.Column(db.Boolean, nullable=False, default=False)
    version = db.Column(db.String(20), nullable=False, default="20250729")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("legal_records", lazy="dynamic"))

