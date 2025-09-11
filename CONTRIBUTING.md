# Contributing

This repo is mobile‑first with Java microservices. Use the Makefile for common tasks and keep Java builds pinned to the Gradle Wrapper.

## Requirements
- Java 21 (Temurin recommended)
- Node 20+
- Python 3.11
- nox (optional, for full test suite): `pipx install nox` or `pip install nox`
- ruff (optional, for direct Python lint): `pipx install ruff`

## Quick Start
- List commands: `make help`
- Install git hooks: `make hooks`
- Lint all stacks: `make lint`
- Run tests (Java + mobile + Lambda via nox): `make test`
- Lambda tests only:
  - With nox: `make lambda-test`
  - Without nox: `make lambda-test-standalone`

## Java/Gradle Notes
- Always use the module Gradle Wrapper (`./gradlew`) — do not use the global `gradle` CLI.
- All modules are pinned to the same wrapper distribution (Gradle 8.14.3). Re‑pin with: `make gradle-align`.
- If your environment restricts `~/.gradle`, set `export GRADLE_USER_HOME=$(pwd)/.gradle` before running wrapper commands.

## Mobile & Web
- Mobile setup: `make mobile-setup` (then `make mobile-lint`, `make mobile-typecheck`, `make mobile-test`)
- Web (optional; PWA obsolete): `make web-setup`, `make web-test`, `make web-build`

## Python
- Lint: `make lint-python` (runs ruff on `coclib`, `db`, `lambdas/refresh-worker`)

## CI
- CI runs per‑stack jobs with path filters and Gradle caching; `nox` is only a local convenience.

## Auth
- Mobile auth plan is complete; services should validate tokens using DB‑backed JWKS as described in `AUTHENTICATION_INTEGRATION.md`.
