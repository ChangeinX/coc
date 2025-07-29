# ruff: noqa: E402 # trigger re-build test
import logging
import os
import socket
from contextlib import closing

from dotenv import load_dotenv

load_dotenv()

from asgiref.wsgi import WsgiToAsgi

from coclib.config import env_configs
from app import create_app

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = env_configs[cfg_name]

app = create_app(cfg_cls)
asgi_app = WsgiToAsgi(app)

logger = logging.getLogger(__name__)
logger.info("Using CORS_ORIGINS: %s", app.config.get("CORS_ORIGINS"))



if __name__ == "__main__":
    port = int(
        os.getenv("PORT")
        or (getattr(cfg_cls, "PORT", None) if getattr(cfg_cls, "PORT", 80) != 80 else 8000)
    )

    while True:
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            try:
                s.bind(("0.0.0.0", port))
                break  # free we can use it
            except OSError:
                port += 1

    logger.info(f"Starting app in {cfg_name} mode on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
