package com.clanboards.clashdata.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "sub", nullable = false, unique = true)
  private String sub;

  @Column(name = "email", nullable = false, unique = true)
  private String email;

  @Column(name = "name")
  private String name;

  @Column(name = "player_tag", length = 15)
  private String playerTag;

  @Column(name = "is_verified", nullable = false)
  private Boolean isVerified = false;

  @Column(name = "seen_supercell_disclaimer", nullable = false)
  private Boolean seenSupercellDisclaimer = false;

  public User() {}

  public User(String sub, String email) {
    this.sub = sub;
    this.email = email;
  }

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

  public String getPlayerTag() {
    return playerTag;
  }

  public void setPlayerTag(String playerTag) {
    this.playerTag = playerTag;
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
