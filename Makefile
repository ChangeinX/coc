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
	@echo "  lint                    Lint Python + Java (spotless) + mobile";
	@echo "  test                    Run Java tests, mobile tests, and lambda tests (via nox)";
	@echo "  lint-python             Run ruff on Python sources";
	@echo "  lint-java               Run spotlessCheck on all Java modules";
	@echo "  test-java               Run tests on all Java modules";
	@echo "  mobile-setup            Install mobile dependencies (npm ci)";
	@echo "  mobile-lint             ESLint for mobile app";
	@echo "  mobile-typecheck        TypeScript typecheck for mobile app";
	@echo "  mobile-test             Jest tests for mobile app";
	@echo "  web-setup               Install web dependencies (npm ci)";
	@echo "  web-test                Jest tests for web app";
	@echo "  web-build               Build web app (vite)";
	@echo "  lambda-test             Run Lambda tests via nox suite";
	@echo "  lambda-test-standalone  Run Lambda tests without nox (local venv)";
	@echo "  gradle-align            Align Gradle wrapper distribution across modules ($(GRADLE_VERSION))";

.PHONY: hooks
hooks:
	bash tools/setup-git-hooks.sh

# Aggregate
.PHONY: lint
lint: lint-python lint-java mobile-lint mobile-typecheck

.PHONY: test
test: test-java mobile-test lambda-test

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

