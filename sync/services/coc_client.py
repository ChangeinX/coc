import asyncio
import logging
from functools import wraps
from datetime import datetime, timedelta
import os
import httpx

from coclib.utils import encode_tag

logger = logging.getLogger(__name__)

_last_reset = datetime.utcnow()
_req_count = 0
_lock = asyncio.Lock()

COC_BASE = os.getenv("COC_BASE", "https://api.clashofclans.com/v1")
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
    def __init__(self, base: str, token: str):
        self.base = base
        self.headers = {"Authorization": f"Bearer {token}"}

    async def request(self, method: str, path: str, **kwargs):
        async with httpx.AsyncClient(
            base_url=self.base,
            headers=self.headers,
            timeout=10,
            http2=True,
        ) as client:
            resp = await client.request(method, path, **kwargs)

            if resp.status_code in (403, 404) and method == "GET":
                try:
                    payload = resp.json()
                    reason = payload.get("reason", "")
                except ValueError:
                    reason = ""
                if resp.status_code == 403 and reason.startswith("accessDenied"):
                    logger.warning("Access denied for %s: %s", path, reason)
                    return {"state": "accessDenied"}
                return {"state": "notInWar"}

            resp.raise_for_status()
            return resp.json()

    async def get(self, path: str):
        return await self.request("GET", path)

    @rate_limited
    async def clan(self, tag: str):
        return await self.get(f"/clans/{encode_tag(tag)}")

    @rate_limited
    async def clan_members(self, tag: str):
        return await self.get(f"/clans/{encode_tag(tag)}/members")

    @rate_limited
    async def player(self, tag: str):
        return await self.get(f"/players/{encode_tag(tag)}")

    @rate_limited
    async def current_war(self, tag: str):
        return await self.get(f"/clans/{encode_tag(tag)}/currentwar")

    @rate_limited
    async def capital_raid_seasons(self, tag: str):
        return await self.get(f"/clans/{encode_tag(tag)}/capitalraidseasons")

    @rate_limited
    async def verify_token(self, tag: str, token: str):
        data = {"token": token}
        return await self.request("POST", f"/players/{encode_tag(tag)}/verifytoken", json=data)


_client: CoCClient | None = None


def get_client() -> CoCClient:
    global _client
    if _client is None:
        if not COC_TOKEN:
            raise RuntimeError("COC_API_TOKEN environment variable not set")
        _client = CoCClient(COC_BASE, COC_TOKEN)
    return _client
