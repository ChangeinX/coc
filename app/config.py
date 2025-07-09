import os


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev")
    JSON_SORT_KEYS = False

    # DB (async psycopg / SQLAlchemy 2.0 style URL)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://coc:coc@localhost:5432/coc",
    )
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
