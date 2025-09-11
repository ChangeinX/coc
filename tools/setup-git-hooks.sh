#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook_src="$repo_root/tools/hooks/pre-commit"
# Resolve the correct hooks directory (handles worktrees and bare repos)
hooks_dir="$(git rev-parse --git-path hooks)"
hook_dst="$hooks_dir/pre-commit"

if [[ ! -f "$hook_src" ]]; then
  echo "Hook source not found: $hook_src" >&2
  exit 1
fi

mkdir -p "$hooks_dir"
chmod +x "$hook_src"
ln -sf "$hook_src" "$hook_dst"

echo "Installed pre-commit hook → $hook_dst"
echo "You can customize behavior with env vars, e.g.:"
echo "  PRECOMMIT_VERBOSE=1 git commit -m '...'"
echo "  PRECOMMIT_JAVA_TESTS=1 git commit -m '...'"
