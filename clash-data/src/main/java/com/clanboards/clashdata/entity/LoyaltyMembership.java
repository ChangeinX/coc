package com.clanboards.clashdata.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "clan_memberships",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_clan_membership",
            columnNames = {"player_tag", "clan_tag", "joined_at"}))
public class LoyaltyMembership {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "player_tag", length = 15)
  private String playerTag;

  @Column(name = "clan_tag", length = 15)
  private String clanTag;

  @Column(name = "joined_at", nullable = false)
  private LocalDateTime joinedAt;

  @Column(name = "left_at")
  private LocalDateTime leftAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getPlayerTag() {
    return playerTag;
  }

  public void setPlayerTag(String playerTag) {
    this.playerTag = playerTag;
  }

  public String getClanTag() {
    return clanTag;
  }

  public void setClanTag(String clanTag) {
    this.clanTag = clanTag;
  }

  public LocalDateTime getJoinedAt() {
    return joinedAt;
  }

  public void setJoinedAt(LocalDateTime joinedAt) {
    this.joinedAt = joinedAt;
  }

  public LocalDateTime getLeftAt() {
    return leftAt;
  }

  public void setLeftAt(LocalDateTime leftAt) {
    this.leftAt = leftAt;
  }

  public boolean isActive() {
    return leftAt == null;
  }
}
