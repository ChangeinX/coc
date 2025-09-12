package com.clanboards.messages.config;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

@Configuration
public class OidcJwtDecoderConfig {
  private static final Logger log = LoggerFactory.getLogger(OidcJwtDecoderConfig.class);

  @Bean
  public JwtDecoder jwtDecoder(OidcTokenValidator tokenValidator) {
    return token -> {
      try {
        Claims claims = tokenValidator.validateToken(token);

        Map<String, Object> headers = new HashMap<>();
        headers.put("alg", "RS256");

        Map<String, Object> claimMap = new HashMap<>();
        for (Map.Entry<String, Object> e : claims.entrySet()) {
          claimMap.put(e.getKey(), e.getValue());
        }

        Instant issuedAt = claims.getIssuedAt() != null ? claims.getIssuedAt().toInstant() : null;
        Instant expiresAt =
            claims.getExpiration() != null ? claims.getExpiration().toInstant() : null;

        // Ensure subject is present for principal naming
        String subject = claims.getSubject();

        return new Jwt(token, issuedAt, expiresAt, headers, claimMap) {
          @Override
          public String getSubject() {
            return subject;
          }
        };
      } catch (OidcTokenValidator.TokenValidationException e) {
        log.warn("JWT decode failed: {}", e.getMessage());
        throw new JwtException("Invalid JWT: " + e.getMessage(), e);
      } catch (Exception e) {
        log.error("Unexpected JWT decode error: {}", e.getMessage(), e);
        throw new JwtException("Invalid JWT", e);
      }
    };
  }
}
