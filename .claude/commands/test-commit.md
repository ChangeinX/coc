---
allowed-tools: Task, Bash(git *), Bash(nox:*), Bash(npm test), Bash(./gradlew:*)
argument-hint: "[commit message]"
description: Run tests before committing code changes
---

You must create a commit for the current code changes, but FIRST you must ensure all tests pass. Follow this strict workflow:

1. **MANDATORY: Run the test-runner agent first**
   - Use the Task tool with subagent_type "test-runner" 
   - The test-runner agent MUST execute and pass all tests before proceeding
   - If any tests fail, DO NOT proceed with the commit
   - Fix any failing tests before continuing

2. **Only after tests pass, proceed with git commit workflow:**
   - Run git status and git diff in parallel to see changes
   - Run git log to understand commit message style
   - Add relevant files to staging
   - Create commit with message: "$ARGUMENTS"
   - If no arguments provided, generate appropriate commit message
   - Always end commit message with: 🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>

**CRITICAL**: Never commit if tests are failing. The test-runner agent is mandatory and must pass completely before any git operations.
