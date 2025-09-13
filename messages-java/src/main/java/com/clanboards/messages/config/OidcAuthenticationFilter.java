package com.clanboards.messages.config;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
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
          "/api/v1/chat/debug/jwks-cache",
          "/api/v1/chat/socket",
          "/api/v1/chat/socket/info",
          "/api/v1/chat/socket/sockjs-node");

  public OidcAuthenticationFilter(OidcTokenValidator tokenValidator) {
    this.tokenValidator = tokenValidator;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    // Skip authentication for excluded paths
    return EXCLUDED_PATHS.contains(path)
        || path.startsWith("/actuator/")
        || path.startsWith("/api/v1/chat/socket/");
  }

  @Override
  protected boolean shouldNotFilterAsyncDispatch() {
    // Ensure authentication runs on async dispatches (e.g., Spring GraphQL),
    // otherwise secondary dispatches can lose SecurityContext and trigger 401s.
    return false;
  }

  @Override
  protected boolean shouldNotFilterErrorDispatch() {
    // Also run during error dispatch to maintain consistent auth context.
    return false;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String requestUri = request.getRequestURI();
    String method = request.getMethod();
    String requestId = org.slf4j.MDC.get("requestId");
    logger.debug(
        "[{}] Processing authentication for {} {}",
        requestId != null ? requestId : "unknown",
        method,
        requestUri);

    // Check if userId is already set (e.g., by another auth mechanism)
    if (request.getAttribute("userId") != null) {
      logger.debug(
          "[{}] UserId already set by another mechanism, skipping OIDC validation",
          requestId != null ? requestId : "unknown");
      filterChain.doFilter(request, response);
      return;
    }

    String token = extractToken(request);
    if (token != null) {
      logger.debug(
          "[{}] Found authentication token, validating...",
          requestId != null ? requestId : "unknown");
      try {
        Claims claims = tokenValidator.validateToken(token);
        logger.debug(
            "[{}] Token validation successful. Claims: issuer={}, audience={}, subject={}, expiration={}",
            requestId != null ? requestId : "unknown",
            claims.getIssuer(),
            claims.getAudience(),
            claims.getSubject(),
            claims.getExpiration());

        Long userId = tokenValidator.extractUserId(claims);
        logger.debug(
            "[{}] Extracted userId from token: {}",
            requestId != null ? requestId : "unknown",
            userId);

        if (userId != null) {
          request.setAttribute("userId", String.valueOf(userId));
          request.setAttribute("authenticated", true);
          // Populate Spring Security context so downstream security checks pass
          try {
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                    String.valueOf(userId), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
          } catch (Exception e) {
            logger.error(
                "[{}] Failed to set SecurityContext authentication: {}",
                requestId != null ? requestId : "unknown",
                e.getMessage(),
                e);
            sendUnauthorized(response, "Authentication failed", requestId);
            return;
          }

          logger.debug(
              "[{}] REST request authenticated for userId: {}",
              requestId != null ? requestId : "unknown",
              userId);
          // Small info-level breadcrumb to aid production debugging without leaking sensitive data
          logger.info(
              "[{}] Auth OK {} {} userId={}",
              requestId != null ? requestId : "unknown",
              method,
              requestUri,
              userId);
        } else {
          logger.warn(
              "[{}] Valid token but could not extract userId. Claims: {}",
              requestId != null ? requestId : "unknown",
              claims);
          sendUnauthorized(response, "Invalid user in token", requestId);
          return;
        }
      } catch (OidcTokenValidator.TokenValidationException e) {
        logger.warn(
            "[{}] Token validation failed for {} {}: {}",
            requestId != null ? requestId : "unknown",
            method,
            requestUri,
            e.getMessage());
        sendUnauthorized(response, "Invalid or expired token", requestId);
        return;
      } catch (Exception e) {
        logger.error(
            "[{}] Unexpected token validation error for {} {}: {}",
            requestId != null ? requestId : "unknown",
            method,
            requestUri,
            e.getMessage(),
            e);
        sendUnauthorized(response, "Authentication failed", requestId);
        return;
      }
    } else {
      // No token provided for protected endpoint
      logger.warn(
          "[{}] No authentication token provided for protected endpoint: {} {}",
          requestId != null ? requestId : "unknown",
          method,
          requestUri);
      sendUnauthorized(response, "Authentication required", requestId);
      return;
    }

    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    String requestId = org.slf4j.MDC.get("requestId");

    // Try Authorization header first
    String authHeader = request.getHeader("Authorization");
    logger.debug(
        "[{}] Authorization header present: {}",
        requestId != null ? requestId : "unknown",
        authHeader != null);
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7);
      logger.debug(
          "[{}] Extracted Bearer token from Authorization header (length: {})",
          requestId != null ? requestId : "unknown",
          token.length());
      return token;
    }

    // Fallback to cookie-based session
    String cookie = request.getHeader("Cookie");
    logger.debug(
        "[{}] Cookie header present: {}",
        requestId != null ? requestId : "unknown",
        cookie != null);
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        String trimmed = part.trim();
        if (trimmed.startsWith("sid=")) {
          String token = trimmed.substring(4);
          logger.debug(
              "[{}] Extracted session token from cookie (length: {})",
              requestId != null ? requestId : "unknown",
              token.length());
          return token;
        }
      }
      logger.debug(
          "[{}] No 'sid' cookie found in cookie header", requestId != null ? requestId : "unknown");
    }

    logger.debug(
        "[{}] No authentication token found in request headers",
        requestId != null ? requestId : "unknown");
    return null;
  }

  private void sendUnauthorized(HttpServletResponse response, String message, String requestId)
      throws IOException {
    logger.warn(
        "[{}] Sending 401 Unauthorized response: {}",
        requestId != null ? requestId : "unknown",
        message);
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + message + "\"}");
  }
}
