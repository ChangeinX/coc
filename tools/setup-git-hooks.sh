#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook_src="$repo_root/tools/hooks/pre-commit"
hook_dst="$repo_root/.git/hooks/pre-commit"

if [[ ! -f "$hook_src" ]]; then
  echo "Hook source not found: $hook_src" >&2
  exit 1
fi

mkdir -p "$repo_root/.git/hooks"
chmod +x "$hook_src"
ln -sf "$hook_src" "$hook_dst"

echo "Installed pre-commit hook → $hook_dst"
echo "You can customize behavior with env vars, e.g.:"
echo "  PRECOMMIT_VERBOSE=1 git commit -m '...'"
echo "  PRECOMMIT_JAVA_TESTS=1 git commit -m '...'"

