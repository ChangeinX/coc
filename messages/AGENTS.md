# Messages Service Guidelines

This directory contains the chat message API service.

- Source code lives inside `app/` and helper functions in `services/`.
- Use dataclasses in `models.py` to describe the DynamoDB schema.
- Database migrations remain under the repo root `migrations/` directory.
- Add tests for any new features added here.

Run `ruff messages` before submitting a pull request.
