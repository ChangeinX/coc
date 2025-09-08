import os
from urllib.parse import urlparse


def _validated_url(env_val: str | None, default: str) -> str:
    """Return env_val if it looks like a valid http(s) URL, else default."""
    if not env_val:
        return default
    try:
        p = urlparse(env_val)
        if p.scheme in ("http", "https") and p.netloc:
            return env_val
    except Exception:
        pass
    return default


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
    COC_EMAIL = os.getenv("COC_EMAIL")  # required
    COC_PASSWORD = os.getenv("COC_PASSWORD")
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

    LEGAL_VERSION = os.getenv("LEGAL_VERSION", "20250729")

    PORT = 80

    _cors = os.getenv("CORS_ORIGINS", "")
    CORS_ORIGINS = _cors.split(",") if _cors else []

    JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY", "change-me")
    SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "604800"))
    COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "")
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
    
    # User service OIDC configuration
    # Default to internal service DNS in cluster; allow override via AUTH_URL when valid
    AUTH_URL = _validated_url(os.getenv("AUTH_URL"), "http://user.clanboards.local:8020")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False
    PORT = 8080


class TestConfig(Config):
    TESTING = True
    PORT = 5555


env_configs = {
    "dev": DevelopmentConfig,
    "production": Config,
    "testing": TestConfig,
}


class MessagesConfig(Config):
    """Configuration values specific to the messages service."""

    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    MESSAGES_TABLE = os.getenv("MESSAGES_TABLE", "chat_messages")
    PORT = int(os.getenv("PORT", str(Config.PORT)))


class MessagesDevelopmentConfig(MessagesConfig, DevelopmentConfig):
    """Development settings for the messages service."""


class MessagesTestConfig(MessagesConfig, TestConfig):
    """Testing settings for the messages service."""


messages_env_configs = {
    "dev": MessagesDevelopmentConfig,
    "production": MessagesConfig,
    "testing": MessagesTestConfig,
}
