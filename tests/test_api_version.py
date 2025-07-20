import pathlib
import sys

from flask.testing import FlaskClient

for m in list(sys.modules):
    if m == "app" or m.startswith("app."):
        sys.modules.pop(m)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "user-service"))

from app import create_app
from coclib.config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_health_endpoint():
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_user_me_requires_version_prefix_and_auth():
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()

    # Endpoint without the prefix should not exist
    resp = client.options("/user/me")
    assert resp.status_code == 404

    # Versioned endpoint exists but requires authentication
    resp = client.get("/api/v1/user/me")
    assert resp.status_code == 401
