package com.clanboards.messages.controller;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat/debug")
public class DebugController {
  private static final Logger logger = LoggerFactory.getLogger(DebugController.class);

  private final OidcProperties oidcProperties;
  private final OidcTokenValidator tokenValidator;

  public DebugController(OidcProperties oidcProperties, OidcTokenValidator tokenValidator) {
    this.oidcProperties = oidcProperties;
    this.tokenValidator = tokenValidator;
  }

  @GetMapping("/config")
  public ResponseEntity<Map<String, Object>> getConfig() {
    logger.info("Debug config endpoint called");

    Map<String, Object> config = new HashMap<>();
    config.put("issuer", oidcProperties.getIssuer());
    config.put("audience", oidcProperties.getAudience());
    config.put("jwksSource", oidcProperties.getJwksSource());
    config.put("jwksDbKey", oidcProperties.getJwksDbKey());
    config.put("disallowHttp", oidcProperties.isDisallowHttp());
    config.put("keysCacheDurationMinutes", oidcProperties.getKeysCacheDurationMinutes());
    config.put("connectionTimeoutSeconds", oidcProperties.getConnectionTimeoutSeconds());
    config.put("currentTime", Instant.now().toString());

    return ResponseEntity.ok(config);
  }

  @PostMapping("/validate")
  public ResponseEntity<Map<String, Object>> validateToken(
      @RequestBody Map<String, String> request) {
    String token = request.get("token");
    logger.info(
        "Debug validate endpoint called with token length: {}",
        token != null ? token.length() : "null");

    Map<String, Object> result = new HashMap<>();
    result.put("timestamp", Instant.now().toString());

    if (token == null || token.trim().isEmpty()) {
      result.put("error", "Token is required");
      return ResponseEntity.badRequest().body(result);
    }

    try {
      // Validate the token
      Claims claims = tokenValidator.validateToken(token);

      result.put("valid", true);
      result.put(
          "claims",
          Map.of(
              "issuer", claims.getIssuer(),
              "audience", claims.getAudience(),
              "subject", claims.getSubject(),
              "expiration", claims.getExpiration().toInstant().toString(),
              "issuedAt",
                  claims.getIssuedAt() != null ? claims.getIssuedAt().toInstant().toString() : null,
              "allClaims", claims));

      // Try to extract user ID
      Long userId = tokenValidator.extractUserId(claims);
      result.put("extractedUserId", userId);

      logger.info("Debug token validation successful for userId: {}", userId);

    } catch (OidcTokenValidator.TokenValidationException e) {
      result.put("valid", false);
      result.put("error", e.getMessage());
      result.put("errorType", "TokenValidationException");
      logger.warn("Debug token validation failed: {}", e.getMessage());

    } catch (Exception e) {
      result.put("valid", false);
      result.put("error", e.getMessage());
      result.put("errorType", e.getClass().getSimpleName());
      logger.error("Debug token validation error: {}", e.getMessage(), e);
    }

    return ResponseEntity.ok(result);
  }

  @GetMapping("/request-info")
  public ResponseEntity<Map<String, Object>> getRequestInfo(HttpServletRequest request) {
    logger.info("Debug request-info endpoint called");

    Map<String, Object> info = new HashMap<>();
    info.put("method", request.getMethod());
    info.put("requestURI", request.getRequestURI());
    info.put("queryString", request.getQueryString());
    info.put("remoteAddr", request.getRemoteAddr());
    info.put("userAgent", request.getHeader("User-Agent"));

    // Extract headers (excluding sensitive ones)
    Map<String, String> headers = new HashMap<>();
    java.util.Enumeration<String> headerNames = request.getHeaderNames();
    while (headerNames.hasMoreElements()) {
      String headerName = headerNames.nextElement();
      if (!headerName.toLowerCase().contains("authorization")
          && !headerName.toLowerCase().contains("cookie")) {
        headers.put(headerName, request.getHeader(headerName));
      } else {
        headers.put(headerName, "[REDACTED]");
      }
    }
    info.put("headers", headers);

    // Check for authentication tokens
    String authHeader = request.getHeader("Authorization");
    boolean hasBearerToken = authHeader != null && authHeader.startsWith("Bearer ");
    info.put("hasBearerToken", hasBearerToken);
    if (hasBearerToken) {
      info.put("bearerTokenLength", authHeader.substring(7).length());
    }

    String cookie = request.getHeader("Cookie");
    boolean hasSidCookie = false;
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        if (part.trim().startsWith("sid=")) {
          hasSidCookie = true;
          info.put("sidCookieLength", part.trim().substring(4).length());
          break;
        }
      }
    }
    info.put("hasSidCookie", hasSidCookie);

    return ResponseEntity.ok(info);
  }
}
