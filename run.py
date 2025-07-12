import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import current_app, send_from_directory
from asgiref.wsgi import WsgiToAsgi

from app.config import env_configs
from app import create_app

load_dotenv()

cfg_name = os.getenv("APP_ENV", "production")
cfg_cls = env_configs[cfg_name]

app = create_app(cfg_cls)
asgi_app = WsgiToAsgi(app)

logger = logging.getLogger(__name__)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path: str):
    # Make sure we have a Path object
    static_dir = Path(current_app.static_folder or Path(__file__).parent / "static")

    # If the requested file exists under /static, serve it; otherwise fall back to index.html
    if path and (static_dir / path).exists():
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", cfg_cls.PORT))
    logger.info(f"Starting app in {cfg_name} mode on port {port}")
    app.run(host="0.0.0.0", port=port, debug=getattr(cfg_cls, "DEBUG", False))
