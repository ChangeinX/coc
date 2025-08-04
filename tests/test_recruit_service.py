import sys
import pathlib
import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app  # noqa: E402
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import Clan, RecruitPost  # noqa: E402
from app.services import recruit_service  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def test_create_post():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        clan = Clan(
            tag="TAG",
            deep_link="link",
            data={"name": "N", "members": 40, "chatLanguage": {"name": "English"}},
        )
        db.session.add(clan)
        db.session.commit()
        recruit_service.create_post(
            clan_tag="TAG",
            call_to_action="desc",
        )
        post = RecruitPost.query.filter_by(call_to_action="desc").one_or_none()
        assert post is not None


def test_create_post_missing_clan():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        with pytest.raises(ValueError):
            recruit_service.create_post(clan_tag="MISSING", call_to_action=None)


def test_list_posts():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        clan = Clan(
            tag="TAG",
            deep_link="link",
            data={
                "name": "N",
                "members": 40,
                "description": "D",
                "chatLanguage": {"name": "English"},
                "warFrequency": "always",
                "labels": [1],
            },
        )
        db.session.add(clan)
        recruit_service.create_post(clan_tag="TAG", call_to_action="desc")
        items, _ = recruit_service.list_posts(None, {})
        assert items[0]["tag"] == "TAG"
        assert items[0]["openSlots"] == 10
