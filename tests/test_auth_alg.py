import pathlib
import sys
import jwt
from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config
from coclib.extensions import db
from coclib.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "supersecretkeylongerthan32bytes!"


def _make_token(key: str) -> str:
    return jwt.encode({"sub": "abc"}, key, algorithm="HS512")


# NOTE: /user/me endpoint migrated to Java user_service
# def test_hs512_token(monkeypatch):
#     Flask /user/me endpoint has been migrated to Java user_service
#     This test is no longer applicable to the Flask backend
