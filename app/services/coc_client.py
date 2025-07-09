import asyncio
from functools import wraps
from datetime import datetime, timedelta
import httpx
from flask import current_app

from app.utils import encode_tag

# rudimentary in-process rate gate
_last_reset = datetime.utcnow()
_req_count = 0
_lock = asyncio.Lock()


def rate_limited(fn):
    @wraps(fn)
    async def wrapper(*args, **kwargs):
        global _last_reset, _req_count
        async with _lock:
            now = datetime.utcnow()
            if now - _last_reset > timedelta(days=1):
                _last_reset, _req_count = now, 0
            if _req_count >= current_app.config["COC_REQS_PER_DAY"]:
                raise RuntimeError("Daily CoC API quota exceeded")
            _req_count += 1
        return await fn(*args, **kwargs)
    return wrapper


class CoCClient:
    def __init__(self, base: str, token: str):
        self.base = base
        self.headers = {"Authorization": f"Bearer {token}"}
        self.client = httpx.AsyncClient(base_url=base, headers=self.headers, timeout=10)

    async def get(self, path: str):
        async with httpx.AsyncClient(
            base_url=self.base,
            headers=self.headers,
            timeout=10,
            http2=True,          # re-uses TCP/TLS inside *this* context
        ) as client:
            resp = await client.get(path)

            if resp.status_code in (403, 404):
                try:
                    payload = resp.json()
                    reason = payload.get("reason", "")
                except ValueError:
                    reason = ""
                if resp.status_code == 403 and reason.startswith("accessDenied"):
                    return {"state": "accessDenied"}
                return {"state": "notInWar"}  # 404 or unknown 403 reason

            # Anything else that’s 4xx / 5xx is a real error
            resp.raise_for_status()
            return resp.json()

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


def get_client() -> CoCClient:
    cfg = current_app.config
    if not hasattr(current_app, "_coc_client"):
        current_app._coc_client = CoCClient(cfg["COC_BASE"], cfg["COC_TOKEN"])
    return current_app._coc_client
