package com.clanboards.users.exception;

public class UnauthorizedException extends RuntimeException {
  private final String errorCode;
  private final String details;

  public UnauthorizedException(String message) {
    this(message, "UNAUTHORIZED", null);
  }

  public UnauthorizedException(String message, String errorCode) {
    this(message, errorCode, null);
  }

  public UnauthorizedException(String message, String errorCode, String details) {
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
