import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app  # noqa: E402
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import RecruitPost  # noqa: E402
from app.services import recruit_service  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def test_create_post():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        recruit_service.create_post(
            clan_tag="TAG",
            call_to_action="desc",
        )
        post = RecruitPost.query.filter_by(call_to_action="desc").one_or_none()
        assert post is not None
