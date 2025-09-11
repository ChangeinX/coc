SHELL := /bin/bash

# Configuration
JAVA_VERSION ?= 21
GRADLE_VERSION ?= 8.14.3
GRADLE_USER_HOME ?= $(CURDIR)/.gradle

# Java modules in this monorepo
JAVA_MODULES := java-auth-common messages-java user_service notifications recruiting clash-data

.PHONY: help
help:
	@echo "Available targets:";
	@echo "  hooks                   Install pre-commit git hook";
	@echo "  env-check               Show tool versions and warn on mismatches";
	@echo "  lint                    Lint Python + Java (spotless) + mobile";
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

.PHONY: hooks
hooks:
	bash tools/setup-git-hooks.sh

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
		nox -s tests ; \
	else \
		echo "nox not found. Install with: pipx install nox"; \
		exit 1; \
	fi

.PHONY: lambda-test-standalone
lambda-test-standalone:
	cd lambdas/refresh-worker && \
	python3 -m venv .venv && \
	source .venv/bin/activate && \
	pip install -r requirements-test.txt && \
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

