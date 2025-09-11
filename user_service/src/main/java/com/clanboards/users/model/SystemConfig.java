package com.clanboards.users.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Centralized system configuration that can be updated without code deployment. Corresponds to the
 * coclib SystemConfig model and messages-java SystemConfig model.
 */
@Entity
@Table(name = "system_config")
public class SystemConfig {

  @Id
  @Column(length = 100)
  private String key;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String value;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "updated_at")
  private Instant updatedAt;

  public SystemConfig() {}

  public SystemConfig(String key, String value, String description) {
    this.key = key;
    this.value = value;
    this.description = description;
    this.updatedAt = Instant.now();
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public String getValue() {
    return value;
  }

  public void setValue(String value) {
    this.value = value;
    this.updatedAt = Instant.now();
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  @Override
  public String toString() {
    return "SystemConfig{"
        + "key='"
        + key
        + '\''
        + ", value='"
        + value
        + '\''
        + ", description='"
        + description
        + '\''
        + ", updatedAt="
        + updatedAt
        + '}';
  }
}
