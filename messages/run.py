import logging
import os
from dotenv import load_dotenv

from socketio import ASGIApp
from asgiref.wsgi import WsgiToAsgi
from starlette.middleware.cors import CORSMiddleware
from coclib.config import messages_env_configs
from messages.app import create_app, socketio

load_dotenv()

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = messages_env_configs[cfg_name]

app = create_app(cfg_cls)
asgi_app = ASGIApp(
    socketio.server,
    other_asgi_app=WsgiToAsgi(app),
    socketio_path="socket.io",
)
asgi_app = CORSMiddleware(
    asgi_app,
    allow_origins=app.config["CORS_ORIGINS"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    port = cfg_cls.PORT
    logger.info(f"Starting messages service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
