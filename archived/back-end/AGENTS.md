# Back-end Guidelines

This folder contains the Flask API service. Source code lives inside `app/`.

- Register new API routes inside `app/api/` and keep business logic in `app/services/`.
- Configuration classes are provided in `coclib.config` and loaded in `run.py`.
- The database models shared with other services are defined in `coclib/models.py`.
- Migrations live in the repo root `migrations/` directory; do not place them here.
- Add a relevant test case for any changes made to this service.

Before opening a pull request run `ruff back-end` to lint the code.
