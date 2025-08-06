package com.clanboards.recruiting.model;

import jakarta.persistence.*;

@Entity
@Table(name = "clans")
public class Clan {
  @Id
  @Column(name = "tag")
  private String tag;

  @Column(name = "deep_link")
  private String deepLink;

  @Lob
  @Column(name = "data")
  private String data;

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

  public String getData() {
    return data;
  }

  public void setData(String data) {
    this.data = data;
  }
}
