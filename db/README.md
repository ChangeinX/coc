# Database Utilities

This directory contains a minimal Flask application used for running
Alembic migrations. It is independent from the API and sync services.

Usage:

```bash
cd db
flask db migrate -m "message"
flask db upgrade
```

The application reads configuration from `coclib.config` and shares the
models defined in `coclib.models`.
