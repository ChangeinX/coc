package com.clanboards.messages.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(0) // Run before authentication filter
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    // Generate a unique request ID for tracing
    String requestId = UUID.randomUUID().toString().substring(0, 8);
    MDC.put("requestId", requestId);

    String method = request.getMethod();
    String uri = request.getRequestURI();
    String remoteAddr = request.getRemoteAddr();
    String userAgent = request.getHeader("User-Agent");

    // Log incoming request
    logger.info(
        "=== INCOMING REQUEST [{}] === {} {} from {} (UA: {})",
        requestId,
        method,
        uri,
        remoteAddr,
        userAgent != null ? userAgent.substring(0, Math.min(50, userAgent.length())) : "none");

    // Log authentication headers (without sensitive data)
    String authHeader = request.getHeader("Authorization");
    if (authHeader != null) {
      if (authHeader.startsWith("Bearer ")) {
        logger.debug(
            "Request [{}] has Bearer token (length: {})",
            requestId,
            authHeader.substring(7).length());
      } else {
        logger.debug(
            "Request [{}] has Authorization header (type: {})",
            requestId,
            authHeader.split(" ")[0]);
      }
    } else {
      logger.debug("Request [{}] has no Authorization header", requestId);
    }

    String cookie = request.getHeader("Cookie");
    boolean hasSidCookie = false;
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        if (part.trim().startsWith("sid=")) {
          hasSidCookie = true;
          logger.debug(
              "Request [{}] has sid cookie (length: {})",
              requestId,
              part.trim().substring(4).length());
          break;
        }
      }
      if (!hasSidCookie) {
        logger.debug("Request [{}] has cookies but no sid cookie", requestId);
      }
    } else {
      logger.debug("Request [{}] has no cookies", requestId);
    }

    long startTime = System.currentTimeMillis();

    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - startTime;
      int status = response.getStatus();

      String userId = (String) request.getAttribute("userId");
      boolean authenticated = Boolean.TRUE.equals(request.getAttribute("authenticated"));

      logger.info(
          "=== RESPONSE [{}] === {} {} -> {} ({}ms) [userId: {}, authenticated: {}]",
          requestId,
          method,
          uri,
          status,
          duration,
          userId != null ? userId : "none",
          authenticated);

      // Clean up MDC
      MDC.remove("requestId");
    }
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    // Log all requests except actuator endpoints to reduce noise
    String path = request.getRequestURI();
    return path.startsWith("/actuator/") && !path.contains("/health");
  }
}
