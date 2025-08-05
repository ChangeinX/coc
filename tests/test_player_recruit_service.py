import importlib.util
import pathlib
import sys
import pytest

from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import PlayerRecruitPost, User  # noqa: E402

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


def test_create_player_post():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        user = User(id=1, sub="abc", email="u@example.com", name="U", player_tag="TAG")
        db.session.add(user)
        recruit_service.create_player_post(user_id=1, description="desc")
        post = PlayerRecruitPost.query.filter_by(description="desc").one_or_none()
        assert post is not None


def test_create_player_post_missing_user():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        with pytest.raises(ValueError):
            recruit_service.create_player_post(user_id=1, description="desc")


def test_list_player_posts():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        user = User(id=1, sub="abc", email="u@example.com", name="N", player_tag="TAG")
        db.session.add(user)
        recruit_service.create_player_post(user_id=1, description="desc")
        items, _ = recruit_service.list_player_posts(None, {})
        assert items[0]["name"] == "N"
        assert items[0]["tag"] == "TAG"
        assert items[0]["description"] == "desc"
