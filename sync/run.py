# ruff: noqa: E402
import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

from flask import Flask
from coclib.config import env_configs
from coclib.extensions import db, cache, scheduler
from coclib.logging_config import configure_logging

try:
    # Prefer importing via the package name so ``python -m sync.run`` works
    # when executed from the repository root.
    from sync.tasks import register_jobs
except ModuleNotFoundError:  # pragma: no cover - fallback for ``python -m run``
    # ``python -m run`` executed from the ``sync`` directory does not have the
    # parent package on ``sys.path``.  Fall back to a direct module import so
    # it can still run as a standalone script.
    from tasks import register_jobs

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = env_configs[cfg_name]

configure_logging(level=cfg_cls.LOG_LEVEL)
app = Flask("sync")
app.config.from_object(cfg_cls)

db.init_app(app)
cache.init_app(app)
scheduler.init_app(app)

with app.app_context():
    register_jobs()
    scheduler.start()

logging.getLogger(__name__).info("Scheduler started")

try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    pass
