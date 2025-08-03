import pathlib
import sys
from datetime import datetime

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app  # noqa: E402
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import User, PlayerRecruitPost  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


def test_player_recruit_post_table_creation():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com"))
        db.session.add(
            PlayerRecruitPost(
                id=1,
                user_id=1,
                description="Looking for a clan",
                league="Gold",
                language="EN",
                war="Always",
                created_at=datetime.utcnow(),
            )
        )
        db.session.commit()
        assert PlayerRecruitPost.query.count() == 1
