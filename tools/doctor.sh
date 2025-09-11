#!/usr/bin/env bash
set -euo pipefail

say() { echo -e "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
hooks_dir="$(git rev-parse --git-path hooks 2>/dev/null || echo "$repo_root/.git/hooks")"

warns=0

say "== Doctor: Environment =="

# Java
JAVA_VER=$(java -version 2>&1 | head -n1 | sed -E 's/.*version "?([0-9]+).*/\1/' || true)
if [[ -n "$JAVA_VER" && "$JAVA_VER" -ge 21 ]]; then
  say "✔ Java: $JAVA_VER (>=21)"
else
  say "⚠ Java: ${JAVA_VER:-missing} — install JDK 21+"
  warns=$((warns+1))
fi

# Node
NODE_VER=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)
if [[ -n "$NODE_VER" && "$NODE_VER" -ge 20 ]]; then
  say "✔ Node: $NODE_VER (>=20)"
else
  say "⚠ Node: ${NODE_VER:-missing} — install Node 20+"
  warns=$((warns+1))
fi

# Python
if have python3.11; then
  say "✔ Python: $(python3.11 -V | cut -d' ' -f2) (3.11)"
elif have python3; then
  say "⚠ Python: $(python3 -V | cut -d' ' -f2) — recommend 3.11 (run: make setup)"
  warns=$((warns+1))
else
  say "⚠ Python: missing — recommend 3.11 (run: make setup)"
  warns=$((warns+1))
fi

# uv / pipx / nox / ruff
if have uv; then say "✔ uv present"; else say "ℹ uv not found (optional, make setup installs)"; fi
if have pipx; then say "✔ pipx present"; else say "ℹ pipx not found (optional, make setup installs)"; fi
if have nox; then say "✔ nox present ($(nox --version 2>/dev/null))"; else say "⚠ nox missing — pipx install nox (or run: make setup)"; warns=$((warns+1)); fi
if have ruff; then say "✔ ruff present ($(ruff --version 2>/dev/null))"; else say "ℹ ruff not found (optional, make setup installs)"; fi

echo "------------------------------------------------------------"
say "== Doctor: Git Hooks =="
HOOK_PATH="$hooks_dir/pre-commit"
EXPECTED="$repo_root/tools/hooks/pre-commit"
if [[ -f "$HOOK_PATH" ]]; then
  target="$(readlink "$HOOK_PATH" 2>/dev/null || echo "$HOOK_PATH")"
  if [[ "$target" == "$EXPECTED" ]]; then
    say "✔ pre-commit hook installed"
  else
    say "⚠ pre-commit hook differs (run: make hooks)"
    warns=$((warns+1))
  fi
else
  say "⚠ pre-commit hook missing (run: make hooks)"
  warns=$((warns+1))
fi

echo "------------------------------------------------------------"
say "== Doctor: Front-end =="
if have npm; then
  if [[ -d "$repo_root/front-end/mobile/node_modules" ]]; then
    say "✔ mobile dependencies installed"
  else
    say "⚠ mobile dependencies missing (run: make mobile-setup)"
    warns=$((warns+1))
  fi
  if [[ -f "$repo_root/front-end/app/package.json" ]]; then
    if [[ -d "$repo_root/front-end/app/node_modules" ]]; then
      say "✔ web dependencies installed"
    else
      say "ℹ web dependencies missing (optional, run: make web-setup)"
    fi
  fi
else
  say "⚠ npm not found — install Node (run: make setup)"
  warns=$((warns+1))
fi

echo "------------------------------------------------------------"
say "== Doctor: Gradle Wrapper Alignment =="
if make -s ci-gradle-align-check >/dev/null 2>&1; then
  say "✔ Gradle wrapper distribution URLs aligned"
else
  say "⚠ Gradle wrapper URLs mismatch (run: make gradle-align)"
  warns=$((warns+1))
fi

echo "------------------------------------------------------------"
if [[ "$warns" -eq 0 ]]; then
  say "✅ Doctor: All checks passed"
else
  say "ℹ Doctor: $warns warnings — see notes above"
fi

say "\nNext steps:"
say "  - make check        # lint + wrapper alignment"
say "  - make test         # java/mobile/lambda tests (nox required)"
say "  - make lambda-test-standalone  # fast Lambda tests (no nox)"

