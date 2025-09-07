package com.clanboards.users.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OidcProperties {
  @Value("${oidc.issuer:https://users.local/oidc}")
  private String issuer;

  @Value("${oidc.audience:clanboards-mobile}")
  private String audience;

  @Value("${oidc.access-ttl:PT1H}")
  private Duration accessTtl;

  @Value("${oidc.id-ttl:PT1H}")
  private Duration idTtl;

  @Value("${oidc.refresh-ttl:P30D}")
  private Duration refreshTtl;

  @Value("${oidc.kid:dev-1}")
  private String kid;

  @Value("${apple.services-id:com.example.app}")
  private String appleServicesId;

  public String getIssuer() { return issuer; }
  public String getAudience() { return audience; }
  public Duration getAccessTtl() { return accessTtl; }
  public Duration getIdTtl() { return idTtl; }
  public Duration getRefreshTtl() { return refreshTtl; }
  public String getKid() { return kid; }
  public String getAppleServicesId() { return appleServicesId; }
}

