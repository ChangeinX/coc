#!/usr/bin/env bash
set -euo pipefail

# Idempotently ensure a Python 3.11 interpreter is available on PATH as `python3.11`.
# Strategy:
#  1) Use existing python3.11 if present
#  2) Prefer installing via `uv` (fast, cross-platform)
#  3) Fallback to Homebrew on macOS if available
#  4) Fallback to pyenv if available

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
bin_dir="$repo_root/.tools/bin"
mkdir -p "$bin_dir"

have() { command -v "$1" >/dev/null 2>&1; }

link_python() {
  local src="$1"
  if [[ -x "$src" ]]; then
    ln -sf "$src" "$bin_dir/python3.11"
    echo "Using python3.11 → $src"
    return 0
  fi
  return 1
}

# 1) Already installed?
if have python3.11; then
  link_python "$(command -v python3.11)" && exit 0
fi

echo "python3.11 not found; attempting to install (uv/brew/pyenv)…"

# 2) Try uv (preferred)
install_with_uv() {
  # Ensure uv is available
  if ! have uv; then
    # uv installs to ~/.local/bin by default
    if have curl; then
      echo "Installing uv…"
      curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1 || true
      export PATH="$HOME/.local/bin:$PATH"
    fi
  fi
  if have uv; then
    echo "Installing CPython 3.11 via uv…"
    uv python install 3.11 >/dev/null 2>&1 || true
    # Find interpreter path
    if py_path=$(uv python find 3.11 2>/dev/null); then
      link_python "$py_path" && return 0
    fi
  fi
  return 1
}

# 3) Try Homebrew on macOS
install_with_brew() {
  if [[ "${OSTYPE:-}" == darwin* ]] && have brew; then
    echo "Installing python@3.11 via Homebrew…"
    brew install python@3.11 >/dev/null 2>&1 || true
    if py_prefix=$(brew --prefix python@3.11 2>/dev/null); then
      link_python "$py_prefix/bin/python3.11" && return 0
    fi
  fi
  return 1
}

# 4) Try pyenv
install_with_pyenv() {
  if have pyenv; then
    local ver="3.11.9"
    echo "Installing CPython $ver via pyenv…"
    pyenv install -s "$ver" >/dev/null 2>&1 || true
    local root; root=$(pyenv root)
    link_python "$root/versions/$ver/bin/python3.11" && return 0
  fi
  return 1
}

if install_with_uv || install_with_brew || install_with_pyenv; then
  python3.11 -V || true
  exit 0
fi

echo "⚠️  Could not provision Python 3.11 automatically."
echo "Please install one of the following manually and re-run 'make setup':"
echo "  - uv:   curl -LsSf https://astral.sh/uv/install.sh | sh && uv python install 3.11"
echo "  - brew: brew install python@3.11"
echo "  - pyenv: pyenv install 3.11.9"
exit 0

