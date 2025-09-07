# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a microservices-based Clash of Clans dashboard built as a monorepo:

- **Front-end**: React 18 + Vite at `/front-end/app/` - HashRouter, IndexedDB offline storage
- **Back-end**: Flask 3.1.1 + PostgreSQL at `/back-end/` - Main API with `/api/v1` prefix  
- **Chat Service**: Spring Boot + GraphQL + WebSocket at `/messages-java/`
- **User Service**: Spring Boot authentication at `/user_service/`
- **Notifications Service**: Spring Boot push notifications at `/notifications/`
- **Recruiting Service**: Spring Boot clan recruitment at `/recruiting/`
- **Shared Library**: `coclib` - SQLAlchemy models, utilities, config shared across services

## Essential Development Commands

**Root Level Testing & Linting:**
```bash
nox -s lint tests    # Runs all tests, linting across entire monorepo
ruff back-end coclib db  # Manual Python linting
```

**Front-end** (from `/front-end/app/`):
```bash
npm run dev          # Vite dev server on :5173 with API proxy  
npm test            # Vitest with jsdom + React Testing Library
npm run build       # Production build with commit hash injection
```

**Backend** (from `/back-end/`):
```bash
python run.py       # Flask dev server with auto-reload
```

**Java Services** (from service directories):
```bash
./gradlew test spotlessCheck    # Test + code formatting check
./gradlew spotlessApply         # Auto-format code
```

## Critical Architecture Patterns

**API Route Organization:**
- Backend: `/back-end/app/api/[domain]_routes.py` (clan_routes.py, player_routes.py, etc.)
- All routes use `/api/v1` prefix, async/await pattern
- Business logic in `/back-end/app/services/`

**Database Models (coclib/models.py):**
- `ClanSnapshot`/`Clan` - Historical vs current clan data with JSON fields
- `PlayerSnapshot`/`Player` - Historical vs current player data  
- `WarSnapshot` - War tracking with full JSON blobs
- `LoyaltyMembership` - Clan membership history
- Shared across all services via coclib import

**Frontend Structure:**
- `/src/pages/` - Top-level routes (Dashboard.jsx, Scout.jsx, ChatPage.jsx, etc.)
- `/src/components/` - Reusable components
- `/src/hooks/` - Custom hooks (useAuth, useChat, usePlayerInfo, etc.)
- `/src/lib/` - Utilities (api.js for fetch helpers, db.js for IndexedDB, auth.js)

**Service Communication:**
- Frontend ↔ Backend: REST API with JWT cookie auth, CORS enabled
- Services ↔ Services: HTTP calls between microservices
- Chat: STOMP WebSocket protocol over `/websocket` endpoint
- Auth: Google Identity Services → JWT httpOnly cookies → User service validation

## Environment Configuration

**Required for Development:**
```bash
VITE_GOOGLE_CLIENT_ID=       # Google OAuth client ID (frontend)
GOOGLE_CLIENT_ID=            # Google OAuth client ID (backend)
JWT_SIGNING_KEY=             # HMAC key for JWT tokens
REDIS_URL=                   # Redis connection string
VITE_API_URL=http://localhost:8000  # Backend URL for dev
COOKIE_SECURE=false          # Disable secure flag for localhost
SESSION_MAX_AGE=2592000      # Session lifetime in seconds
DATABASE_URL=                # PostgreSQL connection string
COC_API_TOKEN=               # Clash of Clans API token (required)
```

**Vite Proxy Configuration:**
- Dev server proxies `/api` requests to `VITE_API_URL`
- Production uses relative paths (same host deployment)

## Testing Strategy

**Frontend (Vitest):**
- `npm test` - All tests with jsdom environment
- React Testing Library for component testing
- Tests co-located: `Component.jsx` + `Component.test.jsx`
- Setup in `vitest.setup.js`, fake-indexeddb for IndexedDB mocking

**Backend (pytest):**
- Test files in same directory as code
- Database fixtures and API testing
- Run via `nox -s tests` or direct pytest

**Java Services (JUnit):**
- MockMvc for integration testing
- Gradle test runner with comprehensive coverage

## Common Debugging Scenarios

**API Issues:**
- Check `back-end/app/api/[domain]_routes.py` for route definitions
- Business logic in `back-end/app/services/`
- Models in `coclib/models.py` - all data stored as JSON fields in most tables

**Auth Problems:**
- JWT cookies managed by User Service
- Google OAuth flow in frontend `lib/auth.js`
- 401 responses trigger `unauthorized` event in frontend

**Database Issues:**
- Migrations in `/migrations/` directory (Alembic)
- Models defined in `coclib/models.py` and shared across services
- Use `flask db` commands from `/db/` directory

**Frontend Issues:**
- Check browser console for API call failures
- IndexedDB cache in `lib/db.js` for offline functionality
- Routing via HashRouter in `src/main.jsx`

## Service-Specific Guidelines

Each service has detailed `AGENTS.md` files:
- `/back-end/AGENTS.md` - Flask API patterns
- `/front-end/app/AGENTS.md` - React component organization  
- `/coclib/AGENTS.md` - Shared library guidelines
- `[service]/AGENTS.md` - Spring Boot service specifics

## Deployment & CI/CD

**Build Process:**
- Selective building based on changed files
- Multi-platform Docker builds (ARM64)
- AWS ECS deployment with ECR registry
- CloudFront CDN for static assets

**Code Quality Gates:**
- All PRs must pass `nox -s lint tests`
- Frontend must pass `npm test` and `npm run build`
- Java services must pass `./gradlew test spotlessCheck`
- Ruff formatting enforced for Python code