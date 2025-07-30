package com.clanboards.messages.controller;

import com.clanboards.messages.service.ModerationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ErrorHandler {
  private static final Logger log = LoggerFactory.getLogger(ErrorHandler.class);

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
    log.warn("Bad request", ex);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(ModerationException.class)
  public ResponseEntity<Map<String, String>> handleModeration(ModerationException ex) {
    log.info("Message blocked", ex);
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
    log.error("Internal server error", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Internal server error"));
  }
}
