# OIDC Migration Plan (user_service)

This document outlines the plan to turn the user_service into the OIDC issuer for the mobile app, starting with Apple Sign In on iOS and adding an Android web flow later. The goal for Phase 1 is to enable mobile authentication without modifying other services.

## Summary
- Issuer: user_service (Spring Boot)
- Keys: RS256, publish JWKS, implement rotation
- Apple: verify Apple ID token (via Apple JWKS), upsert `users` by `sub`
- Tokens: access (1h), id (1h), refresh (30d) stored in DB sessions
- Endpoints: exchange, token (refresh), revoke, JWKS, later discovery/authorize/userinfo

## Endpoints (under `/api/v1`)
- `POST /auth/apple/exchange`
  - Body: `{ "id_token": "<apple_identity_token>" }`
  - Steps: verify Apple token; upsert user; create session; issue RS256 `access_token`, `id_token`, and `refresh_token`
  - Response: `{ access_token, id_token, refresh_token, token_type: "Bearer", expires_in: 3600 }`
- `POST /oauth2/token`
  - grant_type=`refresh_token` → returns new access/id token pair
- `POST /oauth2/revoke`
  - Revokes refresh token/session
- `GET /oauth2/jwks.json`
  - Returns public keys (kid, n, e, kty=RSA, alg=RS256, use=sig)
- Phase 2:
  - `GET /.well-known/openid-configuration`
  - `GET /oauth2/authorize` (Authorization Code + PKCE)
  - `POST /oauth2/token` (grant_type=`authorization_code`)
  - `GET /userinfo`

## Claims
- iss: `${OIDC_ISSUER}` (env)
- aud: `clanboards-mobile` (default audience; can be refined)
- sub: Apple subject or internal stable mapping
- exp, iat; optionally `email`, `email_verified`, `name`

## Components
- Controller: `OidcController` for token/keys endpoints; `AuthController` (new method) for Apple exchange
- Service: `AppleTokenVerifier` to fetch and cache Apple JWKS and validate JWTs
- Service: `TokenService` to sign RS256 tokens and manage refresh sessions (hash refresh tokens)
- Config: `OidcProperties` (issuer, lifetimes), `KeyConfig` (RSA key loading & rotation), `JwksCache`
- Filter: Update or replace `SessionFilter` for new RS256 access token validation (later when other services migrate)

## Dependencies
- Keep `io.jsonwebtoken:jjwt-*` for RS256 signing
- Add `com.nimbusds:nimbus-jose-jwt` for JWKS verification (Apple)

## Data Model
- Reuse tables: `users`, `sessions`
- Store refresh token hash in `sessions.refresh_token_hash` with expiry

## Configuration
- OIDC_ISSUER: `https://users.api.clanboards.example/oidc` (or base service URL)
- JWT_ACCESS_TTL: `3600s`; JWT_ID_TTL: `3600s`; REFRESH_TTL: `30d`
- JWT_ACTIVE_KID: key id for active RSA key
- JWT_PRIVATE_KEY_PEM: path or inline PEM (use Secrets Manager/Parameter Store)
- APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID (client id), APPLE_PRIVATE_KEY_P8 (for web flow later)

## Rotation
- Maintain two RSA keys (active/next); publish both in JWKS (active flagged in config)
- Rotate by switching `JWT_ACTIVE_KID` and reloading keys; keep old key until token TTL passes

## Testing
- Unit: Apple token verifier (mock JWKS), TokenService signing and claim checks, JWKS endpoint shape
- Integration: MockMvc tests for exchange/refresh/revoke; verify DB sessions

## Mobile Integration
- iOS: use `expo-apple-authentication` to get `identityToken` and call `/api/v1/auth/apple/exchange`
- Store tokens in SecureStore; attach `Authorization: Bearer` to API calls (mobile-only for now)
- Refresh via `/api/v1/oauth2/token`

## Rollout
- Phase 1: iOS native Apple exchange live on dev; validate refresh/logout; Android pending Hosted UI
- Phase 2: add authorize/PKCE and discovery; plan verification updates in other services

