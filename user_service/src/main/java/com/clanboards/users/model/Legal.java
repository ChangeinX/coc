package com.clanboards.users.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "legal")
public class Legal {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "accepted", nullable = false)
  private Boolean accepted = false;

  @Column(name = "version", length = 20)
  private String version;

  @Column(name = "acknowledged_disclaimer", nullable = false)
  private Boolean acknowledgedDisclaimer = false;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", insertable = false, updatable = false)
  private User user;

  public Integer getId() {
    return id;
  }

  public void setId(Integer id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public Boolean getAccepted() {
    return accepted;
  }

  public void setAccepted(Boolean accepted) {
    this.accepted = accepted;
  }

  public String getVersion() {
    return version;
  }

  public void setVersion(String version) {
    this.version = version;
  }

  public Boolean getAcknowledgedDisclaimer() {
    return acknowledgedDisclaimer;
  }

  public void setAcknowledgedDisclaimer(Boolean acknowledgedDisclaimer) {
    this.acknowledgedDisclaimer = acknowledgedDisclaimer;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }
}
