import pathlib
import sys

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, FeatureFlag, UserProfile


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "app.jwt.decode",
        lambda t, key, algorithms: {"sub": "abc"},
    )


def setup_app(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add_all(
            [FeatureFlag(id=i + 1, name=n) for i, n in enumerate(["x", "y", "z"])]
        )
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.add(UserProfile(id=1, user_id=1))
        db.session.commit()
    return app


# NOTE: Feature flag endpoints migrated to Java user_service
# def test_update_and_get_features(monkeypatch):
#     Flask feature flag endpoints have been migrated to Java user_service
#     These tests are no longer applicable to the Flask backend
