# Shared Library Guidelines

This package contains utilities, database models and configuration used by the API service.

- Add reusable functions and models here rather than duplicating them in other projects.
- Files such as `config.py` and `extensions.py` provide common Flask setup helpers.
- Code in this directory should not import from `back-end`.

Lint changes with `ruff coclib`.
