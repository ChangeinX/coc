package com.clanboards.auth.config;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * Provides a JwtDecoder backed by the existing OidcTokenValidator so services can use the Spring
 * Security OAuth2 Resource Server (JWT) flow without direct jjwt usage.
 */
@AutoConfiguration
public class OidcJwtDecoderConfiguration {
  private static final Logger log = LoggerFactory.getLogger(OidcJwtDecoderConfiguration.class);

  @Bean
  @ConditionalOnMissingBean(JwtDecoder.class)
  public JwtDecoder jwtDecoder(OidcTokenValidator tokenValidator) {
    return token -> {
      try {
        Claims claims = tokenValidator.validateToken(token);

        Map<String, Object> headers = new HashMap<>();
        // Algorithm is not exposed by jjwt Claims; we conservatively set header hints
        headers.putIfAbsent("alg", "RS256");

        Map<String, Object> claimMap = new HashMap<>();
        for (Map.Entry<String, Object> e : claims.entrySet()) {
          claimMap.put(e.getKey(), e.getValue());
        }

        Instant issuedAt = claims.getIssuedAt() != null ? claims.getIssuedAt().toInstant() : null;
        Instant expiresAt =
            claims.getExpiration() != null ? claims.getExpiration().toInstant() : null;

        String subject = claims.getSubject();
        if (subject != null) {
          claimMap.putIfAbsent("sub", subject);
        }
        if (claims.getIssuer() != null) {
          claimMap.putIfAbsent("iss", claims.getIssuer());
        }
        if (claims.getAudience() != null) {
          claimMap.putIfAbsent("aud", claims.getAudience());
        }

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
