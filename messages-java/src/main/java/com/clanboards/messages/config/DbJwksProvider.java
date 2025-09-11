package com.clanboards.messages.config;

import com.clanboards.auth.service.JwksContentProvider;
import com.clanboards.messages.model.SystemConfig;
import com.clanboards.messages.repository.SystemConfigRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Database-backed JWKS content provider that reads JWKS JSON from the system_config table. This
 * eliminates the need for HTTP calls to the user_service for JWKS data.
 */
@Component
public class DbJwksProvider implements JwksContentProvider {

  private static final Logger logger = LoggerFactory.getLogger(DbJwksProvider.class);

  private final SystemConfigRepository systemConfigRepository;
  private final String jwksDbKey;

  public DbJwksProvider(SystemConfigRepository systemConfigRepository, String jwksDbKey) {
    this.systemConfigRepository = systemConfigRepository;
    this.jwksDbKey = jwksDbKey;
  }

  @Override
  public String loadJwksJson() {
    logger.debug("Loading JWKS from database with key: {}", jwksDbKey);

    try {
      SystemConfig config =
          systemConfigRepository
              .findByKey(jwksDbKey)
              .orElseThrow(
                  () ->
                      new RuntimeException(
                          "JWKS configuration not found in database for key: "
                              + jwksDbKey
                              + ". "
                              + "Ensure the user_service has published JWKS to the database."));

      String jwksJson = config.getValue();
      if (jwksJson == null) {
        throw new RuntimeException("JWKS configuration value is null for key: " + jwksDbKey);
      }

      if (jwksJson.trim().isEmpty()) {
        throw new RuntimeException("JWKS configuration value is empty for key: " + jwksDbKey);
      }

      logger.debug(
          "Successfully loaded JWKS JSON from database (length: {} chars)", jwksJson.length());
      return jwksJson;

    } catch (Exception e) {
      if (e instanceof RuntimeException && e.getMessage().contains("JWKS configuration")) {
        // Re-throw our custom exceptions as-is
        throw e;
      }
      // Wrap unexpected database exceptions
      logger.error("Failed to load JWKS from database for key: {}", jwksDbKey, e);
      throw new RuntimeException("Failed to load JWKS from database for key: " + jwksDbKey, e);
    }
  }

  @Override
  public Instant lastUpdated() {
    try {
      return systemConfigRepository
          .findByKey(jwksDbKey)
          .map(SystemConfig::getUpdatedAt)
          .orElse(null);
    } catch (Exception e) {
      logger.warn("Failed to get JWKS last updated time for key: {}", jwksDbKey, e);
      return null;
    }
  }
}
