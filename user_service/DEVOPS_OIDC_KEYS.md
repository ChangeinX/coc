# DEV Runbook: Stabilize OIDC Signing Keys (DEV)

This runbook stabilizes JWT verification in DEV by pinning the user_service signing key and reducing the JWKS cache window in messages-java.

Why: Tokens are signed with a key whose `kid` remains constant (e.g., `dev-1`) while the RSA private key changes across restarts. messages-java caches JWKS for 15 minutes, so a same-`kid`/new-key drift causes signature mismatch until cache expiry.

Outcome: Persistent RSA private key in DEV, predictable `kid`, quick JWKS cache refresh, and predictable verification.

---

## Immediate Actions (DEV)

1) Set persistent OIDC private key in user_service

- Generate a PKCS#8 RSA private key (PEM, unencrypted):

  ```bash
  # PKCS#8 (BEGIN PRIVATE KEY)
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out oidc-private-key.pem
  ```

- Store the PEM in your secrets manager (e.g., AWS Secrets Manager or SSM Parameter). Ensure newlines are preserved. The PEM must be in PKCS#8 format and begin with `-----BEGIN PRIVATE KEY-----`.

- Inject into user_service as an environment variable/property named `oidc.private-key-pem`. For Spring Boot, the equivalent environment variable is `OIDC_PRIVATE_KEY_PEM`.

  Examples:
  - ECS task definition (Secrets Manager): map secret → env var `OIDC_PRIVATE_KEY_PEM` (multi-line supported).
  - Kubernetes (if used):

    ```yaml
    env:
      - name: OIDC_PRIVATE_KEY_PEM
        valueFrom:
          secretKeyRef:
            name: user-service-oidc
            key: private-key-pem
    ```

- Keep `oidc.kid` stable in DEV (default is `dev-1`). If you cannot set the persistent key immediately, temporarily change `oidc.kid` each time the private key changes to force consumers to refresh.

  - Property: `oidc.kid`
  - Environment variable: `OIDC_KID`

2) Reduce JWKS cache TTL in messages-java (DEV only)

- Property: `auth.oidc.keys-cache-duration-minutes`
- Environment variable: `AUTH_OIDC_KEYS_CACHE_DURATION_MINUTES`
- Set to `1` in DEV to shrink drift windows if ephemeral keys persist during rollout.

3) Restart messages-java once JWKS is correct

- After setting the persistent key and (optionally) TTL, restart messages-java to immediately clear its in-memory JWKS cache.

---

## Verification Checklist

1) Verify user_service JWKS (HTTP)

- GET `https://dev.api.clan-boards.com/api/v1/users/oauth2/jwks.json`
- Confirm:
  - `kid` matches `oidc.kid` (e.g., `dev-1`)
  - The modulus `n` corresponds to the configured private key (will change if key changed)

2) Verify DB-backed JWKS (system_config)

- Run (against the shared DEV DB):

  ```sql
  SELECT key, value, updated_at
  FROM system_config
  WHERE key IN ('oidc.jwks', 'oidc.issuer', 'oidc.audience');
  ```

- Confirm `value` for `oidc.jwks` reflects the same `kid` and key parameters as the HTTP JWKS above.

3) Validate via messages-java debug endpoints

- `GET /api/v1/chat/debug/config` should show:
  - `issuer`: `https://dev.api.clan-boards.com/api/v1/users`
  - `audience`: `clanboards-mobile`
  - `jwksSource`: `db`
  - `disallowHttp`: `true`

- `POST /api/v1/chat/debug/validate` with a fresh `access_token` should return `{"valid": true, ...}`.

4) Validate from the mobile app

- Developer Settings → Messages Debug → Validate should show `valid: true` and claims matching issuer/audience.

---

## Option B (Temporary): Bump `kid` on key change

If a persistent private key cannot be provisioned immediately:

1) Generate a new key (as above) and set it in `OIDC_PRIVATE_KEY_PEM`.
2) Set a new `OIDC_KID` value (e.g., `dev-2025-09-11T2140`).
3) Deploy user_service. It will publish the updated JWKS to `system_config` with the new `kid`.
4) messages-java will receive tokens with the new `kid`. Because the `kid` is unknown in cache, it will fetch JWKS immediately and verify correctly.

Note: Keep JWKS cache TTL low (`AUTH_OIDC_KEYS_CACHE_DURATION_MINUTES=1`) during this period.

---

## Property Names Reference (Spring Boot)

- user_service:
  - `oidc.private-key-pem` → env `OIDC_PRIVATE_KEY_PEM` (REQUIRED for persistence)
  - `oidc.kid` → env `OIDC_KID` (keep stable; bump only on rotation)
  - `oidc.issuer` → env `OIDC_ISSUER` (must match ALB domain `/api/v1/users` path)
  - `oidc.audience` → env `OIDC_AUDIENCE` (default `clanboards-mobile`)

- messages-java:
  - `auth.oidc.keys-cache-duration-minutes` → env `AUTH_OIDC_KEYS_CACHE_DURATION_MINUTES` (set `1` in DEV)
  - `auth.oidc.disallow-http` → env `AUTH_OIDC_DISALLOW_HTTP` (keep `true`)
  - `auth.oidc.jwks-source` → env `AUTH_OIDC_JWKS_SOURCE` (keep `db`)
  - `auth.oidc.jwks-db-key` → env `AUTH_OIDC_JWKS_DB_KEY` (keep `oidc.jwks`)

Spring maps env variables (upper-case, underscores) to dotted/kebab properties automatically.

---

## Rollout Steps (DEV)

1) Create and store `OIDC_PRIVATE_KEY_PEM` in Secrets Manager/SSM.
2) Set `OIDC_KID=dev-1` (or keep existing kid if already stable).
3) Deploy user_service to DEV.
4) Confirm JWKS via HTTP and DB (Verification section).
5) Set `AUTH_OIDC_KEYS_CACHE_DURATION_MINUTES=1` in messages-java (DEV only).
6) Restart messages-java in DEV once to clear cache.
7) Validate via messages debug and mobile app.

---

## Troubleshooting

- SignatureException persists:
  - Ensure the PEM is PKCS#8 (`BEGIN PRIVATE KEY`) and unencrypted. PKCS#1 (`BEGIN RSA PRIVATE KEY`) is not accepted by current code.
  - Verify `OIDC_PRIVATE_KEY_PEM` preserves actual newlines. Many platforms handle multi-line secrets correctly when injected via secrets managers.
  - Check that `user_service` published a new JWKS entry (`system_config.key='oidc.jwks'`) with a timestamp near deployment time.
  - Compare `kid` in token header vs JWKS. If they match and still fail, modulus `n` likely mismatches → re-inject correct PEM and redeploy.

- New tokens still fail after restart:
  - Confirm `auth.oidc.issuer` and `auth.oidc.audience` values in `system_config` exactly match token claims.
  - Verify mobile is using fresh tokens (sign out/in or refresh flow).

---

## Future Hardening (to be implemented with TDD)

- java-auth-common (JwksService):
  - Invalidate cache when `JwksContentProvider.lastUpdated()` changes.
  - On signature failure for a known `kid`, force a one-time JWKS refresh and retry.
  - Tests: simulate same-`kid`/new-key in DB → refresh → verification succeeds.

- user_service:
  - Tests to ensure JWKS matches the active signing key and `kid`.
  - Enforce either persistent private key or mandatory `kid` bump when key changes.

- Observability:
  - Add a debug endpoint in messages-java (DEV) to expose cached `kid`s and a fingerprint (e.g., SHA-256 of modulus) to aid diagnosis. Surface this in the mobile developer view.

