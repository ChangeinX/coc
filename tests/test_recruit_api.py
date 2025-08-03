import sys
import pathlib
from datetime import datetime, timedelta

from flask.testing import FlaskClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "back-end"))
from app import create_app  # noqa: E402
from coclib.config import Config  # noqa: E402
from coclib.extensions import db  # noqa: E402
from coclib.models import User, RecruitPost, RecruitJoin  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SIGNING_KEY = "k"


def _mock_verify(monkeypatch):
    monkeypatch.setattr(
        "app.jwt.decode", lambda t, key, algorithms: {"sub": "abc"}
    )


def _setup_app(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        user = User(
            id=1,
            sub="abc",
            email="u@example.com",
            name="U",
            player_tag="AAA",
        )
        db.session.add(user)
        now = datetime.utcnow()
        posts = [
            RecruitPost(
                id=i + 1,
                name=f"Clan {i}",
                description="desc",
                open_slots=i % 5,
                total_slots=50,
                league="Gold" if i % 2 == 0 else "Silver",
                language="EN",
                war="Always",
                tags=["fun"],
                badge="",
                created_at=now - timedelta(minutes=i),
            )
            for i in range(150)
        ]
        db.session.add_all(posts)
        db.session.commit()
    return app, client


def test_recruit_pagination_and_filtering(monkeypatch):
    app, client = _setup_app(monkeypatch)
    resp = client.get("/recruit", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["items"]) == 100
    assert data["nextCursor"] == "100"

    resp2 = client.get(
        f"/recruit?pageCursor={data['nextCursor']}",
        headers={"Authorization": "Bearer t"},
    )
    data2 = resp2.get_json()
    assert len(data2["items"]) == 50
    assert data2["nextCursor"] is None

    resp3 = client.get(
        "/recruit?league=Gold",
        headers={"Authorization": "Bearer t"},
    )
    data3 = resp3.get_json()
    assert all(item["league"] == "Gold" for item in data3["items"])  # type: ignore


def test_recruit_sorting(monkeypatch):
    _mock_verify(monkeypatch)
    app = create_app(TestConfig)
    client: FlaskClient = app.test_client()
    with app.app_context():
        db.create_all()
        user = User(
            id=1,
            sub="abc",
            email="u@example.com",
            name="U",
            player_tag="AAA",
        )
        db.session.add(user)
        old = RecruitPost(
            id=1,
            name="Old",
            description="",
            open_slots=10,
            total_slots=50,
            league="Gold",
            language="EN",
            war="Always",
            tags=[],
            badge="",
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        new = RecruitPost(
            id=2,
            name="New",
            description="",
            open_slots=1,
            total_slots=50,
            league="Gold",
            language="EN",
            war="Always",
            tags=[],
            badge="",
            created_at=datetime.utcnow(),
        )
        db.session.add_all([old, new])
        db.session.commit()
    resp = client.get("/recruit", headers={"Authorization": "Bearer t"})
    data = resp.get_json()
    assert data["items"][0]["name"] == "Old"
    resp2 = client.get(
        "/recruit?sort=new",
        headers={"Authorization": "Bearer t"},
    )
    data2 = resp2.get_json()
    assert data2["items"][0]["name"] == "New"


def test_join_records_request(monkeypatch):
    app, client = _setup_app(monkeypatch)
    with app.app_context():
        post_id = db.session.query(RecruitPost.id).first()[0]
    resp = client.post(f"/join/{post_id}", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 204
    with app.app_context():
        jr = RecruitJoin.query.filter_by(post_id=post_id, user_id=1).one_or_none()
        assert jr is not None
