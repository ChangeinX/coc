package com.clanboards.users.controller;

import com.clanboards.users.config.OidcProperties;
import com.clanboards.users.config.OidcPropertiesLoader;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private static final Logger logger = LoggerFactory.getLogger(HealthController.class);
  private final OidcProperties oidcProperties;
  private final OidcPropertiesLoader oidcPropertiesLoader;

  public HealthController(
      OidcProperties oidcProperties, OidcPropertiesLoader oidcPropertiesLoader) {
    this.oidcProperties = oidcProperties;
    this.oidcPropertiesLoader = oidcPropertiesLoader;
  }

  @GetMapping("/api/v1/health")
  public Map<String, String> health() {
    logger.debug("Health check");
    return Map.of("status", "ok");
  }

  @GetMapping("/api/v1/health/oidc")
  public Map<String, String> oidcConfig() {
    logger.debug("OIDC configuration check");
    return Map.of(
        "issuer", oidcProperties.getIssuer(),
        "audience", oidcProperties.getAudience(),
        "kid", oidcProperties.getKid());
  }

  @PostMapping("/api/v1/health/oidc/refresh")
  public Map<String, String> refreshOidcConfig() {
    logger.info("Manual OIDC configuration refresh requested");
    oidcPropertiesLoader.refresh();
    return Map.of(
        "status", "refreshed",
        "issuer", oidcProperties.getIssuer(),
        "audience", oidcProperties.getAudience(),
        "kid", oidcProperties.getKid());
  }
}
