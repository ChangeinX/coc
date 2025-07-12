from flask_apscheduler import APScheduler
from flask_caching import Cache
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
cache = Cache()
scheduler = APScheduler()
migrate = Migrate()
