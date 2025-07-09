from flask import Flask
from app.config import Config
from app.extensions import db, cache, migrate, scheduler
from app.api import register_blueprints
from app.tasks.sync import register_jobs


def create_app(cfg_cls: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    # --- extensions ---------------------------------------------------------
    db.init_app(app)
    cache.init_app(app)
    scheduler.init_app(app)
    scheduler.start()
    migrate.init_app(app, db)

    # --- blueprints ---------------------------------------------------------
    register_blueprints(app)

    # --- background jobs ----------------------------------------------------
    with app.app_context():
        register_jobs()

    return app
