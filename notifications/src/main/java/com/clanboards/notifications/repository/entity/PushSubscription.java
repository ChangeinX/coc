package com.clanboards.notifications.repository.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  private String endpoint;

  @Column(name = "p256dh_key")
  private String p256dhKey;

  @Column(name = "auth_key")
  private String authKey;

  @Column(name = "last_seen_at")
  private Instant lastSeenAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public String getP256dhKey() {
    return p256dhKey;
  }

  public void setP256dhKey(String p256dhKey) {
    this.p256dhKey = p256dhKey;
  }

  public String getAuthKey() {
    return authKey;
  }

  public void setAuthKey(String authKey) {
    this.authKey = authKey;
  }

  public Instant getLastSeenAt() {
    return lastSeenAt;
  }

  public void setLastSeenAt(Instant lastSeenAt) {
    this.lastSeenAt = lastSeenAt;
  }
}
