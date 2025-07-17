import pathlib
import sys
from datetime import datetime, timedelta

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))

from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, ChatGroup, ChatGroupMember
from coclib.services.loyalty_service import ensure_membership


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_chat_membership_added_and_removed():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        user = User(id=1, sub="s", email="u@example.com", name="U", player_tag="P1", is_verified=True)
        db.session.add(user)
        db.session.commit()

        now = datetime.utcnow()
        ensure_membership("P1", "CLN", now)

        group = ChatGroup.query.filter_by(name="CLN").one()
        assert ChatGroupMember.query.filter_by(user_id=user.id, group_id=group.id).count() == 1

        ensure_membership("P1", None, now + timedelta(minutes=1))
        assert ChatGroupMember.query.filter_by(user_id=user.id).count() == 0


def test_chat_membership_moves_clan():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        user = User(id=1, sub="s", email="u@example.com", name="U", player_tag="P1", is_verified=True)
        db.session.add(user)
        db.session.commit()

        now = datetime.utcnow()
        ensure_membership("P1", "CLN1", now)
        group1 = ChatGroup.query.filter_by(name="CLN1").one()
        ensure_membership("P1", "CLN2", now + timedelta(minutes=1))
        group2 = ChatGroup.query.filter_by(name="CLN2").one()

        assert ChatGroupMember.query.filter_by(user_id=user.id, group_id=group2.id).count() == 1
        assert ChatGroupMember.query.filter_by(user_id=user.id, group_id=group1.id).count() == 0

