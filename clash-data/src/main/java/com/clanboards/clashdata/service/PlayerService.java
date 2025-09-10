package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.clanboards.clashdata.repository.UserRepository;
import com.clanboards.clashdata.util.TagUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

  private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
  private final SnapshotService snapshotService;
  private final LoyaltyService loyaltyService;
  private final RiskService riskService;
  private final PlayerSnapshotService playerSnapshotService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  @Autowired
  public PlayerService(
      SnapshotService snapshotService,
      LoyaltyService loyaltyService,
      RiskService riskService,
      PlayerSnapshotService playerSnapshotService,
      UserRepository userRepository,
      ObjectMapper objectMapper) {
    this.snapshotService = snapshotService;
    this.loyaltyService = loyaltyService;
    this.riskService = riskService;
    this.playerSnapshotService = playerSnapshotService;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper;
  }

  public JsonNode getPlayerProfile(String playerTag) {
    String normalizedTag = TagUtils.normalizeTag(playerTag);
    log.info("Fetching player profile for tag: {}", normalizedTag);

    // Get player snapshot data (this mimics get_player_snapshot from Python)
    JsonNode playerData = snapshotService.getPlayer(normalizedTag);
    if (playerData == null) {
      log.info("No player data found for tag: {}", normalizedTag);
      return null;
    }

    // Create mutable copy to add loyalty and risk data
    ObjectNode mutablePlayerData = playerData.deepCopy();

    // Add loyalty data
    try {
      Map<String, Integer> clanLoyalty = loyaltyService.getClanLoyalty(normalizedTag);
      Integer loyalty = clanLoyalty.get(normalizedTag);
      if (loyalty != null) {
        mutablePlayerData.put("loyalty", loyalty);
      } else {
        mutablePlayerData.put("loyalty", 0);
      }
    } catch (Exception e) {
      log.warn("Failed to get loyalty data for player: {}", normalizedTag, e);
      mutablePlayerData.put("loyalty", 0);
    }

    // Add risk score and breakdown
    try {
      List<PlayerSnapshot> history = playerSnapshotService.getPlayerHistory(normalizedTag, 30);
      if (!history.isEmpty()) {
        int riskScore = riskService.calculateRiskScore(history, null, null);
        mutablePlayerData.put("risk_score", riskScore);
        
        // For now, create empty risk breakdown array
        // TODO: Implement risk breakdown extraction from RiskService
        ArrayNode riskBreakdown = objectMapper.createArrayNode();
        mutablePlayerData.set("risk_breakdown", riskBreakdown);
      } else {
        mutablePlayerData.put("risk_score", 0);
        mutablePlayerData.set("risk_breakdown", objectMapper.createArrayNode());
      }
    } catch (Exception e) {
      log.warn("Failed to calculate risk data for player: {}", normalizedTag, e);
      mutablePlayerData.put("risk_score", 0);
      mutablePlayerData.set("risk_breakdown", objectMapper.createArrayNode());
    }

    log.info("Successfully built player profile for tag: {}", normalizedTag);
    return mutablePlayerData;
  }

  public JsonNode getPlayerProfileByUser(String userSub) {
    log.info("Fetching player profile for user: {}", userSub);
    
    Optional<String> playerTagOpt = userRepository.findPlayerTagBySub(userSub);
    if (playerTagOpt.isEmpty()) {
      log.info("No player tag found for user: {}", userSub);
      return null;
    }
    
    String playerTag = playerTagOpt.get();
    log.info("Found player tag {} for user: {}", playerTag, userSub);
    
    return getPlayerProfile(playerTag);
  }
}