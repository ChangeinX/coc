import logging
import os
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

def configure_logging(
    level: str | int = "INFO",
    log_dir: str | Path = "logs",
    log_file: str = "app.log",
    max_bytes: int = 10 * 1024 * 1024,   # 10 MB
    backup_count: int = 5,
) -> None:

    level = logging.getLevelName(level) if isinstance(level, str) else level

    root = logging.getLogger()
    if root.handlers:          # Defensive: avoid configuring twice
        return

    root.setLevel(level)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(_default_formatter())
    root.addHandler(stream_handler)

    Path(log_dir).mkdir(parents=True, exist_ok=True)
    file_path = Path(log_dir, log_file)
    file_handler = RotatingFileHandler(
        file_path, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    file_handler.setFormatter(_default_formatter())
    root.addHandler(file_handler)

    # Propagate warnings captured by `warnings.warn(...)`
    logging.captureWarnings(True)

def _default_formatter() -> logging.Formatter:
    return logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
