package com.clanboards.clashdata.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.Type;

@Entity
@Table(
    name = "player_snapshots",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_player_ts",
            columnNames = {"player_tag", "ts"}))
public class PlayerSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ts")
  private LocalDateTime ts;

  @Column(name = "player_tag", length = 15)
  private String playerTag;

  @Column(name = "clan_tag", length = 15)
  private String clanTag;

  @Column(name = "name", length = 50)
  private String name;

  @Column(name = "role", length = 20)
  private String role;

  @Column(name = "town_hall")
  private Integer townHall;

  @Column(name = "trophies")
  private Integer trophies;

  @Column(name = "donations")
  private Integer donations;

  @Column(name = "donations_received")
  private Integer donationsReceived;

  @Column(name = "war_attacks_used")
  private Integer warAttacksUsed;

  @Column(name = "last_seen")
  private LocalDateTime lastSeen;

  @Type(JsonType.class)
  @Column(name = "data", columnDefinition = "json")
  private JsonNode data;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public LocalDateTime getTs() {
    return ts;
  }

  public void setTs(LocalDateTime ts) {
    this.ts = ts;
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

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public Integer getTownHall() {
    return townHall;
  }

  public void setTownHall(Integer townHall) {
    this.townHall = townHall;
  }

  public Integer getTrophies() {
    return trophies;
  }

  public void setTrophies(Integer trophies) {
    this.trophies = trophies;
  }

  public Integer getDonations() {
    return donations;
  }

  public void setDonations(Integer donations) {
    this.donations = donations;
  }

  public Integer getDonationsReceived() {
    return donationsReceived;
  }

  public void setDonationsReceived(Integer donationsReceived) {
    this.donationsReceived = donationsReceived;
  }

  public Integer getWarAttacksUsed() {
    return warAttacksUsed;
  }

  public void setWarAttacksUsed(Integer warAttacksUsed) {
    this.warAttacksUsed = warAttacksUsed;
  }

  public LocalDateTime getLastSeen() {
    return lastSeen;
  }

  public void setLastSeen(LocalDateTime lastSeen) {
    this.lastSeen = lastSeen;
  }

  public JsonNode getData() {
    return data;
  }

  public void setData(JsonNode data) {
    this.data = data;
  }
}
