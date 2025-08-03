import sys
import pathlib

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app  # noqa: E402
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import User, Invite  # noqa: E402
from app.services import invite_service  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def _mock_verify(monkeypatch):
    monkeypatch.setattr("app.jwt.decode", lambda t, key, algorithms: {"sub": "abc"})


def _setup_app(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        u1 = User(id=1, sub="abc", email="u@example.com", name="U", player_tag="AAA")
        u2 = User(id=2, sub="def", email="v@example.com", name="V", player_tag="BBB")
        db.session.add_all([u1, u2])
        db.session.commit()
    return app, client


def test_invite_creates_record_and_notifies(monkeypatch):
    app, client = _setup_app(monkeypatch)
    called = {}
    monkeypatch.setattr(
        invite_service,
        "send_invite_notification",
        lambda uid: called.setdefault("uid", uid),
    )
    resp = client.post("/invite/2", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 204
    assert called.get("uid") == 2
    with app.app_context():
        inv = Invite.query.filter_by(from_user_id=1, to_user_id=2).one_or_none()
        assert inv is not None
