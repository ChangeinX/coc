from flask_apscheduler import APScheduler
from flask_caching import Cache
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
cache = Cache()
scheduler = APScheduler()
migrate = Migrate()
login_manager = LoginManager()
oauth = OAuth()
