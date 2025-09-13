SHELL := /bin/bash

# Ensure local tool shims take precedence (created by setup)
BIN_DIR := $(CURDIR)/.tools/bin
export PATH := $(BIN_DIR):$(PATH)

# Configuration
JAVA_VERSION ?= 21
GRADLE_VERSION ?= 8.14.3
GRADLE_USER_HOME ?= $(CURDIR)/.gradle
# Prefer Python 3.11 if present (used for local venvs)
PYTHON311 := $(shell command -v python3.11 >/dev/null 2>&1 && echo python3.11 || echo python3)

# Java modules in this monorepo
JAVA_MODULES := java-auth-common messages-java user_service notifications recruiting clash-data

.PHONY: help
help:
	@echo "Available targets:";
	@echo "  setup                  Bootstrap dev env (Python 3.11, nox, ruff, hooks, npm ci)";
	@echo "  doctor                 Diagnose local dev setup and suggest fixes";
	@echo "  hooks                   Install pre-commit git hook";
	@echo "  env-check               Show tool versions and warn on mismatches";
	@echo "  lint                    Lint Python + Java (spotless) + mobile";
	@echo "  lint-apply              Auto-fix lint issues (Ruff/Spotless/ESLint)";
	@echo "  check                   Lint + Gradle wrapper alignment check";
	@echo "  test                    Run Java tests, mobile tests, and lambda tests (via nox)";
	@echo "  verify                  check + full test suite";
	@echo "  lint-python             Run ruff on Python sources";
	@echo "  lint-java               Run spotlessCheck on all Java modules";
	@echo "  test-java               Run tests on all Java modules";
	@echo "  fmt-java                Run Spotless apply on all Java modules";
	@echo "  mobile-setup            Install mobile dependencies (npm ci)";
	@echo "  mobile-lint             ESLint for mobile app";
	@echo "  mobile-typecheck        TypeScript typecheck for mobile app";
	@echo "  mobile-test             Jest tests for mobile app";
	@echo "  mobile-fix              ESLint --fix for mobile app";
	@echo "  web-setup               Install web dependencies (npm ci)";
	@echo "  web-test                Vitest tests for web app";
	@echo "  web-build               Build web app (vite)";
	@echo "  lambda-test             Run Lambda tests via nox suite";
	@echo "  lambda-test-standalone  Run Lambda tests without nox (local venv)";
	@echo "  gradle-align            Align Gradle wrapper distribution across modules ($(GRADLE_VERSION))";
	@echo "  ci                      Run CI-like suite (java, mobile, web, lambdas)";
	@echo "  ci-java                 Java spotlessCheck + tests with stable flags";
	@echo "  ci-mobile               Mobile tests in CI mode (npm ci, --ci)";
	@echo "  ci-web                  Web tests+build in CI mode";
	@echo "  ci-lambdas              Lambda tests; uses nox if available, else standalone";
	@echo "  ci-python               Python lint (ruff)";
	@echo "  ci-precommit            Run pre-commit full suite (nox) to mirror local hook";
	@echo "  ci-gradle-align-check   Assert all Gradle wrappers are pinned uniformly";
	@echo "  local-db-up             Start local Postgres (Docker)";
	@echo "  local-db-migrate        Run Alembic migrations against local Postgres";
	@echo "  local-db-psql           Open psql shell in local Postgres";
	@echo "  local-db-psql-cmd       Run SQL via psql (SQL='select 1')";
	@echo "  local-db-down           Stop local Postgres (keep data)";
	@echo "  local-db-destroy        Stop and remove local Postgres + volume";
	@echo "  local-db-status         Show container status";
	@echo "  local-db-logs           Tail Postgres logs";
	@echo "  local-up                Start Traefik, DB, migrate, launch user_service + messages-java, seed JWKS, smoke test";
	@echo "  local-down              Stop all services, DB (preserve data), and Traefik";
	@echo "  local-destroy           Stop all services, remove keys, destroy DB volume and Traefik";
	@echo "  local-restart           Restart active services without rebuilding (SERVICE=name for specific)";
	@echo "  local-rebuild           Rebuild services without restarting (SERVICE=name for specific)";
	@echo "  local-reload            Rebuild and restart services (SERVICE=name for specific)";
	@echo "  local-status            Show status of all services";
	@echo "  traefik-up              Start local Traefik (:80) with repo config";
	@echo "  traefik-down            Stop local Traefik";
	@echo "  traefik-status          Show Traefik container status";
	@echo "  traefik-logs            Tail Traefik logs (FOLLOW=1 to follow)";
	@echo "  get-apple-token         Generate local Apple-style RS256 tokens (dev)";

.PHONY: hooks
hooks:
	bash tools/setup-git-hooks.sh

# One-shot environment bootstrap for local development
.PHONY: setup
setup: env-check hooks
	@echo "== Bootstrapping local development environment =="
	@mkdir -p $(BIN_DIR)
	# Ensure Python 3.11 exists (used by nox sessions)
	bash tools/bootstrap-python.sh
	# Ensure pipx-managed CLIs (nox, ruff)
	bash tools/bootstrap-pipx.sh nox ruff
	# Install front-end deps when npm is available
	@if command -v npm >/dev/null 2>&1; then \
		$(MAKE) -s mobile-setup; \
		if [ -f front-end/app/package.json ]; then $(MAKE) -s web-setup || true; fi; \
	else \
		echo "npm not found — skipping front-end dependency install"; \
	fi
	@echo "\n✅ Setup complete. Suggested next steps:"; \
	echo "  - make check        # lint + gradle alignment"; \
	echo "  - make test         # java/mobile/lambda tests (nox required)"; \
	echo "  - git commit        # pre-commit hook will run fast checks";

# Doctor: print diagnostics and suggestions (non-destructive)
.PHONY: doctor
doctor:
	bash tools/doctor.sh

# Environment check
.PHONY: env-check
env-check:
	@echo "== Environment Versions =="; \
	JAVA_VER=$$(java -version 2>&1 | head -n1 | sed -E 's/.*version "?([0-9]+).*/\1/' || true); \
	NODE_VER=$$(node -v 2>/dev/null | sed -E 's/v([0-9]+).*/\1/' || true); \
	PY_VER=$$(python3 -V 2>&1 | sed -E 's/Python ([0-9]+)\..*/\1/' || true); \
	echo "Java:   $$JAVA_VER (expected >= 21)"; \
	echo "Node:   $$NODE_VER (expected >= 20)"; \
	echo "Python: $$PY_VER (expected = 3.11)"; \
	if [ -n "$$JAVA_VER" ] && [ "$$JAVA_VER" -lt 21 ]; then echo "WARN: Java < 21"; fi; \
	if [ -n "$$NODE_VER" ] && [ "$$NODE_VER" -lt 20 ]; then echo "WARN: Node < 20"; fi; \
	if ! python3 -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,11) else 1)' >/dev/null 2>&1; then echo "WARN: Python is not 3.11"; fi

# Aggregate
.PHONY: lint
lint: lint-python lint-java mobile-lint mobile-typecheck

# Apply auto-fixes across supported stacks
.PHONY: lint-apply
lint-apply: fmt-python fmt-java mobile-fix

.PHONY: check
check: env-check lint ci-gradle-align-check

.PHONY: test
test: test-java mobile-test lambda-test

.PHONY: verify
verify: check test

# Python
.PHONY: lint-python
lint-python:
	@echo "[ruff] checking coclib db lambdas/refresh-worker"
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check coclib db lambdas/refresh-worker ; \
	else \
		echo "ruff not found. Install with: pipx install ruff"; \
		exit 1; \
	fi

# Python formatting and autofix (Ruff)
.PHONY: fmt-python
fmt-python:
	@echo "[ruff] fixing + formatting Python sources"
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check --fix coclib db lambdas/refresh-worker && ruff format coclib db lambdas/refresh-worker ; \
	else \
		echo "ruff not found. Install with: pipx install ruff"; \
		exit 1; \
	fi

# Java
.PHONY: lint-java
lint-java:
	@for m in $(JAVA_MODULES); do \
		echo "[gradle] $$m spotlessCheck"; \
		( cd $$m && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew --no-daemon -q spotlessCheck ); \
	done

.PHONY: test-java
test-java:
	@for m in $(JAVA_MODULES); do \
		echo "[gradle] $$m test"; \
		( cd $$m && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew --no-daemon test ); \
	done

.PHONY: fmt-java
fmt-java:
	@for m in $(JAVA_MODULES); do \
		echo "[gradle] $$m spotlessApply"; \
		( cd $$m && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew --no-daemon -q spotlessApply ); \
	done

# Mobile
.PHONY: mobile-setup
mobile-setup:
	cd front-end/mobile && npm ci

.PHONY: mobile-lint
mobile-lint:
	cd front-end/mobile && npm run -s lint

.PHONY: mobile-typecheck
mobile-typecheck:
	cd front-end/mobile && npm run -s typecheck

.PHONY: mobile-test
mobile-test:
	cd front-end/mobile && npm test --silent

.PHONY: mobile-fix
mobile-fix:
	cd front-end/mobile && npm run -s lint -- --fix

# Web (optional; PWA obsolete)
.PHONY: web-setup
web-setup:
	cd front-end/app && npm ci

.PHONY: web-test
web-test:
	cd front-end/app && npm test --silent

.PHONY: web-build
web-build:
	cd front-end/app && npm run -s build

# Lambdas
.PHONY: lambda-test
lambda-test:
	@echo "[nox] running suite (includes Lambda tests)"
	@if command -v nox >/dev/null 2>&1; then \
		( nox -s tests ) || ( echo "[nox] failed; falling back to standalone lambda tests" && $(MAKE) -s lambda-test-standalone ); \
	else \
		echo "nox not found. Install with: pipx install nox"; \
		exit 1; \
	fi

.PHONY: lambda-test-standalone
lambda-test-standalone:
	cd lambdas/refresh-worker && \
	if command -v uv >/dev/null 2>&1; then \
		echo "[uv] creating 3.11 venv and installing deps"; \
		uv venv -p 3.11 .venv && source .venv/bin/activate && uv pip install -r requirements-test.txt ; \
	else \
		echo "[venv] creating 3.11 venv and installing deps"; \
		$(PYTHON311) -m venv .venv && source .venv/bin/activate && pip install -r requirements-test.txt ; \
	fi && \
	PYTHONPATH=../../ pytest -v test_lambda_function.py

# Align Gradle wrapper distribution across modules to $(GRADLE_VERSION)
.PHONY: gradle-align
gradle-align:
	@for m in $(JAVA_MODULES); do \
		p=$$m/gradle/wrapper/gradle-wrapper.properties; \
		if [[ -f "$$p" ]]; then \
			echo "Updating $$p"; \
			sed -i.bak "s#distributionUrl=.*#distributionUrl=https\://services.gradle.org/distributions/gradle-$(GRADLE_VERSION)-bin.zip#" "$$p"; \
			rm -f "$$p.bak"; \
		fi; \
	 done
	@echo "Aligned Gradle wrapper distributionUrl to $(GRADLE_VERSION)"

# CI-like wrappers
.PHONY: ci
ci: env-check ci-gradle-align-check ci-java ci-mobile ci-web ci-lambdas

.PHONY: ci-java
ci-java:
	@for m in $(JAVA_MODULES); do \
		echo "[gradle] $$m spotlessCheck test"; \
		( cd $$m && GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew --no-daemon --build-cache -q spotlessCheck && ./gradlew --no-daemon --build-cache test ); \
	done

.PHONY: ci-mobile
ci-mobile:
	cd front-end/mobile && npm ci && CI=1 npm test --silent -- --ci

.PHONY: ci-web
ci-web:
	cd front-end/app && npm ci && CI=1 npm test --silent && npm run -s build

.PHONY: ci-lambdas
ci-lambdas:
	@if command -v nox >/dev/null 2>&1; then \
		echo "[nox] running lambda tests"; \
		nox -s tests ; \
	else \
		echo "[standalone] running lambda tests"; \
		cd lambdas/refresh-worker && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements-test.txt && PYTHONPATH=../../ pytest -v test_lambda_function.py ; \
	fi

.PHONY: ci-python
ci-python: lint-python

.PHONY: ci-precommit
ci-precommit:
	@if command -v nox >/dev/null 2>&1; then \
		PRECOMMIT_FULL=1 bash tools/hooks/pre-commit ; \
	else \
		echo "nox not found; install with pipx install nox"; exit 1; \
	fi

.PHONY: ci-gradle-align-check
ci-gradle-align-check:
	@urls=$$(grep -h '^distributionUrl=' $(addsuffix /gradle/wrapper/gradle-wrapper.properties,$(JAVA_MODULES)) | sed 's/^distributionUrl=//' | sort -u); \
	count=$$(echo "$$urls" | sed '/^$$/d' | wc -l | tr -d ' '); \
	echo "Wrapper URLs:"; echo "$$urls"; \
	if [ "$$count" -ne 1 ]; then echo "Mismatch in Gradle wrapper distributionUrl across modules"; exit 1; fi; \
	echo "Gradle wrapper URLs are aligned"

# Local Postgres helpers
.PHONY: local-db-up local-db-migrate local-db-psql local-db-psql-cmd local-db-down local-db-destroy local-db-status local-db-logs
local-db-up:
	bash tools/local-db.sh up

local-db-migrate:
	bash tools/local-db.sh migrate

local-db-psql:
	bash tools/local-db.sh psql

local-db-psql-cmd:
	@[ -z "$(SQL)" ] && SQL="select 1" || true; \
	bash tools/local-db.sh psql "$$SQL"

local-db-down:
	bash tools/local-db.sh down

local-db-destroy:
	bash tools/local-db.sh destroy

local-db-status:
	bash tools/local-db.sh status

local-db-logs:
	bash tools/local-db.sh logs

# Local dev orchestration (extensible)
.PHONY: local-up local-down local-destroy local-smoke
local-up:
	@echo "Starting Traefik reverse proxy..."
	bash tools/traefik.sh up
	@echo "Starting local services..."
	bash tools/local-up.sh up

local-down:
	@echo "Stopping local services..."
	bash tools/local-up.sh down
	@echo "Stopping Traefik reverse proxy..."
	bash tools/traefik.sh down

local-destroy:
	@echo "Destroying local services..."
	bash tools/local-up.sh destroy
	@echo "Stopping Traefik reverse proxy..."
	bash tools/traefik.sh down

local-smoke:
	bash tools/local-up.sh smoke

# Rapid service management for development
.PHONY: local-restart local-rebuild local-reload local-status
local-restart:
	@if [ -n "$(SERVICE)" ]; then \
		bash tools/service-manager.sh restart --service $(SERVICE); \
	else \
		bash tools/service-manager.sh restart; \
	fi

local-rebuild:
	@if [ -n "$(SERVICE)" ]; then \
		bash tools/service-manager.sh rebuild --service $(SERVICE); \
	else \
		bash tools/service-manager.sh rebuild; \
	fi

local-reload:
	@if [ -n "$(SERVICE)" ]; then \
		bash tools/service-manager.sh reload --service $(SERVICE); \
	else \
		bash tools/service-manager.sh reload; \
	fi

local-status:
	bash tools/service-manager.sh status

# Traefik (local reverse proxy mirroring ALB routes)
.PHONY: traefik-up traefik-down traefik-status traefik-logs
traefik-up:
	bash tools/traefik.sh up

traefik-down:
	bash tools/traefik.sh down

traefik-status:
	bash tools/traefik.sh status

traefik-logs:
	bash tools/traefik.sh logs

# Dev helper: mint RS256 access/id tokens using the local dev key and stored creds
.PHONY: get-apple-token
get-apple-token:
	@set -euo pipefail; \
	KEY_PATH="user_service/dev-keys/oidc-private-key.pem"; \
	ENV_DIR="user_service/.dev"; \
	ENV_FILE="$$ENV_DIR/token.env"; \
	if [[ ! -f "$$KEY_PATH" ]]; then \
		command -v openssl >/dev/null 2>&1 || { echo "openssl not found; cannot generate dev key" >&2; exit 1; }; \
		mkdir -p "user_service/dev-keys"; \
		openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$$KEY_PATH"; \
		echo "[get-apple-token] generated dev RSA key at $$KEY_PATH"; \
	fi; \
	mkdir -p "$$ENV_DIR"; \
	if [[ ! -f "$$ENV_FILE" ]]; then \
		read -rp "Apple dev username (email): " u; \
		read -rsp "Apple dev password (stored locally): " p; echo; \
		printf "DEV_APPLE_USERNAME=%s\nDEV_APPLE_PASSWORD=%s\n" "$$u" "$$p" > "$$ENV_FILE"; \
		chmod 600 "$$ENV_FILE"; \
		echo "[get-apple-token] wrote $$ENV_FILE"; \
	else \
		. "$$ENV_FILE"; \
		if [[ -z "$$DEV_APPLE_USERNAME" || -z "$$DEV_APPLE_PASSWORD" ]]; then \
			read -rp "Apple dev username (email): " u; \
			read -rsp "Apple dev password (stored locally): " p; echo; \
			printf "DEV_APPLE_USERNAME=%s\nDEV_APPLE_PASSWORD=%s\n" "$$u" "$$p" > "$$ENV_FILE"; \
			chmod 600 "$$ENV_FILE"; \
			echo "[get-apple-token] updated $$ENV_FILE"; \
		fi; \
	fi; \
	TOOLS_OUT=$$(tools/get-apple-token.sh --json); \
	echo "$$TOOLS_OUT" | python3 -c 'import sys,json;d=json.load(sys.stdin); print("access_token:", d.get("access_token","")); print("id_token:", d.get("id_token","")); print("expires_in:", d.get("expires_in"))';
