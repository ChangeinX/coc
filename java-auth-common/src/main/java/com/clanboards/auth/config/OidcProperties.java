package com.clanboards.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "auth.oidc")
public class OidcProperties {
  private String issuer = "http://localhost:8080";
  private String audience = "clanboards-mobile";
  private String userServiceUrl = "http://localhost:8080";
  private int keysCacheDurationMinutes = 15;
  private int connectionTimeoutSeconds = 10;

  public String getIssuer() {
    return issuer;
  }

  public void setIssuer(String issuer) {
    this.issuer = issuer;
  }

  public String getAudience() {
    return audience;
  }

  public void setAudience(String audience) {
    this.audience = audience;
  }

  public String getUserServiceUrl() {
    return userServiceUrl;
  }

  public void setUserServiceUrl(String userServiceUrl) {
    this.userServiceUrl = userServiceUrl;
  }

  public int getKeysCacheDurationMinutes() {
    return keysCacheDurationMinutes;
  }

  public void setKeysCacheDurationMinutes(int keysCacheDurationMinutes) {
    this.keysCacheDurationMinutes = keysCacheDurationMinutes;
  }

  public int getConnectionTimeoutSeconds() {
    return connectionTimeoutSeconds;
  }

  public void setConnectionTimeoutSeconds(int connectionTimeoutSeconds) {
    this.connectionTimeoutSeconds = connectionTimeoutSeconds;
  }

  public String getJwksUrl() {
    return userServiceUrl + "/api/v1/users/oauth2/jwks.json";
  }
}
