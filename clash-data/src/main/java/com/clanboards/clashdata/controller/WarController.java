package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.WarService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clan-data/wars")
public class WarController {

  private static final Logger log = LoggerFactory.getLogger(WarController.class);
  private final WarService warService;
  private final ObjectMapper objectMapper;

  @Autowired
  public WarController(WarService warService, ObjectMapper objectMapper) {
    this.warService = warService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/{clanTag}/current")
  public ResponseEntity<JsonNode> getCurrentWar(@PathVariable String clanTag) {
    log.info("Received request for current war data for clan tag: {}", clanTag);

    JsonNode warData = warService.getCurrentWarSnapshot(clanTag);

    if (warData == null) {
      log.info("No war data found for clan tag: {}, returning notInWar state", clanTag);
      ObjectNode notInWarResponse = objectMapper.createObjectNode();
      notInWarResponse.put("state", "notInWar");
      return ResponseEntity.ok(notInWarResponse);
    }

    log.info("Successfully retrieved war data for clan tag: {}", clanTag);
    return ResponseEntity.ok(warData);
  }
}
