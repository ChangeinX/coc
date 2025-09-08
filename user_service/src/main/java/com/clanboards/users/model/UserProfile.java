package com.clanboards.users.model;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name = "user_profiles")
public class UserProfile {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false, unique = true)
  private Long userId;

  @Column(name = "risk_weight_war", nullable = false)
  private Double riskWeightWar = 0.40;

  @Column(name = "risk_weight_idle", nullable = false)
  private Double riskWeightIdle = 0.35;

  @Column(name = "risk_weight_don_deficit", nullable = false)
  private Double riskWeightDonDeficit = 0.15;

  @Column(name = "risk_weight_don_drop", nullable = false)
  private Double riskWeightDonDrop = 0.10;

  @Column(name = "is_leader", nullable = false)
  private Boolean isLeader = false;

  @Column(name = "all_features", nullable = false)
  private Boolean allFeatures = false;

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(
      name = "user_profile_features",
      joinColumns = @JoinColumn(name = "profile_id"),
      inverseJoinColumns = @JoinColumn(name = "feature_id"))
  private Set<FeatureFlag> features;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", insertable = false, updatable = false)
  private User user;

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

  public Set<FeatureFlag> getFeatures() {
    return features;
  }

  public void setFeatures(Set<FeatureFlag> features) {
    this.features = features;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }
}
