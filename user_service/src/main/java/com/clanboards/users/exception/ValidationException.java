package com.clanboards.users.exception;

public class ValidationException extends RuntimeException {
  private final String errorCode;
  private final String field;

  public ValidationException(String message) {
    this(message, "VALIDATION_ERROR", null);
  }

  public ValidationException(String message, String field) {
    this(message, "VALIDATION_ERROR", field);
  }

  public ValidationException(String message, String errorCode, String field) {
    super(message);
    this.errorCode = errorCode;
    this.field = field;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public String getField() {
    return field;
  }
}
