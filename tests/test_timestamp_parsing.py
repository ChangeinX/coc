from datetime import datetime


def test_cache_timestamp_subtraction():
    ts = datetime.utcnow().isoformat().replace(" ", "T") + "Z"
    parsed = datetime.fromisoformat(ts).replace(tzinfo=None)
    assert parsed.tzinfo is None
    delta = datetime.utcnow() - parsed
    assert delta.total_seconds() >= 0

