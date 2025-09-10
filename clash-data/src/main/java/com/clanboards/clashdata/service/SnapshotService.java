package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.Clan;
import com.clanboards.clashdata.entity.ClanSnapshot;
import com.clanboards.clashdata.entity.Player;
import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.clanboards.clashdata.repository.ClanRepository;
import com.clanboards.clashdata.repository.ClanSnapshotRepository;
import com.clanboards.clashdata.repository.LoyaltyMembershipRepository;
import com.clanboards.clashdata.repository.PlayerRepository;
import com.clanboards.clashdata.repository.PlayerSnapshotRepository;
import com.clanboards.clashdata.util.TagUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class SnapshotService {

  private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);
  private final ClanSnapshotRepository clanSnapshotRepository;
  private final ClanRepository clanRepository;
  private final PlayerSnapshotRepository playerSnapshotRepository;
  private final PlayerRepository playerRepository;
  private final LoyaltyMembershipRepository loyaltyMembershipRepository;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final int cacheTtl;
  private final int staleAfter;

  private static final DateTimeFormatter ISO_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

  public SnapshotService(
      ClanSnapshotRepository clanSnapshotRepository,
      ClanRepository clanRepository,
      PlayerSnapshotRepository playerSnapshotRepository,
      PlayerRepository playerRepository,
      LoyaltyMembershipRepository loyaltyMembershipRepository,
      StringRedisTemplate redisTemplate,
      @Value("${clan-data.snapshot.cache-ttl:60}") int cacheTtl,
      @Value("${clan-data.snapshot.stale-after:600}") int staleAfter) {
    this.clanSnapshotRepository = clanSnapshotRepository;
    this.clanRepository = clanRepository;
    this.playerSnapshotRepository = playerSnapshotRepository;
    this.playerRepository = playerRepository;
    this.loyaltyMembershipRepository = loyaltyMembershipRepository;
    this.redisTemplate = redisTemplate;
    this.objectMapper = new ObjectMapper();
    this.cacheTtl = cacheTtl;
    this.staleAfter = staleAfter;
  }

  public JsonNode getClan(String tag) {
    String normalizedTag = TagUtils.normalizeTag(tag);
    log.debug("Normalized tag '{}' to '{}'", tag, normalizedTag);

    String cacheKey = "snapshot:clan:" + normalizedTag;
    log.debug("Checking cache with key: {}", cacheKey);

    // Check cache first
    String cachedData = redisTemplate.opsForValue().get(cacheKey);
    if (cachedData != null) {
      try {
        JsonNode cached = objectMapper.readTree(cachedData);
        String tsString = cached.get("ts").asText();
        LocalDateTime cachedTs = LocalDateTime.parse(tsString.replace("Z", ""));
        if (ChronoUnit.SECONDS.between(cachedTs, LocalDateTime.now()) <= staleAfter) {
          log.debug("Cache hit for clan tag: {}", normalizedTag);
          return cached;
        }
        log.debug("Cache data stale for clan tag: {}", normalizedTag);
      } catch (Exception e) {
        log.warn("Invalid cache data for clan tag: {}, error: {}", normalizedTag, e.getMessage());
      }
    } else {
      log.debug("Cache miss for clan tag: {}", normalizedTag);
    }

    // Get from database
    log.debug("Querying database for clan tag: {}", normalizedTag);
    ClanSnapshot clanSnapshot = clanSnapshotRepository.findTopByClanTagOrderByTsDesc(normalizedTag);
    if (clanSnapshot == null) {
      log.info("No clan snapshot found in database for tag: {}", normalizedTag);
      return null;
    }

    log.info(
        "Found clan snapshot for tag: {} with name: {}", normalizedTag, clanSnapshot.getName());

    // Build base clan data
    ObjectNode clanData = objectMapper.createObjectNode();
    clanData.put("tag", clanSnapshot.getClanTag());
    clanData.put("name", clanSnapshot.getName());
    clanData.put("clanLevel", clanSnapshot.getLevel());
    clanData.put("warWins", clanSnapshot.getWarWins());
    clanData.put("warLosses", clanSnapshot.getWarLosses());
    clanData.put("ts", clanSnapshot.getTs().format(ISO_FORMATTER));

    // Add snapshot JSON data
    if (clanSnapshot.getData() != null) {
      if (clanSnapshot.getData().has("warWinStreak")) {
        clanData.set("warWinStreak", clanSnapshot.getData().get("warWinStreak"));
      }
    }

    // Get clan metadata
    Clan clan = clanRepository.findById(normalizedTag).orElse(null);
    if (clan != null) {
      if (clan.getData() != null) {
        if (clan.getData().has("description")) {
          clanData.set("description", clan.getData().get("description"));
        }
        if (clan.getData().has("badgeUrls")) {
          clanData.set("badgeUrls", clan.getData().get("badgeUrls"));
        }
        // Use clan data warWinStreak if snapshot doesn't have it
        if (!clanData.has("warWinStreak") && clan.getData().has("warWinStreak")) {
          clanData.set("warWinStreak", clan.getData().get("warWinStreak"));
        }
      }
      if (clan.getDeepLink() != null) {
        clanData.put("deep_link", clan.getDeepLink());
      }
    }

    // Get member list
    ArrayNode memberList = attachMembers(normalizedTag);
    clanData.set("memberList", memberList);
    clanData.put("members", memberList.size());

    // Cache the result
    try {
      redisTemplate
          .opsForValue()
          .set(cacheKey, objectMapper.writeValueAsString(clanData), cacheTtl, TimeUnit.SECONDS);
      log.debug("Cached clan data for tag: {} with {} members", normalizedTag, memberList.size());
    } catch (Exception e) {
      log.warn("Failed to cache clan data for tag: {}, error: {}", normalizedTag, e.getMessage());
    }

    log.info(
        "Successfully processed clan data for tag: {} with {} members",
        normalizedTag,
        memberList.size());
    return clanData;
  }

  public JsonNode getPlayer(String playerTag) {
    String normalizedTag = TagUtils.normalizeTag(playerTag);
    log.debug("Normalized player tag '{}' to '{}'", playerTag, normalizedTag);

    String cacheKey = "snapshot:player:" + normalizedTag;
    log.debug("Checking cache with key: {}", cacheKey);

    // Check cache first
    String cachedData = redisTemplate.opsForValue().get(cacheKey);
    if (cachedData != null) {
      try {
        JsonNode cached = objectMapper.readTree(cachedData);
        log.debug("Found cached player data for tag: {}", normalizedTag);
        return cached;
      } catch (Exception e) {
        log.warn("Failed to parse cached player data for tag: {}", normalizedTag, e);
      }
    }

    // Get latest player snapshot from database
    PlayerSnapshot latestSnapshot =
        playerSnapshotRepository.findTopByPlayerTagOrderByTsDesc(normalizedTag);
    if (latestSnapshot == null) {
      log.info("No player snapshot found for tag: {}", normalizedTag);
      return null;
    }

    // Get player metadata
    Player playerMetadata = playerRepository.findByTag(normalizedTag);

    // Build player data JSON
    ObjectNode playerData = objectMapper.createObjectNode();
    playerData.put("tag", latestSnapshot.getPlayerTag());
    playerData.put("name", latestSnapshot.getName());
    playerData.put("role", latestSnapshot.getRole());
    playerData.put("clan_tag", latestSnapshot.getClanTag());
    playerData.put("town_hall_level", latestSnapshot.getTownHall());
    playerData.put("trophies", latestSnapshot.getTrophies());
    playerData.put("donations", latestSnapshot.getDonations());
    playerData.put("donations_received", latestSnapshot.getDonationsReceived());

    // Add staleness metadata
    playerData.put("last_updated", latestSnapshot.getTs().format(ISO_FORMATTER));
    long minutesSinceUpdate =
        java.time.temporal.ChronoUnit.MINUTES.between(
            latestSnapshot.getTs(), java.time.LocalDateTime.now());
    boolean isStale = minutesSinceUpdate > (staleAfter / 60);
    playerData.put("is_stale", isStale);

    // Add player metadata if available
    if (playerMetadata != null && playerMetadata.getData() != null) {
      JsonNode metadata = playerMetadata.getData();
      // Merge relevant metadata fields if needed
      if (metadata.has("data")) {
        playerData.set("data", metadata.get("data"));
      }
    }

    // Cache the result
    try {
      redisTemplate
          .opsForValue()
          .set(
              cacheKey,
              objectMapper.writeValueAsString(playerData),
              cacheTtl,
              java.util.concurrent.TimeUnit.SECONDS);
      log.debug("Cached player data for tag: {}", normalizedTag);
    } catch (Exception e) {
      log.warn("Failed to cache player data for tag: {}", normalizedTag, e);
    }

    log.info("Successfully retrieved player data for tag: {}", normalizedTag);
    return playerData;
  }

  private ArrayNode attachMembers(String clanTag) {
    ArrayNode memberList = objectMapper.createArrayNode();

    // Get active player tags
    List<String> activePlayerTags =
        loyaltyMembershipRepository.findActivePlayerTagsByClanTag(clanTag);
    if (activePlayerTags.isEmpty()) {
      return memberList;
    }

    // Get latest snapshots for active players
    List<PlayerSnapshot> playerSnapshots =
        playerSnapshotRepository.findLatestSnapshotsByPlayerTags(activePlayerTags);

    // Get player metadata
    Map<String, Player> playerMetadata = new HashMap<>();
    for (String playerTag : activePlayerTags) {
      playerRepository
          .findById(playerTag)
          .ifPresent(player -> playerMetadata.put(playerTag, player));
    }

    // Build member data
    for (PlayerSnapshot ps : playerSnapshots) {
      ObjectNode member = objectMapper.createObjectNode();
      member.put("tag", ps.getPlayerTag());
      member.put("name", ps.getName());
      member.put("role", ps.getRole());
      member.put("townHallLevel", ps.getTownHall());
      member.put("trophies", ps.getTrophies());
      member.put("donations", ps.getDonations());
      member.put("donationsReceived", ps.getDonationsReceived());
      if (ps.getWarAttacksUsed() != null) {
        member.put("warAttacksUsed", ps.getWarAttacksUsed());
      }

      LocalDateTime lastSeen = ps.getLastSeen() != null ? ps.getLastSeen() : ps.getTs();
      member.put("last_seen", lastSeen.format(ISO_FORMATTER));

      // Add league icon from snapshot data - always include field for consistency with Flask
      String leagueIcon = null;
      if (ps.getData() != null && ps.getData().has("league")) {
        JsonNode league = ps.getData().get("league");
        if (league.has("iconUrls") && league.get("iconUrls").has("tiny")) {
          leagueIcon = league.get("iconUrls").get("tiny").asText();
        }
      }
      if (leagueIcon != null) {
        member.put("leagueIcon", leagueIcon);
      } else {
        member.putNull("leagueIcon");
      }

      // Add labels from snapshot data
      if (ps.getData() != null && ps.getData().has("labels")) {
        member.set("labels", ps.getData().get("labels"));
      }

      // Add deep link - prefer Player entity, fallback to snapshot data
      Player playerEntity = playerMetadata.get(ps.getPlayerTag());
      if (playerEntity != null
          && playerEntity.getData() != null
          && playerEntity.getData().has("deep_link")) {
        member.put("deep_link", playerEntity.getData().get("deep_link").asText());
      } else if (ps.getData() != null && ps.getData().has("deep_link")) {
        member.put("deep_link", ps.getData().get("deep_link").asText());
      }

      memberList.add(member);
    }

    return memberList;
  }
}
