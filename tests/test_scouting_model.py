import pathlib
from datetime import datetime

from flask.testing import FlaskClient

import sys
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, Scouting


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


def test_scouting_table_creation():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="s", email="u@example.com"))
        db.session.add(
            Scouting(id=1, user_id=1, description={"msg": "hi"}, created_at=datetime.utcnow())
        )
        db.session.commit()
        assert Scouting.query.count() == 1

