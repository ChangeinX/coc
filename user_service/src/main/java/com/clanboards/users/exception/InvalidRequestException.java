package com.clanboards.users.exception;

public class InvalidRequestException extends ValidationException {
  public InvalidRequestException(String message) {
    super(message);
  }

  public InvalidRequestException(String message, String field) {
    super(message, field);
  }

  public InvalidRequestException(String message, String errorCode, String field) {
    super(message, errorCode, field);
  }
}
