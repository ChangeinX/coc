import importlib.util
import pathlib
import sys
from datetime import datetime

base_dir = pathlib.Path(__file__).resolve().parents[1] / "recruiting-py"
app_spec = importlib.util.spec_from_file_location(
    "recruit_app", base_dir / "app" / "__init__.py", submodule_search_locations=[str(base_dir / "app")]
)
recruit_app = importlib.util.module_from_spec(app_spec)
sys.modules["recruit_app"] = recruit_app
app_spec.loader.exec_module(recruit_app)  # type: ignore[arg-type]
create_app = recruit_app.create_app
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
