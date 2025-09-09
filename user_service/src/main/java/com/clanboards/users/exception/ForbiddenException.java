package com.clanboards.users.exception;

public class ForbiddenException extends RuntimeException {
  private final String errorCode;
  private final String details;

  public ForbiddenException(String message) {
    this(message, "FORBIDDEN", null);
  }

  public ForbiddenException(String message, String errorCode) {
    this(message, errorCode, null);
  }

  public ForbiddenException(String message, String errorCode, String details) {
    super(message);
    this.errorCode = errorCode;
    this.details = details;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public String getDetails() {
    return details;
  }
}
