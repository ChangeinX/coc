package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.WarSnapshot;
import com.clanboards.clashdata.repository.WarSnapshotRepository;
import com.clanboards.clashdata.util.TagUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class WarService {

  private static final Logger log = LoggerFactory.getLogger(WarService.class);
  private final WarSnapshotRepository warSnapshotRepository;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final int cacheTtl;
  private final int staleAfter;

  private static final DateTimeFormatter ISO_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

  public WarService(
      WarSnapshotRepository warSnapshotRepository,
      StringRedisTemplate redisTemplate,
      ObjectMapper objectMapper,
      @Value("${cache.ttl:60}") int cacheTtl,
      @Value("${snapshot.max-age:600}") int staleAfter) {
    this.warSnapshotRepository = warSnapshotRepository;
    this.redisTemplate = redisTemplate;
    this.objectMapper = objectMapper;
    this.cacheTtl = cacheTtl;
    this.staleAfter = staleAfter;
  }

  public JsonNode getCurrentWarSnapshot(String clanTag) {
    String normalizedTag = TagUtils.normalizeTag(clanTag);
    String cacheKey = "snapshot:war:" + normalizedTag;

    log.info("Fetching war snapshot for clan tag: {}", normalizedTag);

    // Check cache first
    String cachedValue = redisTemplate.opsForValue().get(cacheKey);
    if (cachedValue != null) {
      try {
        log.debug("Found cached war data for clan tag: {}", normalizedTag);
        return objectMapper.readTree(cachedValue);
      } catch (Exception e) {
        log.warn("Failed to parse cached war data for clan tag: {}", normalizedTag, e);
      }
    }

    // Fetch from database
    WarSnapshot warSnapshot = warSnapshotRepository.findTopByClanTagOrderByTsDesc(normalizedTag);

    if (warSnapshot == null) {
      log.info("No war data found for clan tag: {}", normalizedTag);
      return null;
    }

    JsonNode data = warSnapshot.getData();

    // Add staleness metadata
    if (data != null && data.isObject()) {
      ObjectNode mutableData = (ObjectNode) data;
      mutableData.put("last_updated", warSnapshot.getTs().format(ISO_FORMATTER));

      long minutesSinceUpdate =
          ChronoUnit.MINUTES.between(warSnapshot.getTs(), LocalDateTime.now());
      boolean isStale = minutesSinceUpdate > (staleAfter / 60);
      mutableData.put("is_stale", isStale);

      data = mutableData;
    }

    // Cache the result
    try {
      redisTemplate
          .opsForValue()
          .set(cacheKey, objectMapper.writeValueAsString(data), cacheTtl, TimeUnit.SECONDS);
      log.debug("Cached war data for clan tag: {}", normalizedTag);
    } catch (Exception e) {
      log.warn("Failed to cache war data for clan tag: {}", normalizedTag, e);
    }

    log.info("Successfully retrieved war data for clan tag: {}", normalizedTag);
    return data;
  }
}
