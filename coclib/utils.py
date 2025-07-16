from urllib.parse import quote
from asyncio import to_thread


async def safe_to_thread(func, /, *args, **kwargs):
    """Run ``func`` in a worker thread.

    Falls back to a synchronous call if the default executor has been shut down
    during application shutdown.
    """
    try:
        return await to_thread(func, *args, **kwargs)
    except RuntimeError as exc:  # pragma: no cover - defensive fallback
        msg = str(exc)
        if "CurrentThreadExecutor" in msg or "new futures" in msg:
            return func(*args, **kwargs)
        raise


def normalize_tag(tag: str) -> str:
    """Internal canon form: upper-case, no leading #."""
    return tag.upper().lstrip("#")


def encode_tag(tag: str) -> str:
    """Outbound form for Supercell API: %23ABC123."""
    return quote(f"#{normalize_tag(tag)}", safe="")
