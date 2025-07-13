from pathlib import Path

from flask_apscheduler import APScheduler
from flask_caching import Cache
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
cache = Cache()
scheduler = APScheduler()

_migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
migrate = Migrate(directory=str(_migrations_dir))
