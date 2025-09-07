# Mobile Auth Migration (OIDC via User Service)

This guide defines the Apple-first move to OpenID Connect using the Java user_service (Spring Boot) as the issuer. Phase 1 validates native mobile auth (iOS first) without changing other services; Phase 2 adds full OIDC endpoints and prepares services to verify RS256 access tokens from user_service.

## Architecture Overview
- Issuer: `user_service` acts as OIDC provider for mobile.
- Identity Provider: Sign in with Apple (first). Others can follow.
- iOS: native Apple sign-in to get an Apple ID token, exchanged at our Flask endpoint for our tokens.
- Android: web-based Apple flow via Hosted UI (Flask) planned after iOS works.
- Tokens: Access (1h), ID (1h), Refresh (30d). Stored in SecureStore/Keychain. Bearer added by `apiClient`.
- Keys: RS256 with rotating keys exposed via JWKS from Flask. No symmetric HS256 for new tokens.

## Mobile Libraries & Deep Linking
- iOS: `expo-apple-authentication` for native Apple sign-in; exchange Apple `identityToken` with Flask.
- Android (next): `expo-auth-session` to our Flask Hosted UI (Apple web flow) with PKCE.
- App scheme: `clanboards` (already configured).
- Redirect URIs (for Android/web flow later): `clanboards://oauthredirect` (login), `clanboards://signout`.

## user_service OIDC Provider (Phase 1/2)
Endpoints to implement in user_service (under `/api/v1/users`):
- Phase 1 (mobile iOS works without touching services):
  - `POST /auth/apple/exchange` → body: `{ id_token }`
    - Verify Apple ID token signature using Apple JWKS.
    - Upsert user by `sub` (maps to `users.sub` in DB; store email/name if present).
    - Create refresh session in `coclib.models.Session` (reuse existing sessions table).
    - Mint RS256 access + ID tokens (1h) with `kid` header; return `{ access_token, refresh_token, id_token, expires_in }`.
  - `POST /oauth2/token` (grant_type=`refresh_token`) to rotate access tokens.
  - `POST /oauth2/revoke` (revoke refresh token/session).

- Phase 2 (OIDC compliance + Android/web):
  - `GET /.well-known/openid-configuration`
  - `GET /oauth2/jwks.json` (JWKS), with rotation plan (active + next key).
  - Authorization Code + PKCE endpoints for Hosted UI: `GET /oauth2/authorize`, `POST /oauth2/token` (grant_type=`authorization_code`).
  - `GET /userinfo` (basic claims from DB).

Claims & validation (access token):
- `iss`: our issuer base URL (e.g., `https://api.clanboards.example/oidc`).
- `aud`: mobile client id or API audience (define as `clanboards-mobile` for now).
- `sub`: stable user ID (Apple subject or internal mapping).
- Standard: `exp`, `iat`, `email` (if verified), `name` (optional), `scope` (space-delimited).

## Key Management
- Algorithm: RS256.
- Storage: private keys read from env/secret volume; JWKS published by Flask with `kid`.
- Rotation: maintain active + next key; rotate on schedule; include `kid` in signed tokens; keep previous for TTL overlap.

## Data Model Alignment
- Use existing `users` table (`sub`, `email`, `name`, `is_verified`, etc.).
- Use existing `sessions` table for refresh sessions (hash refresh token, expiry, UA/IP).
- No schema changes required to start.

## Infra & Secrets
- Apple Developer: Services ID (Client ID), Key ID, Team ID, private key (`.p8`).
- API domain with TLS; issuer URL will reference this.
- Secrets storage: `.p8` and RSA private keys in a secret manager; inject via env/volumes.
- Apple JWKS URL (for server verification): `https://appleid.apple.com/auth/keys`.

## Mobile iOS Flow (native + exchange)
1) App calls Apple sign-in; receives `identityToken` (JWT) and `user` info on first sign-in.
2) App POSTs `{ id_token: identityToken }` to `/auth/apple/exchange`.
3) Flask verifies Apple token, upserts user, creates session, returns our tokens.
4) App stores tokens in SecureStore and gates UI by `useAuthStore.isAuthenticated`.
5) App refreshes token before expiry using `/oauth2/token` with `refresh_token`.

Pseudocode (iOS):
```ts
import * as Apple from 'expo-apple-authentication';
import { apiFetch } from '@services/apiClient';
import { useAuthStore } from '@store/auth.store';

const signInWithApple = async () => {
  const credential = await Apple.signInAsync({
    requestedScopes: [
      Apple.AppleAuthenticationScope.FULL_NAME,
      Apple.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No identityToken');
  const res = await apiFetch('USER_SERVICE_BASE/api/v1/users/auth/apple/exchange', {
    method: 'POST',
    body: JSON.stringify({ id_token: credential.identityToken }),
  });
  await useAuthStore.getState().setTokens({
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
  });
};
```

## Android Plan (web flow)
- Implement Flask Hosted UI for Apple (Authorization Code + PKCE) and deep link back to `clanboards://oauthredirect`.
- Use `expo-auth-session` to drive the flow and exchange the code for tokens at our `/oauth2/token` endpoint.

## Token Lifetimes & Scopes
- Access: 1h; ID: 1h; Refresh: 30d.
- Scopes: `openid email profile` (API scopes to be defined later).
- Refresh rotation: issue new access tokens; refresh token reuse allowed initially; later enforce rotation if needed.

## Testing Matrix
- iOS Simulator/Device: native Apple sign-in, exchange, refresh, logout/deeplink.
- Android Emulator/Device: Hosted UI flow after Phase 2 endpoints exist.
- Error cases: cancelled auth, invalid Apple token, expired refresh token, offline.

## Next Steps
1) Implement Flask endpoints: `POST /auth/apple/exchange`, `POST /oauth2/token (refresh)`, `POST /oauth2/revoke`, `GET /oauth2/jwks.json`.
2) Generate RSA keypair(s), serve JWKS, configure issuer URL.
3) Wire iOS mobile login to exchange flow; secure storage and UI gating.
4) Add refresh handling in mobile and logout.
5) Plan/implement Hosted UI + PKCE for Android and publish discovery docs.
6) Prepare services to verify RS256 tokens against JWKS (later phase).
