import asyncio
from coclib.utils import encode_tag, normalize_tag, safe_to_thread


def test_normalize_tag_strip_and_upper():
    assert normalize_tag('#abc') == 'ABC'
    assert normalize_tag('Def') == 'DEF'


def test_encode_tag_quotes_percent23():
    assert encode_tag('abc') == '%23ABC'
    assert encode_tag('#def') == '%23DEF'


def test_safe_to_thread_fallback(monkeypatch):
    def add(x, y):
        return x + y

    async def raise_error(*args, **kwargs):
        raise RuntimeError("CurrentThreadExecutor already quit or is broken")

    import coclib.utils as u
    monkeypatch.setattr(u, 'to_thread', raise_error)
    result = asyncio.run(safe_to_thread(add, 1, 2))
    assert result == 3
