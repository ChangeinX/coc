package com.clanboards.recruiting.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "recruit_posts")
public class RecruitPost {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "clan_tag")
  private String clanTag;

  @Column(name = "call_to_action")
  private String callToAction;

  @Column(name = "created_at")
  private Instant createdAt;

  public Long getId() {
    return id;
  }

  public String getClanTag() {
    return clanTag;
  }

  public void setClanTag(String clanTag) {
    this.clanTag = clanTag;
  }

  public String getCallToAction() {
    return callToAction;
  }

  public void setCallToAction(String callToAction) {
    this.callToAction = callToAction;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
