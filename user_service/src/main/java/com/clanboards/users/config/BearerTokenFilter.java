package com.clanboards.users.config;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.model.Session;
import com.clanboards.users.repository.SessionRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.PublicKey;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(1) // Execute before SessionFilter (which doesn't have explicit order)
public class BearerTokenFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(BearerTokenFilter.class);
  private final KeyHolder keyHolder;
  private final OidcProperties oidcProperties;
  private final SessionRepository sessionRepository;

  public BearerTokenFilter(
      KeyHolder keyHolder, OidcProperties oidcProperties, SessionRepository sessionRepository) {
    this.keyHolder = keyHolder;
    this.oidcProperties = oidcProperties;
    this.sessionRepository = sessionRepository;
  }

  // Constructor for testing without SessionRepository dependency
  public BearerTokenFilter(KeyHolder keyHolder, OidcProperties oidcProperties) {
    this(keyHolder, oidcProperties, null);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    // Check if userId is already set (e.g., by cookie auth)
    if (request.getAttribute("userId") != null) {
      filterChain.doFilter(request, response);
      return;
    }

    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7);
      try {
        PublicKey publicKey = keyHolder.getPublicKey();
        Claims claims =
            Jwts.parserBuilder().setSigningKey(publicKey).build().parseClaimsJws(token).getBody();

        // Validate token claims
        String issuer = claims.getIssuer();
        String audience = claims.getAudience();
        Instant expiration = claims.getExpiration().toInstant();

        if (!oidcProperties.getIssuer().equals(issuer)) {
          logger.debug("Invalid issuer in token: {}", issuer);
          filterChain.doFilter(request, response);
          return;
        }

        if (!oidcProperties.getAudience().equals(audience)) {
          logger.debug("Invalid audience in token: {}", audience);
          filterChain.doFilter(request, response);
          return;
        }

        if (expiration.isBefore(Instant.now())) {
          logger.debug("Token expired at: {}", expiration);
          filterChain.doFilter(request, response);
          return;
        }

        // Extract user ID from token
        Long userId = extractUserId(claims);
        if (userId != null) {
          request.setAttribute("userId", userId);
          logger.debug("Bearer token authenticated for userId: {}", userId);
        }

      } catch (Exception e) {
        logger.debug("Invalid bearer token: {}", e.getMessage());
      }
    }

    filterChain.doFilter(request, response);
  }

  private Long extractUserId(Claims claims) {
    // First check if there's a session ID in the token
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
    // The sub claim contains the user's subject identifier
    // In TokenService, this is set to either user.getSub() or String.valueOf(user.getId())
    String sub = claims.getSubject();
    if (sub != null) {
      try {
        // Try to parse as Long directly (when sub is the user ID)
        return Long.parseLong(sub);
      } catch (NumberFormatException e) {
        // Sub might be in format like "google_123" or "apple_xyz"
        // In this case, we need the session to get the actual userId
        // Without session repository or a valid session, we can't determine the userId
        logger.debug("Cannot extract numeric userId from sub without session: {}", sub);
      }
    }

    return null;
  }
}
