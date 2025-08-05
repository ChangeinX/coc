import importlib.util
import pathlib
import sys
from datetime import datetime, timedelta

from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import PlayerRecruitPost, User  # noqa: E402

base_dir = pathlib.Path(__file__).resolve().parents[1] / "recruiting-py"
app_spec = importlib.util.spec_from_file_location(
    "recruit_app", base_dir / "app" / "__init__.py", submodule_search_locations=[str(base_dir / "app")]
)
recruit_app = importlib.util.module_from_spec(app_spec)
sys.modules["recruit_app"] = recruit_app
app_spec.loader.exec_module(recruit_app)  # type: ignore[arg-type]
create_app = recruit_app.create_app


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        recruit_app.jwt, "decode", lambda t, key, algorithms: {"sub": "abc"}
    )


def _setup_app(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client = app.test_client()
    with app.app_context():
        db.create_all()
        user = User(
            id=1,
            sub="abc",
            email="u@example.com",
            name="U",
            player_tag="TAG",
        )
        db.session.add(user)
        now = datetime.utcnow()
        posts = [
            PlayerRecruitPost(
                id=i + 1,
                user_id=1,
                description="desc",
                created_at=now - timedelta(minutes=i),
            )
            for i in range(150)
        ]
        db.session.add_all(posts)
        db.session.commit()
    return app, client


def test_player_recruit_pagination_and_filtering(monkeypatch):
    app, client = _setup_app(monkeypatch)
    resp = client.get(
        "/api/v1/recruiting/player-recruit",
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["items"]) == 100
    assert data["nextCursor"] == "100"
    assert data["items"][0]["name"] == "U"
    resp2 = client.get(
        f"/api/v1/recruiting/player-recruit?pageCursor={data['nextCursor']}",
        headers={"Authorization": "Bearer t"},
    )
    data2 = resp2.get_json()
    assert len(data2["items"]) == 50
    assert data2["nextCursor"] is None
    resp3 = client.get(
        "/api/v1/recruiting/player-recruit?q=desc",
        headers={"Authorization": "Bearer t"},
    )
    data3 = resp3.get_json()
    assert len(data3["items"]) == 100
    assert data3["nextCursor"] == "100"


def test_create_player_recruit_post(monkeypatch):
    app, client = _setup_app(monkeypatch)
    payload = {"description": "desc"}
    resp = client.post(
        "/api/v1/recruiting/player-recruit",
        json=payload,
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 201
    with app.app_context():
        post = PlayerRecruitPost.query.get(151)
        assert post is not None
        assert post.user_id == 1
