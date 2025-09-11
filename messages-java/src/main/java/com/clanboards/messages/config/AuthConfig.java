package com.clanboards.messages.config;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.service.JwksService;
import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.messages.model.Session;
import com.clanboards.messages.repository.SessionRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AuthConfig {

  @Bean
  @Primary
  public OidcTokenValidator oidcTokenValidatorWithSessions(
      JwksService jwksService, OidcProperties oidcProperties, SessionRepository sessionRepository) {
    // Create a wrapper that adapts the JPA repository to the auth interface
    com.clanboards.auth.repository.SessionRepository<Session> authSessionRepo =
        new com.clanboards.auth.repository.SessionRepository<Session>() {
          @Override
          public java.util.Optional<Session> findById(Long id) {
            return sessionRepository.findById(id);
          }
        };

    return new OidcTokenValidator(jwksService, oidcProperties, authSessionRepo);
  }
}
