import pathlib
import sys
from unittest.mock import Mock

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app
from coclib.config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    GOOGLE_CLIENT_ID = "dummy"


def test_proxy_public(monkeypatch):
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()

    mocked = Mock()
    mocked.status_code = 200
    mocked.content = b"img"
    mocked.headers = {"Content-Type": "image/png"}
    monkeypatch.setattr("app.api.asset_routes.requests.get", lambda *a, **k: mocked)

    url = "https://api-assets.clashofclans.com/foo.png"
    resp = client.get(f"/api/v1/assets?url={url}")
    assert resp.status_code == 200
    assert resp.data == b"img"
    assert resp.headers["Content-Type"] == "image/png"
