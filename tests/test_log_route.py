import sys
import pathlib
from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))

from app import create_app
from coclib.config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_log_endpoint():
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    resp = client.post("/api/v1/log", json={"message": "hello"})
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}
