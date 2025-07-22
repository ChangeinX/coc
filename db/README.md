# Database Utilities

This directory contains a minimal Flask application used for running
Alembic migrations. It is independent from the API.

Usage:

```bash
cd db
flask --app app db migrate -m "message"
flask --app app db upgrade
```

Alternatively set the `FLASK_APP` environment variable to `app` so the
commands can be shortened to `flask db ...`.

The application reads configuration from `coclib.config` and shares the
models defined in `coclib.models`.
