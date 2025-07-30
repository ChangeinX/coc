package com.clanboards.messages.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "blocked")
public class BlockedUser {
  @Id private String userId;

  private Instant until;

  private Boolean permanent = Boolean.FALSE;

  private String reason;

  private Instant createdAt = Instant.now();

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public Instant getUntil() {
    return until;
  }

  public void setUntil(Instant until) {
    this.until = until;
  }

  public Boolean getPermanent() {
    return permanent;
  }

  public void setPermanent(Boolean permanent) {
    this.permanent = permanent;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
