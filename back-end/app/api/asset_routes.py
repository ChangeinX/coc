from flask import Blueprint, request, abort, Response
import requests
from urllib.parse import urlparse

from coclib.extensions import cache
from . import API_PREFIX

bp = Blueprint("assets", __name__, url_prefix=f"{API_PREFIX}/assets")

ALLOWED_HOST = "api-assets.clashofclans.com"


@bp.get("/")
def proxy_asset():
    url = request.args.get("url", "")
    if not url:
        abort(400)
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or parsed.netloc != ALLOWED_HOST:
        abort(400)
    cache_key = f"asset:{url}"
    cached = cache.get(cache_key)
    if cached:
        data, content_type = cached
    else:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            abort(resp.status_code)
        data = resp.content
        content_type = resp.headers.get("Content-Type", "image/png")
        cache.set(cache_key, (data, content_type), timeout=3600)
    return Response(data, content_type=content_type)
