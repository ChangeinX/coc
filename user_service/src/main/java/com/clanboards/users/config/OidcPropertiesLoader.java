package com.clanboards.users.config;

import com.clanboards.users.repository.SystemConfigRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OidcPropertiesLoader {

  private static final Logger logger = LoggerFactory.getLogger(OidcPropertiesLoader.class);

  private static final String OIDC_ISSUER_KEY = "oidc.issuer";
  private static final String OIDC_AUDIENCE_KEY = "oidc.audience";

  private final SystemConfigRepository configRepository;
  private final OidcProperties oidcProperties;
  private final boolean loadOnStartup;

  public OidcPropertiesLoader(
      SystemConfigRepository configRepository,
      OidcProperties oidcProperties,
      @Value("${oidc.load-on-startup:true}") boolean loadOnStartup) {
    this.configRepository = configRepository;
    this.oidcProperties = oidcProperties;
    this.loadOnStartup = loadOnStartup;
  }

  @PostConstruct
  public void init() {
    if (!loadOnStartup) {
      logger.info("Skipping OIDC DB load at startup (oidc.load-on-startup=false)");
      return;
    }
    doLoadFromDatabase();
  }

  private void doLoadFromDatabase() {
    logger.info("Loading OIDC configuration from database...");

    String issuer =
        configRepository.findByKey(OIDC_ISSUER_KEY).map(cfg -> cfg.getValue()).orElse(null);

    String audience =
        configRepository.findByKey(OIDC_AUDIENCE_KEY).map(cfg -> cfg.getValue()).orElse(null);

    if (issuer == null || issuer.isBlank()) {
      logger.warn(
          "OIDC issuer not found in database (key: '{}'), using application.properties value: {}",
          OIDC_ISSUER_KEY,
          oidcProperties.getIssuer());
    } else {
      logger.info("Setting OIDC issuer from database: {}", issuer);
      oidcProperties.setIssuer(issuer);
    }

    if (audience == null || audience.isBlank()) {
      logger.warn(
          "OIDC audience not found in database (key: '{}'), using application.properties value: {}",
          OIDC_AUDIENCE_KEY,
          oidcProperties.getAudience());
    } else {
      logger.info("Setting OIDC audience from database: {}", audience);
      oidcProperties.setAudience(audience);
    }

    logger.info(
        "OIDC configuration loaded - Issuer: {}, Audience: {}",
        oidcProperties.getIssuer(),
        oidcProperties.getAudience());
  }

  public void refresh() {
    logger.info("Refreshing OIDC configuration from database...");
    doLoadFromDatabase();
  }
}
