package com.clanboards.users.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;

public abstract class ServiceException extends RuntimeException {
  private final String requestPath;
  private final String requestMethod;
  private final String userAgent;
  private final String clientIp;
  private final Instant timestamp;

  protected ServiceException(String message) {
    super(message);
    this.requestPath = null;
    this.requestMethod = null;
    this.userAgent = null;
    this.clientIp = null;
    this.timestamp = Instant.now();
  }

  protected ServiceException(String message, HttpServletRequest request) {
    super(message);
    this.requestPath = request != null ? request.getRequestURI() : null;
    this.requestMethod = request != null ? request.getMethod() : null;
    this.userAgent = request != null ? request.getHeader("User-Agent") : null;
    this.clientIp = request != null ? getClientIpAddress(request) : null;
    this.timestamp = Instant.now();
  }

  public String getRequestPath() {
    return requestPath;
  }

  public String getRequestMethod() {
    return requestMethod;
  }

  public String getUserAgent() {
    return userAgent;
  }

  public String getClientIp() {
    return clientIp;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  private static String getClientIpAddress(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }
}
