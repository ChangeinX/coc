import os
import asyncio
import importlib

import httpx
from httpx import ASGITransport
from starlette.middleware.cors import CORSMiddleware
from asgiref.wsgi import WsgiToAsgi
from socketio import ASGIApp

os.environ['GOOGLE_CLIENT_ID'] = 'dummy'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['COC_API_TOKEN'] = 'dummy'

from coclib.config import MessagesConfig

def _make_app(cfg_cls: type[MessagesConfig]):
    import messages.app as mapp
    importlib.reload(mapp)
    app = mapp.create_app(cfg_cls)
    return app, mapp.socketio

def test_socketio_cors_header():
    async def run_test():
        class TestConfig(MessagesConfig):
            TESTING = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
            GOOGLE_CLIENT_ID = "dummy"

        app, sio = _make_app(TestConfig)
        asgi_app = ASGIApp(
            sio.server,
            other_asgi_app=WsgiToAsgi(app),
            socketio_path="socket.io",
        )
        asgi_app = CORSMiddleware(
            asgi_app,
            allow_origins=app.config["CORS_ORIGINS"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
        transport = ASGITransport(app=asgi_app)
        async with httpx.AsyncClient(transport=transport, base_url='http://testserver') as client:
            resp = await client.options(
                '/socket.io/?EIO=4&transport=polling&t=1',
                headers={
                    'Origin': 'https://dev.clan-boards.com',
                    'Access-Control-Request-Method': 'POST',
                },
            )
        assert resp.status_code == 200
        assert resp.headers.get('Access-Control-Allow-Origin') == 'https://dev.clan-boards.com'
    asyncio.run(run_test())


