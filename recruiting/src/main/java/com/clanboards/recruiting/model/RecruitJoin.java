package com.clanboards.recruiting.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "recruit_joins")
public class RecruitJoin {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "post_id", nullable = false)
  private Long postId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "created_at")
  private Instant createdAt;

  public Long getId() {
    return id;
  }

  public Long getPostId() {
    return postId;
  }

  public void setPostId(Long postId) {
    this.postId = postId;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
