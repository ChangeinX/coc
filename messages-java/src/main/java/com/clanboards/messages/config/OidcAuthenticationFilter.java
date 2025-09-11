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
      Set.of("/api/v1/health", "/api/v1/chat/health", "/actuator/health", "/health");

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

    // Check if userId is already set (e.g., by another auth mechanism)
    if (request.getAttribute("userId") != null) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = extractToken(request);
    if (token != null) {
      try {
        Claims claims = tokenValidator.validateToken(token);
        Long userId = tokenValidator.extractUserId(claims);

        if (userId != null) {
          request.setAttribute("userId", String.valueOf(userId));
          request.setAttribute("authenticated", true);
          logger.debug("REST request authenticated for userId: {}", userId);
        } else {
          logger.debug("Valid token but could not extract userId");
          sendUnauthorized(response, "Invalid user in token");
          return;
        }
      } catch (OidcTokenValidator.TokenValidationException e) {
        logger.debug("Invalid token in REST request: {}", e.getMessage());
        sendUnauthorized(response, "Invalid or expired token");
        return;
      } catch (Exception e) {
        logger.debug("Token validation error: {}", e.getMessage());
        sendUnauthorized(response, "Authentication failed");
        return;
      }
    } else {
      // No token provided for protected endpoint
      logger.debug(
          "No authentication token provided for protected endpoint: {}", request.getRequestURI());
      sendUnauthorized(response, "Authentication required");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    // Try Authorization header first
    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Fallback to cookie-based session
    String cookie = request.getHeader("Cookie");
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        String trimmed = part.trim();
        if (trimmed.startsWith("sid=")) {
          return trimmed.substring(4);
        }
      }
    }

    return null;
  }

  private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + message + "\"}");
  }
}
