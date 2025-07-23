import asyncio
import weakref
from os import getenv
from coc import Client

_EMAIL = getenv("COC_EMAIL")
_PASSWORD = getenv("COC_PASSWORD")

_client: Client | None = None
_lock = asyncio.Lock()
_logged_in = False
_closed = False

async def get_client() -> Client:
    """Return a logged-in :class:`coc.Client` instance."""
    global _client, _logged_in
    if _client is None:
        _client = Client(
            key_names="clan-board-api-keys",
            key_count=1,
            raw_attribute=True,
        )
        weakref.finalize(_client, _sync_close)
    if not _logged_in:
        async with _lock:
            if not _logged_in:
                await _client.login(_EMAIL, _PASSWORD)
                _logged_in = True
    return _client

async def close_client() -> None:
    """Close the shared :class:`coc.Client` if it was created."""
    global _closed, _logged_in
    if _client is None or _closed:
        return
    await _client.close()
    _closed = True
    _logged_in = False

def _sync_close() -> None:
    if _closed:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(close_client())
    else:
        loop.create_task(close_client())

