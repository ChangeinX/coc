package com.clanboards.users.model;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name = "feature_flags")
public class FeatureFlag {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "name", nullable = false, unique = true, length = 50)
  private String name;

  @ManyToMany(mappedBy = "features")
  private Set<UserProfile> profiles;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public Set<UserProfile> getProfiles() {
    return profiles;
  }

  public void setProfiles(Set<UserProfile> profiles) {
    this.profiles = profiles;
  }
}
