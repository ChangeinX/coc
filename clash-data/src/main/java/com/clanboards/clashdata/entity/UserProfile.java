package com.clanboards.clashdata.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false, unique = true)
  private Long userId;

  @Column(name = "risk_weight_war", nullable = false, columnDefinition = "FLOAT DEFAULT 0.40")
  private Double riskWeightWar = 0.40;

  @Column(name = "risk_weight_idle", nullable = false, columnDefinition = "FLOAT DEFAULT 0.35")
  private Double riskWeightIdle = 0.35;

  @Column(
      name = "risk_weight_don_deficit",
      nullable = false,
      columnDefinition = "FLOAT DEFAULT 0.15")
  private Double riskWeightDonDeficit = 0.15;

  @Column(name = "risk_weight_don_drop", nullable = false, columnDefinition = "FLOAT DEFAULT 0.10")
  private Double riskWeightDonDrop = 0.10;

  @Column(name = "is_leader", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
  private Boolean isLeader = false;

  @Column(name = "all_features", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
  private Boolean allFeatures = false;

  // Default constructor
  public UserProfile() {}

  // Constructor with userId for convenience
  public UserProfile(Long userId) {
    this.userId = userId;
  }

  // Getters and Setters
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

  public Double getRiskWeightWar() {
    return riskWeightWar;
  }

  public void setRiskWeightWar(Double riskWeightWar) {
    this.riskWeightWar = riskWeightWar;
  }

  public Double getRiskWeightIdle() {
    return riskWeightIdle;
  }

  public void setRiskWeightIdle(Double riskWeightIdle) {
    this.riskWeightIdle = riskWeightIdle;
  }

  public Double getRiskWeightDonDeficit() {
    return riskWeightDonDeficit;
  }

  public void setRiskWeightDonDeficit(Double riskWeightDonDeficit) {
    this.riskWeightDonDeficit = riskWeightDonDeficit;
  }

  public Double getRiskWeightDonDrop() {
    return riskWeightDonDrop;
  }

  public void setRiskWeightDonDrop(Double riskWeightDonDrop) {
    this.riskWeightDonDrop = riskWeightDonDrop;
  }

  public Boolean getIsLeader() {
    return isLeader;
  }

  public void setIsLeader(Boolean isLeader) {
    this.isLeader = isLeader;
  }

  public Boolean getAllFeatures() {
    return allFeatures;
  }

  public void setAllFeatures(Boolean allFeatures) {
    this.allFeatures = allFeatures;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    UserProfile that = (UserProfile) o;
    return Objects.equals(id, that.id) && Objects.equals(userId, that.userId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(id, userId);
  }

  @Override
  public String toString() {
    return "UserProfile{"
        + "id="
        + id
        + ", userId="
        + userId
        + ", riskWeightWar="
        + riskWeightWar
        + ", riskWeightIdle="
        + riskWeightIdle
        + ", riskWeightDonDeficit="
        + riskWeightDonDeficit
        + ", riskWeightDonDrop="
        + riskWeightDonDrop
        + ", isLeader="
        + isLeader
        + ", allFeatures="
        + allFeatures
        + '}';
  }
}
