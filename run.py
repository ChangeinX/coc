from flask import current_app, send_from_directory
from pathlib import Path

from asgiref.wsgi import WsgiToAsgi

from app import create_app

app = create_app()


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path: str):
    # Make sure we have a Path object
    static_dir = Path(current_app.static_folder or Path(__file__).parent / "static")

    # If the requested file exists under /static, serve it; otherwise fall back to index.html
    if path and (static_dir / path).exists():
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, "index.html")


asgi_app = WsgiToAsgi(app)

if __name__ == "__main__":
    app.run(port=80)
