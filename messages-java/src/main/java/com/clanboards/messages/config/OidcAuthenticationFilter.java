package com.clanboards.messages.config;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(1)
public class OidcAuthenticationFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(OidcAuthenticationFilter.class);

  private final OidcTokenValidator tokenValidator;

  // Endpoints that don't require authentication
  private static final Set<String> EXCLUDED_PATHS =
      Set.of(
          "/api/v1/health",
          "/api/v1/chat/health",
          "/actuator/health",
          "/health",
          "/api/v1/chat/debug/config",
          "/api/v1/chat/debug/validate",
          "/api/v1/chat/debug/request-info",
          "/api/v1/chat/debug/jwks-cache");

  public OidcAuthenticationFilter(OidcTokenValidator tokenValidator) {
    this.tokenValidator = tokenValidator;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    // Skip authentication for excluded paths
    return EXCLUDED_PATHS.contains(path) || path.startsWith("/actuator/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String requestUri = request.getRequestURI();
    String method = request.getMethod();
    logger.debug("Processing authentication for {} {}", method, requestUri);

    // Check if userId is already set (e.g., by another auth mechanism)
    if (request.getAttribute("userId") != null) {
      logger.debug("UserId already set by another mechanism, skipping OIDC validation");
      filterChain.doFilter(request, response);
      return;
    }

    String token = extractToken(request);
    if (token != null) {
      logger.debug("Found authentication token, validating...");
      try {
        Claims claims = tokenValidator.validateToken(token);
        logger.debug(
            "Token validation successful. Claims: issuer={}, audience={}, subject={}, expiration={}",
            claims.getIssuer(),
            claims.getAudience(),
            claims.getSubject(),
            claims.getExpiration());

        Long userId = tokenValidator.extractUserId(claims);
        logger.debug("Extracted userId from token: {}", userId);

        if (userId != null) {
          request.setAttribute("userId", String.valueOf(userId));
          request.setAttribute("authenticated", true);
          logger.debug("REST request authenticated for userId: {}", userId);
          // Small info-level breadcrumb to aid production debugging without leaking sensitive data
          logger.info("Auth OK {} {} userId={}", method, requestUri, userId);
        } else {
          logger.warn("Valid token but could not extract userId. Claims: {}", claims);
          sendUnauthorized(response, "Invalid user in token");
          return;
        }
      } catch (OidcTokenValidator.TokenValidationException e) {
        logger.warn("Token validation failed for {} {}: {}", method, requestUri, e.getMessage());
        sendUnauthorized(response, "Invalid or expired token");
        return;
      } catch (Exception e) {
        logger.error(
            "Unexpected token validation error for {} {}: {}",
            method,
            requestUri,
            e.getMessage(),
            e);
        sendUnauthorized(response, "Authentication failed");
        return;
      }
    } else {
      // No token provided for protected endpoint
      logger.warn(
          "No authentication token provided for protected endpoint: {} {}", method, requestUri);
      sendUnauthorized(response, "Authentication required");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    // Try Authorization header first
    String authHeader = request.getHeader("Authorization");
    logger.debug("Authorization header present: {}", authHeader != null);
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7);
      logger.debug("Extracted Bearer token from Authorization header (length: {})", token.length());
      return token;
    }

    // Fallback to cookie-based session
    String cookie = request.getHeader("Cookie");
    logger.debug("Cookie header present: {}", cookie != null);
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        String trimmed = part.trim();
        if (trimmed.startsWith("sid=")) {
          String token = trimmed.substring(4);
          logger.debug("Extracted session token from cookie (length: {})", token.length());
          return token;
        }
      }
      logger.debug("No 'sid' cookie found in cookie header");
    }

    logger.debug("No authentication token found in request headers");
    return null;
  }

  private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + message + "\"}");
  }
}
