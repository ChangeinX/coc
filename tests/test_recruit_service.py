import importlib.util
import pathlib
import sys
import pytest
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import Clan, RecruitPost  # noqa: E402


base_dir = pathlib.Path(__file__).resolve().parents[1] / "recruiting-py"
app_spec = importlib.util.spec_from_file_location(
    "recruit_app", base_dir / "app" / "__init__.py", submodule_search_locations=[str(base_dir / "app")]
)
recruit_app = importlib.util.module_from_spec(app_spec)
sys.modules["recruit_app"] = recruit_app
app_spec.loader.exec_module(recruit_app)  # type: ignore[arg-type]
create_app = recruit_app.create_app
service_spec = importlib.util.spec_from_file_location(
    "recruit_service", base_dir / "app" / "services" / "recruit_service.py"
)
recruit_service = importlib.util.module_from_spec(service_spec)
service_spec.loader.exec_module(recruit_service)  # type: ignore[arg-type]


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
                "warLeague": {"name": "Gold"},
                "labels": [1],
            },
        )
        db.session.add(clan)
        recruit_service.create_post(clan_tag="TAG", call_to_action="desc")
        items, _ = recruit_service.list_posts(None, {})
        assert items[0]["clan"]["tag"] == "TAG"
        assert items[0]["clan"]["members"] == 40
        assert items[0]["clan"]["name"] == "N"
        assert items[0]["clan"]["warLeague"]["name"] == "Gold"

