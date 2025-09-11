package com.clanboards.messages.config;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.messages.repository.SystemConfigRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Loads OIDC configuration from database on startup. Falls back to application.yml values if
 * database values are not present.
 */
@Component
public class OidcPropertiesLoader {

  private static final Logger logger = LoggerFactory.getLogger(OidcPropertiesLoader.class);

  private static final String OIDC_ISSUER_KEY = "oidc.issuer";
  private static final String OIDC_AUDIENCE_KEY = "oidc.audience";
  private static final String OIDC_USER_SERVICE_URL_KEY = "oidc.user_service_url";

  private final SystemConfigRepository configRepository;
  private final OidcProperties oidcProperties;

  public OidcPropertiesLoader(
      SystemConfigRepository configRepository, OidcProperties oidcProperties) {
    this.configRepository = configRepository;
    this.oidcProperties = oidcProperties;
  }

  @PostConstruct
  public void loadFromDatabase() {
    logger.info("Loading OIDC configuration from database...");

    // Load issuer from database, fallback to existing value
    configRepository
        .findByKey(OIDC_ISSUER_KEY)
        .ifPresentOrElse(
            config -> {
              logger.info("Loaded issuer from database: {}", config.getValue());
              oidcProperties.setIssuer(config.getValue());
            },
            () ->
                logger.info(
                    "Using default issuer from application.yml: {}", oidcProperties.getIssuer()));

    // Load audience from database, fallback to existing value
    configRepository
        .findByKey(OIDC_AUDIENCE_KEY)
        .ifPresentOrElse(
            config -> {
              logger.info("Loaded audience from database: {}", config.getValue());
              oidcProperties.setAudience(config.getValue());
            },
            () ->
                logger.info(
                    "Using default audience from application.yml: {}",
                    oidcProperties.getAudience()));

    // Load user service URL from database, fallback to existing value
    configRepository
        .findByKey(OIDC_USER_SERVICE_URL_KEY)
        .ifPresentOrElse(
            config -> {
              logger.info("Loaded user service URL from database: {}", config.getValue());
              oidcProperties.setUserServiceUrl(config.getValue());
            },
            () ->
                logger.info(
                    "Using default user service URL from application.yml: {}",
                    oidcProperties.getUserServiceUrl()));

    logger.info(
        "OIDC configuration loaded - Issuer: {}, Audience: {}, User Service URL: {}, JWKS URL: {}",
        oidcProperties.getIssuer(),
        oidcProperties.getAudience(),
        oidcProperties.getUserServiceUrl(),
        oidcProperties.getJwksUrl());
  }

  /**
   * Refresh OIDC configuration from database. Can be called at runtime to update configuration
   * without restart.
   */
  public void refresh() {
    logger.info("Refreshing OIDC configuration from database...");
    loadFromDatabase();
  }
}
