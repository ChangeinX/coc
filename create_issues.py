"""GitHub issue helper to create and read issues.

This script interacts with the GitHub API using a token stored in the
``CODEX_ISSUES_COC`` environment variable. By default it targets the
``ChangeinX/coc`` repository, but any ``owner/repo`` slug can be supplied.

Example usages::

    # Create a bug report
    python create_issues.py create bug --title "Login spinner" \
        --summary "Full-page spinner" --steps "1. Open" --expected "Modal only"

    # List open issues
    python create_issues.py list

    # Show a single issue
    python create_issues.py show 12
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any

import requests


TOKEN = os.getenv("CODEX_ISSUES_COC")
if not TOKEN:
    print("CODEX_ISSUES_COC environment variable is not set", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
}


def create_issue(args: argparse.Namespace) -> None:
    if args.template == "bug":
        body = (
            f"**Summary**\n{args.summary}\n\n"
            f"**Steps to reproduce**\n{args.steps}\n\n"
            f"**Expected behavior**\n{args.expected}\n\n"
            f"**Screenshots or logs**\n{args.screenshots}"
        )
        title = f"[Bug]: {args.title}"
        labels = ["bug"]
    else:
        body = (
            f"**Problem statement**\n{args.problem}\n\n"
            f"**Proposed solution**\n{args.solution}\n\n"
            f"**Alternatives considered**\n{args.alternatives}\n\n"
            f"**Additional context**\n{args.context}"
        )
        title = f"[Feature]: {args.title}"
        labels = ["enhancement"]

    payload: dict[str, Any] = {"title": title, "body": body, "labels": labels}
    resp = requests.post(
        f"https://api.github.com/repos/{args.repo}/issues",
        json=payload,
        headers=HEADERS,
    )
    if resp.status_code == 201:
        print(f"Created issue: {resp.json().get('html_url')}")
    else:
        print(
            f"Failed to create issue: {resp.status_code} {resp.text}",
            file=sys.stderr,
        )


def list_issues(args: argparse.Namespace) -> None:
    params = {"state": args.state, "per_page": args.limit}
    resp = requests.get(
        f"https://api.github.com/repos/{args.repo}/issues",
        headers=HEADERS,
        params=params,
    )
    if resp.ok:
        for issue in resp.json():
            print(f"#{issue['number']}: {issue['title']}")
    else:
        print(
            f"Failed to fetch issues: {resp.status_code} {resp.text}",
            file=sys.stderr,
        )


def show_issue(args: argparse.Namespace) -> None:
    resp = requests.get(
        f"https://api.github.com/repos/{args.repo}/issues/{args.number}",
        headers=HEADERS,
    )
    if resp.ok:
        issue = resp.json()
        print(f"#{issue['number']}: {issue['title']}\n\n{issue['body']}")
    else:
        print(
            f"Failed to fetch issue: {resp.status_code} {resp.text}",
            file=sys.stderr,
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage GitHub issues")
    sub = parser.add_subparsers(dest="command", required=True)

    # create subcommand
    create = sub.add_parser("create", help="Create a new issue")
    create.add_argument(
        "template",
        choices=["bug", "feature"],
        help="Issue template to use",
    )
    create.add_argument("--repo", default="ChangeinX/coc", help="owner/repo slug")
    create.add_argument("--title", required=True, help="Issue title without prefix")

    # Template specific options parsed later
    create.add_argument("--summary")
    create.add_argument("--steps")
    create.add_argument("--expected")
    create.add_argument("--screenshots", default="N/A")
    create.add_argument("--problem")
    create.add_argument("--solution")
    create.add_argument("--alternatives", default="")
    create.add_argument("--context", default="")
    create.set_defaults(func=create_issue)

    # list subcommand
    list_cmd = sub.add_parser("list", help="List issues")
    list_cmd.add_argument("--repo", default="ChangeinX/coc", help="owner/repo slug")
    list_cmd.add_argument("--state", choices=["open", "closed", "all"], default="open")
    list_cmd.add_argument("--limit", type=int, default=20, help="number of issues to show")
    list_cmd.set_defaults(func=list_issues)

    # show subcommand
    show = sub.add_parser("show", help="Show a single issue")
    show.add_argument("number", type=int, help="issue number")
    show.add_argument("--repo", default="ChangeinX/coc", help="owner/repo slug")
    show.set_defaults(func=show_issue)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "create" and args.template == "bug":
        for param in ("summary", "steps", "expected"):
            if getattr(args, param) is None:
                parser.error(f"--{param} is required for bug template")
    if args.command == "create" and args.template == "feature":
        for param in ("problem", "solution"):
            if getattr(args, param) is None:
                parser.error(f"--{param} is required for feature template")

    args.func(args)


if __name__ == "__main__":
    main()

