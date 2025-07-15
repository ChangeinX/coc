# Shared Library Guidelines

This package contains utilities, database models and configuration used by both the API and sync services.

- Add reusable functions and models here rather than duplicating them in other projects.
- Files such as `config.py` and `extensions.py` provide common Flask setup helpers.
- Code in this directory should not import from `back-end` or `sync`.

Lint changes with `ruff coclib`.
