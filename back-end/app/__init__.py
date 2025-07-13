import logging

from pathlib import Path

from flask import Flask
from flask_cors import CORS

from .api import register_blueprints
from coclib.config import Config
from coclib.extensions import db, cache, migrate, scheduler
from coclib.logging_config import configure_logging

logger = logging.getLogger(__name__)


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    configure_logging(level=cfg_cls.LOG_LEVEL)
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)

    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))

    register_blueprints(app)



    return app
