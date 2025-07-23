import asyncio
import weakref
from os import getenv

from coc import Client as _CoCClient

_EMAIL = getenv("COC_EMAIL")
_PASSWORD = getenv("COC_PASSWORD")


class CoCPyClient:
    _instance: "CoCPyClient|None" = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, key_name="clan-board-api-keys", key_count=1):
        if getattr(self, "_initialized", False):
            return
        self._client = _CoCClient(key_names=key_name,
                                  key_count=key_count,
                                  raw_attribute=True)
        self._lock = asyncio.Lock()
        self._logged_in = False
        self._closed = False
        self._initialized = True

        weakref.finalize(self, _sync_close, self)

    async def _ensure_login(self):
        if not self._logged_in:
            async with self._lock:
                if not self._logged_in:
                    await self._client.login(_EMAIL, _PASSWORD)
                    self._logged_in = True
        return self._client

    async def close(self):
        if not self._closed:
            await self._client.close()
            self._closed = True
            self._logged_in = False

    async def clan(self, tag: str) -> dict:
        client = await self._ensure_login()
        return (await client.get_clan(tag))._raw_data

    async def clan_members(self, tag: str) -> dict:
        client = await self._ensure_login()
        data = (await client.get_clan(tag))._raw_data

        # swap name for backwards compatibility
        members = data.get("memberList", data.get("items", []))
        return {"items": members, "state": data.get("state", "ok")}

    async def get_player(self, player_tag: str) -> dict:
        client = await self._ensure_login()
        return (await client.get_player(player_tag))._raw_data

    async def verify_player_token(self, player_tag, token):
        client = await self._ensure_login()
        return await client.verify_player_token(player_tag=player_tag, token=token)

    async def current_war(self, tag: str) -> dict:
        client = await self._ensure_login()
        return (await client.get_current_war(tag))._raw_data


def _sync_close(wrapper: "CoCPyClient"):
    """
    Called automatically by `weakref.finalize` when the interpreter
    is finalising objects.  Runs `await wrapper.close()` in whatever
    way is still possible at that moment.
    """
    if wrapper._closed:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:  # no running loop – create a fresh one
        asyncio.run(wrapper.close())
    else:  # loop still alive – schedule cleanup
        loop.create_task(wrapper.close())
