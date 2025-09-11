package com.clanboards.auth.model;

import java.time.Instant;

/**
 * Interface for session entities that can be used with OIDC authentication. Services can implement
 * this interface with their own JPA entities.
 */
public interface Session {
  Long getId();

  Long getUserId();

  Instant getExpiresAt();
}
// no-op: trigger pre-commit java path (spotless)
