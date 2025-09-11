package com.clanboards.messages.repository;

import com.clanboards.messages.model.SystemConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for accessing centralized system configuration. */
@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {

  /**
   * Find a configuration value by its key.
   *
   * @param key the configuration key
   * @return the configuration entry if found
   */
  Optional<SystemConfig> findByKey(String key);

  /**
   * Check if a configuration key exists.
   *
   * @param key the configuration key
   * @return true if the key exists
   */
  boolean existsByKey(String key);
}
