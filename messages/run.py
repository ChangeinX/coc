import logging
import os
from dotenv import load_dotenv

from asgiref.wsgi import WsgiToAsgi
from coclib.config import env_configs
from messages.app import create_app

load_dotenv()

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = env_configs[cfg_name]

app = create_app(cfg_cls)
asgi_app = WsgiToAsgi(app)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    port = int(os.getenv("PORT") or (getattr(cfg_cls, "PORT", None) if getattr(cfg_cls, "PORT", 80) != 80 else 8000))
    logger.info(f"Starting messages service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
