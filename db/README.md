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

Local Postgres (optional):

- A helper exists to spin up a local Postgres via Docker and run migrations
  against it without changing your default dev database configuration:

  ```bash
  # Start Postgres on localhost:5433 and run migrations
  tools/local-db.sh up
  tools/local-db.sh migrate

  # Connect with psql
  tools/local-db.sh psql

  # Tear down (preserve data) or destroy (remove volume)
  tools/local-db.sh down
  tools/local-db.sh destroy
  ```

- DATABASE_URL used for the migration is set only for that command and does
  not modify your environment or the default `flask db` behavior in this
  folder.
