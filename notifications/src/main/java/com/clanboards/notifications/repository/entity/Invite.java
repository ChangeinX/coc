package com.clanboards.notifications.repository.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "invites")
public class Invite {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "from_user_id", nullable = false)
  private Long fromUserId;

  @Column(name = "to_user_id", nullable = false)
  private Long toUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public Invite() {}

  public Invite(Long fromUserId, Long toUserId) {
    this.fromUserId = fromUserId;
    this.toUserId = toUserId;
    this.createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getFromUserId() {
    return fromUserId;
  }

  public void setFromUserId(Long fromUserId) {
    this.fromUserId = fromUserId;
  }

  public Long getToUserId() {
    return toUserId;
  }

  public void setToUserId(Long toUserId) {
    this.toUserId = toUserId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
