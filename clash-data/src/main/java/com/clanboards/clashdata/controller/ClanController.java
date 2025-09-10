package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.LoyaltyService;
import com.clanboards.clashdata.service.RiskService;
import com.clanboards.clashdata.service.SnapshotService;
import com.clanboards.clashdata.service.UserContextService;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clan-data/clans")
public class ClanController {

  private static final Logger log = LoggerFactory.getLogger(ClanController.class);
  private final SnapshotService snapshotService;
  private final LoyaltyService loyaltyService;
  private final RiskService riskService;
  private final UserContextService userContextService;

  @Autowired
  public ClanController(
      SnapshotService snapshotService,
      LoyaltyService loyaltyService,
      RiskService riskService,
      UserContextService userContextService) {
    this.snapshotService = snapshotService;
    this.loyaltyService = loyaltyService;
    this.riskService = riskService;
    this.userContextService = userContextService;
  }

  @GetMapping("/{tag}")
  public ResponseEntity<JsonNode> getClan(@PathVariable String tag) {
    log.info("Received request for clan tag: {}", tag);

    JsonNode clanData = snapshotService.getClan(tag);

    if (clanData == null) {
      log.warn("Clan not found for tag: {}", tag);
      return ResponseEntity.notFound().build();
    }

    log.info("Successfully retrieved clan data for tag: {}", tag);
    return ResponseEntity.ok(clanData);
  }

  @GetMapping("/{tag}/members/loyalty")
  public ResponseEntity<Map<String, Integer>> getClanLoyalty(@PathVariable String tag) {
    log.info("Received request for clan loyalty for tag: {}", tag);

    // First refresh clan snapshot to ensure membership list is current
    snapshotService.getClan(tag);

    Map<String, Integer> loyaltyData = loyaltyService.getClanLoyalty(tag);

    log.info(
        "Successfully retrieved loyalty data for clan tag: {} with {} members",
        tag,
        loyaltyData.size());
    return ResponseEntity.ok(loyaltyData);
  }

  @GetMapping("/{tag}/members/at-risk")
  public ResponseEntity<List<Map<String, Object>>> getClanAtRisk(@PathVariable String tag) {
    log.info("Received request for clan at-risk members for tag: {}", tag);

    // Extract user weights from authentication context if available
    Map<String, Double> weights = userContextService.getUserWeights();

    if (weights != null) {
      log.debug("Using custom user weights for risk calculation: {}", weights);
    } else {
      log.debug("No user weights found, using default weights for risk calculation");
    }

    List<Map<String, Object>> riskData = riskService.getClanAtRisk(tag, weights);

    log.info(
        "Successfully retrieved at-risk data for clan tag: {} with {} members",
        tag,
        riskData.size());
    return ResponseEntity.ok(riskData);
  }
}
