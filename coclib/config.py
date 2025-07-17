import os


class Config:
    LOG_LEVEL = "INFO"
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
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

    # How long a cached snapshot remains fresh (seconds)
    SNAPSHOT_MAX_AGE = int(os.getenv("SNAPSHOT_MAX_AGE", "600"))

    PORT = 80

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,https://dev.clan-boards.com,https://api.dev.clan-boards.com",
    ).split(",")




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


class MessagesConfig(Config):
    """Configuration values specific to the messages service."""

    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    MESSAGES_TABLE = os.getenv("MESSAGES_TABLE", "chat_messages")
    APPSYNC_EVENTS_URL = os.getenv("APPSYNC_EVENTS_URL")
    PORT = int(os.getenv("PORT", str(Config.PORT)))


class MessagesDevelopmentConfig(MessagesConfig, DevelopmentConfig):
    """Development settings for the messages service."""


class MessagesTestConfig(MessagesConfig, TestConfig):
    """Testing settings for the messages service."""


messages_env_configs = {
    "development": MessagesDevelopmentConfig,
    "production": MessagesConfig,
    "testing": MessagesTestConfig,
}
