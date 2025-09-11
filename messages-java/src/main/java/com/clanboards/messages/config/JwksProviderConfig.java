package com.clanboards.messages.config;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.messages.repository.SystemConfigRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Configuration for JWKS providers in the messages service. */
@Configuration
public class JwksProviderConfig {

  /**
   * Creates a database-backed JWKS provider when jwks-source is set to "db". This bean will be
   * automatically picked up by the java-auth-common library.
   */
  @Bean
  @ConditionalOnProperty(name = "auth.oidc.jwks-source", havingValue = "db", matchIfMissing = true)
  public DbJwksProvider dbJwksProvider(
      SystemConfigRepository systemConfigRepository, OidcProperties oidcProperties) {
    return new DbJwksProvider(systemConfigRepository, oidcProperties.getJwksDbKey());
  }
}
