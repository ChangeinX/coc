package com.clanboards.clashdata.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.Type;

@Entity
@Table(
    name = "war_snapshots",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_war_ts",
            columnNames = {"clan_tag", "ts"}))
public class WarSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ts")
  private LocalDateTime ts;

  @Column(name = "clan_tag", length = 15)
  private String clanTag;

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

  public JsonNode getData() {
    return data;
  }

  public void setData(JsonNode data) {
    this.data = data;
  }
}
