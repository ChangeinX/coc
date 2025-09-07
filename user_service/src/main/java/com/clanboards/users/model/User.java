package com.clanboards.users.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String sub;
  private String email;
  private String name;
  private String playerTag;
  private Boolean isVerified = false;
  private Boolean seenSupercellDisclaimer = false;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getSub() {
    return sub;
  }

  public void setSub(String sub) {
    this.sub = sub;
  }

  public String getPlayerTag() {
    return playerTag;
  }

  public void setPlayerTag(String playerTag) {
    this.playerTag = playerTag;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public Boolean getIsVerified() {
    return isVerified;
  }

  public void setIsVerified(Boolean isVerified) {
    this.isVerified = isVerified;
  }

  public Boolean getSeenSupercellDisclaimer() {
    return seenSupercellDisclaimer;
  }

  public void setSeenSupercellDisclaimer(Boolean seenSupercellDisclaimer) {
    this.seenSupercellDisclaimer = seenSupercellDisclaimer;
  }
}
