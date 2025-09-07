# Repository Guidelines

This document applies only to the front-end folder, which contains a Vite-based React app (`app/`) and a small public Next.js site (`public-home/`). Use Node 18+.

## Project Structure & Module Organization
- `app/`: Main dashboard (React + Vite).
  - `src/components/`: Reusable UI pieces (PascalCase component files).
  - `src/pages/`: Routed pages and screens.
  - `src/hooks/`, `src/lib/`: Custom hooks and utilities.
  - `scripts/`: Build helpers (e.g., service worker key replacement).
- `public-home/`: Minimal Next.js public site.

## Build, Test, and Development Commands
- Install deps: `cd app && npm install`
- Dev server (dashboard): `cd app && npm run dev`
- Tests (Vitest): `cd app && npm test`
- Production build (dashboard): `cd app && npm run build`
- Preview build: `cd app && npm run preview`
- Public site: `cd public-home && npm run dev|build|start`
- Notes: Build embeds `VITE_COMMIT_HASH` and a legal version via `scripts/get-legal-version.js`; ensure git is available during builds.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; ES modules only.
- Components: `PascalCase` files and names (e.g., `UserCard.jsx`).
- Functions/vars: `camelCase`; constants `UPPER_SNAKE_CASE`.
- Co-locate tests next to sources or under `__tests__/`. Avoid default exports for components unless necessary.

## Testing Guidelines
- Frameworks: Vitest + Testing Library (`@testing-library/react`, `jest-dom`) with `jsdom`.
- Test files: `*.test.(js|jsx|ts|tsx)`; example: `Button.test.jsx`.
- Run: `cd app && npm test`. Keep tests deterministic; prefer user-oriented queries over implementation details.

## Commit & Pull Request Guidelines
- Commits: Conventional style (e.g., `feat:`, `fix:`, `chore:`); small, focused diffs.
- PRs: clear description, linked issues, and screenshots/GIFs for UI changes. Mention any build-script or env var changes.
- Pre-flight: run `npm test` and `npm run build` in `app/`; update docs if behavior or structure changes.

## Security & Configuration Tips
- Do not commit secrets; use local `.env` files as needed. Treat `VITE_` env vars as public at build time. Validate inputs at component boundaries and sanitize any HTML injection points.
