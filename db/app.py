# ruff: noqa: E402
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from flask import Flask

from coclib.config import env_configs
from coclib.extensions import db, migrate

# Import models so that Flask-Migrate can detect them
from coclib import models  # noqa: F401


def create_app(cfg_cls=env_configs.get(os.getenv("APP_ENV", "production"))):
    app = Flask(__name__)
    app.config.from_object(cfg_cls)

    db.init_app(app)

    migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
    migrate.init_app(app, db, directory=str(migrations_dir))

    return app


app = create_app()
