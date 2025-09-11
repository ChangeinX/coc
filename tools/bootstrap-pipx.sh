#!/usr/bin/env bash
set -euo pipefail

# Ensure pipx exists and install the provided packages if missing.
# Usage: bootstrap-pipx.sh nox ruff <more>

have() { command -v "$1" >/dev/null 2>&1; }

ensure_pipx() {
  if have pipx; then
    echo "pipx available"
    return 0
  fi
  echo "pipx not found; attempting user install via pip…"
  if have python3; then
    python3 -m pip install --user pipx >/dev/null 2>&1 || true
    python3 -m pipx ensurepath >/dev/null 2>&1 || true
    export PATH="$HOME/.local/bin:$PATH"
    if have pipx; then
      echo "pipx installed"
      return 0
    fi
  fi
  echo "⚠️  Unable to install pipx automatically. You can install manually:"
  echo "   python3 -m pip install --user pipx && python3 -m pipx ensurepath"
  return 1
}

install_pkgs() {
  local ok=0
  for pkg in "$@"; do
    # If the package exposes a binary with the same name, prefer that check
    if have "$pkg"; then
      echo "$pkg already installed"
      continue
    fi
    echo "Installing $pkg via pipx…"
    if have pipx; then
      pipx install "$pkg" >/dev/null || ok=1
    else
      # Fallback: python -m pipx if PATH not refreshed yet
      python3 -m pipx install "$pkg" >/dev/null || ok=1
    fi
  done
  return $ok
}

ensure_pipx || true
install_pkgs "$@" || true

