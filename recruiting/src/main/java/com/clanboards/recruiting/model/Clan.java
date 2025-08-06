package com.clanboards.recruiting.model;

import jakarta.persistence.*;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "clans")
public class Clan {
  @Id
  @Column(name = "tag")
  private String tag;

  @Column(name = "deep_link")
  private String deepLink;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "data")
  private Map<String, Object> data;

  public String getTag() {
    return tag;
  }

  public void setTag(String tag) {
    this.tag = tag;
  }

  public String getDeepLink() {
    return deepLink;
  }

  public void setDeepLink(String deepLink) {
    this.deepLink = deepLink;
  }

  public Map<String, Object> getData() {
    return data;
  }

  public void setData(Map<String, Object> data) {
    this.data = data;
  }
}
