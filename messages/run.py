import logging
import os
from dotenv import load_dotenv

from socketio import ASGIApp
from coclib.config import messages_env_configs
from messages.app import create_app, socketio
from messages.app.api import API_PREFIX

load_dotenv()

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = messages_env_configs[cfg_name]

app = create_app(cfg_cls)
asgi_app = ASGIApp(socketio.server, other_asgi_app=app, socketio_path=f"{API_PREFIX}/chat/socket.io")
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    port = cfg_cls.PORT
    logger.info(f"Starting messages service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
