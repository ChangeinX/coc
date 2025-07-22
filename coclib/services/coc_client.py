import asyncio
import logging
from functools import wraps
from datetime import datetime, timedelta
import os

import coc

from coclib.utils import encode_tag

logger = logging.getLogger(__name__)

_last_reset = datetime.utcnow()
_req_count = 0
_lock = asyncio.Lock()

COC_TOKEN = os.getenv("COC_API_TOKEN")
COC_REQS_PER_DAY = int(os.getenv("COC_REQS_PER_DAY", "5000"))


def rate_limited(fn):
    @wraps(fn)
    async def wrapper(*args, **kwargs):
        global _last_reset, _req_count
        async with _lock:
            now = datetime.utcnow()
            if now - _last_reset > timedelta(days=1):
                _last_reset, _req_count = now, 0
            if _req_count >= COC_REQS_PER_DAY:
                raise RuntimeError("Daily CoC API quota exceeded")
            _req_count += 1
        return await fn(*args, **kwargs)

    return wrapper


class CoCClient:
    def __init__(self, token: str):
        self._client = coc.Client(raw_attribute=True)
        self._login_task = asyncio.create_task(self._client.login_with_tokens(token))

    async def _ready(self) -> None:
        if self._login_task is not None:
            await self._login_task
            self._login_task = None

    @rate_limited
    async def clan(self, tag: str):
        await self._ready()
        data = await self._client.get_clan(encode_tag(tag))
        return getattr(data, "_raw_data", data)

    @rate_limited
    async def clan_members(self, tag: str):
        await self._ready()
        members = await self._client.get_members(encode_tag(tag))
        return [getattr(m, "_raw_data", m) for m in members]

    @rate_limited
    async def player(self, tag: str):
        await self._ready()
        data = await self._client.get_player(encode_tag(tag))
        return getattr(data, "_raw_data", data)

    @rate_limited
    async def current_war(self, tag: str):
        await self._ready()
        war = await self._client.get_current_war(encode_tag(tag))
        if war is None:
            return {"state": "notInWar"}
        return getattr(war, "_raw_data", war)

    @rate_limited
    async def capital_raid_seasons(self, tag: str):
        await self._ready()
        raid_log = await self._client.get_raid_log(encode_tag(tag))
        return [entry._raw_data for entry in raid_log]

    @rate_limited
    async def verify_token(self, tag: str, token: str):
        await self._ready()
        return await self._client.verify_player_token(encode_tag(tag), token)


_client: CoCClient | None = None


async def get_client() -> CoCClient:
    global _client
    if _client is None:
        if not COC_TOKEN:
            raise RuntimeError("COC_API_TOKEN environment variable not set")
        _client = CoCClient(COC_TOKEN)
    return _client
