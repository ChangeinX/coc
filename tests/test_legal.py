import sys
import pathlib
from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User, Legal


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"
    LEGAL_VERSION = "20250729"


def setup_app(monkeypatch):
    monkeypatch.setattr("app.jwt.decode", lambda t, key, algorithms: {"sub": "abc"})
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add(User(id=1, sub="abc", email="u@example.com", name="U"))
        db.session.commit()
    return app


# NOTE: Legal endpoints migrated to Java user_service
# def test_accept_and_get_legal(monkeypatch):
#     Flask legal endpoints have been migrated to Java user_service
#     These tests are no longer applicable to the Flask backend

# NOTE: Legal endpoints migrated to Java user_service
# def test_requires_accept_on_version_change(monkeypatch):
#     Flask legal endpoints have been migrated to Java user_service
#     These tests are no longer applicable to the Flask backend


# NOTE: Disclaimer endpoints migrated to Java user_service  
# def test_disclaimer_endpoints(monkeypatch):
#     Flask disclaimer endpoints have been migrated to Java user_service
#     These tests are no longer applicable to the Flask backend
