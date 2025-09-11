package com.clanboards.auth.service;

import java.time.Instant;

/**
 * Pluggable provider for JWKS content that can be implemented by consumers to provide JWKS data
 * from various sources (database, file, etc).
 */
public interface JwksContentProvider {

  /**
   * Loads and returns the JWKS JSON content as a string.
   *
   * @return JWKS JSON string containing the keys array
   * @throws RuntimeException if JWKS content cannot be loaded
   */
  String loadJwksJson();

  /**
   * Returns the last updated timestamp of the JWKS content. This can be used for smarter cache
   * invalidation.
   *
   * @return Instant when the JWKS was last updated, or null if unknown
   */
  default Instant lastUpdated() {
    return null;
  }
}
