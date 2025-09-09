package com.clanboards.clashdata.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "players")
public class Player {

  @Id
  @Column(name = "tag", length = 15)
  private String tag;

  @Column(name = "name", length = 50)
  private String name;

  @Column(name = "town_hall")
  private Integer townHall;

  @Column(name = "role", length = 20)
  private String role;

  @Column(name = "clan_tag", length = 15)
  private String clanTag;

  @Column(name = "deep_link", length = 255)
  private String deepLink;

  @Type(JsonType.class)
  @Column(name = "data", columnDefinition = "json")
  private JsonNode data;

  @Column(name = "updated_at")
  @UpdateTimestamp
  private LocalDateTime updatedAt;

  public String getTag() {
    return tag;
  }

  public void setTag(String tag) {
    this.tag = tag;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public Integer getTownHall() {
    return townHall;
  }

  public void setTownHall(Integer townHall) {
    this.townHall = townHall;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public String getClanTag() {
    return clanTag;
  }

  public void setClanTag(String clanTag) {
    this.clanTag = clanTag;
  }

  public String getDeepLink() {
    return deepLink;
  }

  public void setDeepLink(String deepLink) {
    this.deepLink = deepLink;
  }

  public JsonNode getData() {
    return data;
  }

  public void setData(JsonNode data) {
    this.data = data;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
