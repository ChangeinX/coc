package com.clanboards.auth.web;

import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.auth.service.OidcTokenValidator.TokenValidationException;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

@Order(1)
public class OidcAuthenticationFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(OidcAuthenticationFilter.class);

  private final OidcTokenValidator tokenValidator;

  public OidcAuthenticationFilter(OidcTokenValidator tokenValidator) {
    this.tokenValidator = tokenValidator;
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
          request.setAttribute("userId", userId);
          request.setAttribute("authenticated", true);
          logger.debug("REST request authenticated for userId: {}", userId);
        }
      } catch (TokenValidationException e) {
        logger.debug("Invalid token in REST request: {}", e.getMessage());
      }
    }

    filterChain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    // Try Authorization header first
    String auth = request.getHeader("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      return auth.substring(7);
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
}
