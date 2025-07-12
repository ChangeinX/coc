# ruff: noqa: E402
import logging
import os

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



if __name__ == "__main__":
    port = int(os.getenv("PORT", cfg_cls.PORT))
    logger.info(f"Starting app in {cfg_name} mode on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
