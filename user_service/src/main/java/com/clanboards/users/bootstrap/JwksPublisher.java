package com.clanboards.users.bootstrap;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.model.SystemConfig;
import com.clanboards.users.repository.SystemConfigRepository;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Publishes JWKS (JSON Web Key Set) to the database on startup. This allows other services to
 * validate JWTs without making HTTP calls.
 */
@Component
@ConditionalOnProperty(
    value = "auth.oidc.jwks-publish",
    havingValue = "true",
    matchIfMissing = true)
public class JwksPublisher {

  private static final Logger logger = LoggerFactory.getLogger(JwksPublisher.class);

  private final KeyHolder keyHolder;
  private final SystemConfigRepository systemConfigRepository;
  private final String jwksDbKey;

  public JwksPublisher(
      KeyHolder keyHolder,
      SystemConfigRepository systemConfigRepository,
      @Value("${auth.oidc.jwks-db-key:oidc.jwks}") String jwksDbKey) {
    this.keyHolder = keyHolder;
    this.systemConfigRepository = systemConfigRepository;
    this.jwksDbKey = jwksDbKey;
  }

  /**
   * Publishes the current JWKS to the database on application startup. This method is called
   * automatically by Spring after bean construction.
   */
  @PostConstruct
  public void publishJwks() {
    logger.info("Publishing JWKS to database with key: {}", jwksDbKey);

    try {
      String jwksJson = keyHolder.jwksJson();
      logger.debug("Generated JWKS JSON: {}", jwksJson);

      // Check if config already exists
      SystemConfig config = systemConfigRepository.findByKey(jwksDbKey).orElse(new SystemConfig());

      config.setKey(jwksDbKey);
      config.setValue(jwksJson);
      config.setDescription("JWKS for OIDC validation");
      config.setUpdatedAt(Instant.now());

      systemConfigRepository.save(config);

      logger.info(
          "Successfully published JWKS to database. Key loaded at: {}", keyHolder.getLoadedAt());

    } catch (Exception e) {
      logger.error("Failed to publish JWKS to database for key: {}", jwksDbKey, e);
      throw new RuntimeException("Failed to publish JWKS to database for key: " + jwksDbKey, e);
    }
  }

  /**
   * Re-publishes JWKS to database. This method can be called when keys are rotated or when manual
   * refresh is needed.
   */
  public void republishJwks() {
    logger.info("Re-publishing JWKS to database...");
    publishJwks();
  }
}
