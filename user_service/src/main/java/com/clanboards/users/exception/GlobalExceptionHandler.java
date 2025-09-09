package com.clanboards.users.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record ErrorResponse(
      String error, String message, String details, String field, String path, Instant timestamp) {}

  @ExceptionHandler(UnauthorizedException.class)
  public ResponseEntity<ErrorResponse> handleUnauthorized(
      UnauthorizedException ex, HttpServletRequest request) {
    String clientInfo = getClientInfo(request);
    logger.warn(
        "Unauthorized access attempt: {} - Path: {} - {}",
        ex.getMessage(),
        request.getRequestURI(),
        clientInfo);

    ErrorResponse response =
        new ErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            ex.getDetails(),
            null,
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
  }

  @ExceptionHandler(ForbiddenException.class)
  public ResponseEntity<ErrorResponse> handleForbidden(
      ForbiddenException ex, HttpServletRequest request) {
    String clientInfo = getClientInfo(request);
    logger.warn(
        "Forbidden access attempt: {} - Path: {} - {}",
        ex.getMessage(),
        request.getRequestURI(),
        clientInfo);

    ErrorResponse response =
        new ErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            ex.getDetails(),
            null,
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFound(
      ResourceNotFoundException ex, HttpServletRequest request) {
    String resourceInfo =
        ex.getResourceType() != null && ex.getResourceId() != null
            ? String.format("%s with ID %s", ex.getResourceType(), ex.getResourceId())
            : "resource";

    String clientInfo = getClientInfo(request);
    logger.warn(
        "Resource not found: {} - Path: {} - {}",
        ex.getMessage(),
        request.getRequestURI(),
        clientInfo);

    Map<String, Object> details = new HashMap<>();
    if (ex.getResourceType() != null) details.put("resourceType", ex.getResourceType());
    if (ex.getResourceId() != null) details.put("resourceId", ex.getResourceId());

    ErrorResponse response =
        new ErrorResponse(
            "RESOURCE_NOT_FOUND",
            ex.getMessage(),
            details.isEmpty() ? null : details.toString(),
            null,
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ErrorResponse> handleValidation(
      ValidationException ex, HttpServletRequest request) {
    String clientInfo = getClientInfo(request);
    logger.warn(
        "Validation error: {} - Field: {} - Path: {} - {}",
        ex.getMessage(),
        ex.getField(),
        request.getRequestURI(),
        clientInfo);

    ErrorResponse response =
        new ErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            null,
            ex.getField(),
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(InvalidRequestException.class)
  public ResponseEntity<ErrorResponse> handleBadRequest(
      InvalidRequestException ex, HttpServletRequest request) {
    String clientInfo = getClientInfo(request);
    logger.warn(
        "Bad request: {} - Field: {} - Path: {} - {}",
        ex.getMessage(),
        ex.getField(),
        request.getRequestURI(),
        clientInfo);

    ErrorResponse response =
        new ErrorResponse(
            ex.getErrorCode(),
            ex.getMessage(),
            null,
            ex.getField(),
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception ex, HttpServletRequest request) {
    String clientInfo = getClientInfo(request);
    logger.error(
        "Unhandled error - Path: {} - {} - Exception: {}",
        request.getRequestURI(),
        clientInfo,
        ex.getClass().getSimpleName(),
        ex);

    ErrorResponse response =
        new ErrorResponse(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred. Please try again later.",
            null,
            null,
            request.getRequestURI(),
            Instant.now());

    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
  }

  private String getClientInfo(HttpServletRequest request) {
    String userAgent = request.getHeader("User-Agent");
    String clientIp = getClientIpAddress(request);
    return String.format(
        "IP: %s, UA: %s",
        clientIp != null ? clientIp : "unknown",
        userAgent != null ? userAgent.substring(0, Math.min(userAgent.length(), 100)) : "unknown");
  }

  private String getClientIpAddress(HttpServletRequest request) {
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
