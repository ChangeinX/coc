import importlib.util
import pathlib
import sys
from datetime import datetime, timedelta

from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import User, RecruitPost, RecruitJoin, Clan  # noqa: E402


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
            player_tag="AAA",
        )
        clan = Clan(
            tag="TAG",
            deep_link="link",
            data={
                "name": "N",
                "members": 40,
                "description": "D",
                "chatLanguage": {"name": "English"},
                "warFrequency": "always",
                "labels": [1],
            },
        )
        db.session.add_all([user, clan])
        now = datetime.utcnow()
        posts = [
            RecruitPost(
                id=i + 1,
                clan_tag="TAG",
                call_to_action="desc",
                created_at=now - timedelta(minutes=i),
            )
            for i in range(150)
        ]
        db.session.add_all(posts)
        db.session.commit()
    return app, client


def test_recruit_pagination_and_filtering(monkeypatch):
    app, client = _setup_app(monkeypatch)
    resp = client.get(
        "/api/v1/recruiting/recruit", headers={"Authorization": "Bearer t"}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["items"]) == 100
    assert data["nextCursor"] == "100"
    assert data["items"][0]["data"]["clan"]["tag"] == "TAG"
    assert data["items"][0]["data"]["clan"]["members"] == 40

    resp2 = client.get(
        f"/api/v1/recruiting/recruit?pageCursor={data['nextCursor']}",
        headers={"Authorization": "Bearer t"},
    )
    data2 = resp2.get_json()
    assert len(data2["items"]) == 50
    assert data2["nextCursor"] is None

    resp3 = client.get(
        "/api/v1/recruiting/recruit?q=desc",
        headers={"Authorization": "Bearer t"},
    )
    data3 = resp3.get_json()
    assert len(data3["items"]) == 100
    assert data3["nextCursor"] == "100"


def test_recruit_sorting(monkeypatch):
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
            player_tag="AAA",
        )
        clan = Clan(tag="TAG", deep_link="link", data={"members": 40})
        db.session.add_all([user, clan])
        old = RecruitPost(
            id=1,
            clan_tag="TAG",
            call_to_action="old",
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        new = RecruitPost(
            id=2,
            clan_tag="TAG",
            call_to_action="new",
            created_at=datetime.utcnow(),
        )
        db.session.add_all([old, new])
        db.session.commit()
    resp = client.get(
        "/api/v1/recruiting/recruit", headers={"Authorization": "Bearer t"}
    )
    data = resp.get_json()
    assert data["items"][0]["callToAction"] == "new"


def test_join_records_request(monkeypatch):
    app, client = _setup_app(monkeypatch)
    with app.app_context():
        post_id = db.session.query(RecruitPost.id).first()[0]
    resp = client.post(
        f"/api/v1/recruiting/join/{post_id}", headers={"Authorization": "Bearer t"}
    )
    assert resp.status_code == 204
    with app.app_context():
        jr = RecruitJoin.query.filter_by(post_id=post_id, user_id=1).one_or_none()
        assert jr is not None


def test_create_recruit_post(monkeypatch):
    app, client = _setup_app(monkeypatch)
    payload = {"callToAction": "desc", "clanTag": "TAG"}
    resp = client.post(
        "/api/v1/recruiting/recruit",
        json=payload,
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 201
    with app.app_context():
        post = RecruitPost.query.get(151)
        assert post is not None

