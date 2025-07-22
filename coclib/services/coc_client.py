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
COC_TOKENS = [t.strip() for t in (COC_TOKEN or "").split(",") if t.strip()]
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
    def __init__(self, base: str, tokens: list[str]):
        self._client = coc.Client(raw_attribute=True, base_url=base)
        self._login = asyncio.create_task(self._client.login_with_tokens(*tokens))

    async def _ensure_login(self):
        if self._login is not None:
            await self._login
            self._login = None

    async def _handle_forbidden(self, exc: coc.Forbidden, path: str) -> dict:
        logger.warning("Access denied for %s: %s", path, exc)
        return {"state": "accessDenied"}

    async def _handle_not_found(self, exc: coc.NotFound | None = None) -> dict:
        return {"state": "notInWar"}

    async def _safe(self, coro, path: str):
        try:
            return await coro
        except coc.Forbidden as exc:
            return await self._handle_forbidden(exc, path)
        except coc.NotFound:
            return await self._handle_not_found()

    async def _wrap(self, obj):
        if hasattr(obj, "_raw_data"):
            return obj._raw_data
        return obj

    @rate_limited
    async def clan(self, tag: str):
        await self._ensure_login()
        coro = self._client.get_clan(encode_tag(tag))
        result = await self._safe(coro, f"/clans/{encode_tag(tag)}")
        return self._wrap(result)

    @rate_limited
    async def clan_members(self, tag: str):
        await self._ensure_login()
        coro = self._client.get_members(encode_tag(tag))
        result = await self._safe(coro, f"/clans/{encode_tag(tag)}/members")
        if isinstance(result, list):
            return [self._wrap(m) for m in result]
        return result

    @rate_limited
    async def player(self, tag: str):
        await self._ensure_login()
        coro = self._client.get_player(encode_tag(tag))
        result = await self._safe(coro, f"/players/{encode_tag(tag)}")
        return self._wrap(result)

    @rate_limited
    async def current_war(self, tag: str):
        await self._ensure_login()
        coro = self._client.get_current_war(encode_tag(tag))
        result = await self._safe(coro, f"/clans/{encode_tag(tag)}/currentwar")
        if result is None:
            return {"state": "notInWar"}
        return self._wrap(result)

    @rate_limited
    async def capital_raid_seasons(self, tag: str):
        await self._ensure_login()
        coro = self._client.get_raid_log(encode_tag(tag))
        result = await self._safe(coro, f"/clans/{encode_tag(tag)}/capitalraidseasons")
        if hasattr(result, "_raw_data"):
            return result._raw_data
        return result

    @rate_limited
    async def verify_token(self, tag: str, token: str):
        await self._ensure_login()
        coro = self._client.verify_player_token(encode_tag(tag), token)
        success = await self._safe(coro, f"/players/{encode_tag(tag)}/verifytoken")
        return {"status": "ok", "tag": f"#{encode_tag(tag)}"} if success else {"status": "invalid"}


_client: CoCClient | None = None


def get_client() -> CoCClient:
    global _client
    if _client is None:
        tokens = COC_TOKENS
        if not tokens:
            raise RuntimeError("COC_API_TOKEN environment variable not set")
        base = os.getenv("COC_BASE", "https://api.clashofclans.com/v1")
        _client = CoCClient(base, tokens)
    return _client
