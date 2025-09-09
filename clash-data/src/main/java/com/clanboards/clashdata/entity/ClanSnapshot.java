package com.clanboards.clashdata.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.Type;

@Entity
@Table(
    name = "clan_snapshots",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_clan_ts",
            columnNames = {"clan_tag", "ts"}))
public class ClanSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ts")
  private LocalDateTime ts;

  @Column(name = "clan_tag", length = 15)
  private String clanTag;

  @Column(name = "name", length = 50)
  private String name;

  @Column(name = "member_count")
  private Integer memberCount;

  @Column(name = "level")
  private Integer level;

  @Column(name = "war_wins")
  private Integer warWins;

  @Column(name = "war_losses")
  private Integer warLosses;

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

  public Integer getMemberCount() {
    return memberCount;
  }

  public void setMemberCount(Integer memberCount) {
    this.memberCount = memberCount;
  }

  public Integer getLevel() {
    return level;
  }

  public void setLevel(Integer level) {
    this.level = level;
  }

  public Integer getWarWins() {
    return warWins;
  }

  public void setWarWins(Integer warWins) {
    this.warWins = warWins;
  }

  public Integer getWarLosses() {
    return warLosses;
  }

  public void setWarLosses(Integer warLosses) {
    this.warLosses = warLosses;
  }

  public JsonNode getData() {
    return data;
  }

  public void setData(JsonNode data) {
    this.data = data;
  }
}
