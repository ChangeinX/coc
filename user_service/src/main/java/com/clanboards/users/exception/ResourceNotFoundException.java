package com.clanboards.users.exception;

import jakarta.servlet.http.HttpServletRequest;

public class ResourceNotFoundException extends ServiceException {
  private final String resourceType;
  private final String resourceId;

  public ResourceNotFoundException(String message) {
    super(message);
    this.resourceType = null;
    this.resourceId = null;
  }

  public ResourceNotFoundException(String message, String resourceType, String resourceId) {
    super(message);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  public ResourceNotFoundException(
      String message, String resourceType, String resourceId, HttpServletRequest request) {
    super(message, request);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  public String getResourceType() {
    return resourceType;
  }

  public String getResourceId() {
    return resourceId;
  }
}
