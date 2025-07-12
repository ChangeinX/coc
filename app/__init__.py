import logging

from flask import Flask
from flask_cors import CORS

from app.api import register_blueprints
from app.config import Config
from app.extensions import db, cache, migrate, scheduler
from app.logging_config import configure_logging
from app.tasks.sync import register_jobs

logger = logging.getLogger(__name__)


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    configure_logging(level=cfg_cls.LOG_LEVEL)
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)
    scheduler.start()
    migrate.init_app(app, db)

    register_blueprints(app)

    with app.app_context():
        register_jobs()

    return app
