import os


class Config:
    LOG_LEVEL = "INFO"
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY")
    JSON_SORT_KEYS = False

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Clash of Clans API
    COC_TOKEN = os.getenv("COC_API_TOKEN")  # required
    COC_BASE = "https://api.clashofclans.com/v1"

    # Cache (SimpleCache by default; swap config for redis if wanted)
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 300  # 5 min

    # APScheduler
    SCHEDULER_API_ENABLED = False

    # Rate-limit guard
    COC_REQS_PER_SEC = 10
    COC_REQS_PER_DAY = 5_000

    # Internal sync service
    SYNC_BASE_URL = os.getenv("SYNC_BASE_URL", "http://sync:8080")

    PORT = 80


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False
    PORT = 8080


class TestConfig(Config):
    TESTING = True
    PORT = 5555


env_configs = {
    "development": DevelopmentConfig,
    "production": Config,
    "testing": TestConfig,
}
