package com.clanboards.messages.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

class StatusCapturingResponseWrapper extends HttpServletResponseWrapper {
  private int status = 200; // Default to 200

  public StatusCapturingResponseWrapper(HttpServletResponse response) {
    super(response);
  }

  @Override
  public void setStatus(int sc) {
    this.status = sc;
    super.setStatus(sc);
  }

  @Override
  public void sendError(int sc) throws IOException {
    this.status = sc;
    super.sendError(sc);
  }

  @Override
  public void sendError(int sc, String msg) throws IOException {
    this.status = sc;
    super.sendError(sc, msg);
  }

  public int getCapturedStatus() {
    return status;
  }
}

@Component
@Order(0) // Run before authentication filter
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    // Generate a unique request ID for tracing (or use client-provided one)
    String requestId = request.getHeader("X-Request-ID");
    if (requestId == null || requestId.isBlank()) {
      requestId = UUID.randomUUID().toString().substring(0, 8);
    }
    MDC.put("requestId", requestId);

    String method = request.getMethod();
    String uri = request.getRequestURI();
    String remoteAddr = request.getRemoteAddr();
    String userAgent = request.getHeader("User-Agent");
    boolean isHealthCheck = uri.contains("/health");

    // Log incoming request (always log non-health checks, conditionally log health checks)
    if (!isHealthCheck) {
      logger.info(
          "=== INCOMING REQUEST [{}] === {} {} from {} (UA: {})",
          requestId,
          method,
          uri,
          remoteAddr,
          userAgent != null ? userAgent.substring(0, Math.min(50, userAgent.length())) : "none");
    } else {
      logger.debug(
          "=== HEALTH CHECK REQUEST [{}] === {} {} from {}", requestId, method, uri, remoteAddr);
    }

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
    StatusCapturingResponseWrapper responseWrapper = new StatusCapturingResponseWrapper(response);

    try {
      filterChain.doFilter(request, responseWrapper);
    } finally {
      long duration = System.currentTimeMillis() - startTime;
      int status = responseWrapper.getCapturedStatus();

      String userId = (String) request.getAttribute("userId");
      boolean authenticated = Boolean.TRUE.equals(request.getAttribute("authenticated"));

      // Enhanced logging for error responses and non-health checks
      if (!isHealthCheck || status != 200) {
        if (status >= 400) {
          logger.warn(
              "=== ERROR RESPONSE [{}] === {} {} -> {} ({}ms) [userId: {}, authenticated: {}]",
              requestId,
              method,
              uri,
              status,
              duration,
              userId != null ? userId : "none",
              authenticated);

          // Log additional details for 403/401 errors
          if (status == 403 || status == 401) {
            logger.warn(
                "[{}] Auth details - hasAuthHeader: {}, hasCookie: {}, extractedUserId: {}",
                requestId,
                request.getHeader("Authorization") != null,
                request.getHeader("Cookie") != null,
                userId);
          }
        } else {
          logger.info(
              "=== RESPONSE [{}] === {} {} -> {} ({}ms) [userId: {}, authenticated: {}]",
              requestId,
              method,
              uri,
              status,
              duration,
              userId != null ? userId : "none",
              authenticated);
        }
      }

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
