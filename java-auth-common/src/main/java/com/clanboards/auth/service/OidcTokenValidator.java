package com.clanboards.auth.service;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.model.Session;
import com.clanboards.auth.repository.SessionRepository;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OidcTokenValidator {
  private static final Logger logger = LoggerFactory.getLogger(OidcTokenValidator.class);

  private final JwksService jwksService;
  private final OidcProperties oidcProperties;
  private final SessionRepository<? extends Session> sessionRepository;

  public OidcTokenValidator(
      JwksService jwksService,
      OidcProperties oidcProperties,
      SessionRepository<? extends Session> sessionRepository) {
    this.jwksService = jwksService;
    this.oidcProperties = oidcProperties;
    this.sessionRepository = sessionRepository;
  }

  // Constructor for services without session repository
  public OidcTokenValidator(JwksService jwksService, OidcProperties oidcProperties) {
    this(jwksService, oidcProperties, null);
  }

  /**
   * Validates and parses a JWT token, returning the claims if valid.
   *
   * @param token The JWT token to validate
   * @return Claims if the token is valid
   * @throws TokenValidationException if the token is invalid
   */
  public Claims validateToken(String token) throws TokenValidationException {
    try {
      Claims claims = jwksService.parseAndValidateJwt(token);

      // Validate issuer
      String issuer = claims.getIssuer();
      if (!oidcProperties.getIssuer().equals(issuer)) {
        throw new TokenValidationException("Invalid issuer: " + issuer);
      }

      // Validate audience
      String audience = claims.getAudience();
      if (!oidcProperties.getAudience().equals(audience)) {
        throw new TokenValidationException("Invalid audience: " + audience);
      }

      // Validate expiration
      Instant expiration = claims.getExpiration().toInstant();
      if (expiration.isBefore(Instant.now())) {
        throw new TokenValidationException("Token expired at: " + expiration);
      }

      return claims;
    } catch (TokenValidationException e) {
      throw e;
    } catch (Exception e) {
      logger.debug("Token validation failed: {}", e.getMessage());
      throw new TokenValidationException("Invalid token", e);
    }
  }

  /**
   * Extracts the user ID from validated token claims.
   *
   * @param claims The validated JWT claims
   * @return The user ID, or null if not found
   */
  public Long extractUserId(Claims claims) {
    // First check if there's a session ID in the token and we have a session repository
    if (claims.containsKey("sid") && sessionRepository != null) {
      try {
        Long sessionId = ((Number) claims.get("sid")).longValue();
        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null && session.getExpiresAt().isAfter(Instant.now())) {
          return session.getUserId();
        }
      } catch (Exception e) {
        logger.debug("Failed to extract userId from session: {}", e.getMessage());
      }
    }

    // Check if there's a direct userId claim (for backwards compatibility)
    if (claims.containsKey("userId")) {
      try {
        return ((Number) claims.get("userId")).longValue();
      } catch (Exception e) {
        logger.debug("Failed to extract userId claim: {}", e.getMessage());
      }
    }

    // Fallback to extracting from sub claim
    String sub = claims.getSubject();
    if (sub != null) {
      try {
        // Try to parse as Long directly (when sub is the user ID)
        return Long.parseLong(sub);
      } catch (NumberFormatException e) {
        logger.debug("Cannot extract numeric userId from sub without session: {}", sub);
      }
    }

    return null;
  }

  public static class TokenValidationException extends Exception {
    public TokenValidationException(String message) {
      super(message);
    }

    public TokenValidationException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
