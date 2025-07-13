# ruff: noqa: E402
import logging
import os
from dotenv import load_dotenv

load_dotenv()

from asgiref.wsgi import WsgiToAsgi
from flask import Flask
from coclib.config import env_configs
from coclib.extensions import db, cache, scheduler
from coclib.logging_config import configure_logging

try:
    from sync.tasks import register_jobs
    from sync.api import bp as api_bp
except ModuleNotFoundError:  # pragma: no cover - fallback when executed locally
    from tasks import register_jobs
    from api import bp as api_bp

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = env_configs[cfg_name]

configure_logging(level=cfg_cls.LOG_LEVEL)
app = Flask("sync")
app.config.from_object(cfg_cls)

db.init_app(app)
cache.init_app(app)
scheduler.init_app(app)

app.register_blueprint(api_bp)

with app.app_context():
    register_jobs()
    scheduler.start()

asgi_app = WsgiToAsgi(app)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    port = int(os.getenv("PORT") or (getattr(cfg_cls, "PORT", None) if getattr(cfg_cls, "PORT", 80) != 80 else 8000))
    logger.info(f"Starting sync service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
