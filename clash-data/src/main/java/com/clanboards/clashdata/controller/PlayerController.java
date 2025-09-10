package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.PlayerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clan-data/players")
public class PlayerController {

  private static final Logger log = LoggerFactory.getLogger(PlayerController.class);
  private final PlayerService playerService;

  @Autowired
  public PlayerController(PlayerService playerService) {
    this.playerService = playerService;
  }

  @GetMapping("/{playerTag}")
  public ResponseEntity<JsonNode> getPlayer(@PathVariable String playerTag) {
    log.info("Received request for player profile for tag: {}", playerTag);

    JsonNode playerData = playerService.getPlayerProfile(playerTag);

    if (playerData == null) {
      log.warn("Player not found for tag: {}", playerTag);
      return ResponseEntity.notFound().build();
    }

    log.info("Successfully retrieved player profile for tag: {}", playerTag);
    return ResponseEntity.ok(playerData);
  }

  @GetMapping("/by-user/{userSub}")
  public ResponseEntity<JsonNode> getPlayerByUser(@PathVariable String userSub) {
    log.info("Received request for player profile by user: {}", userSub);

    JsonNode playerData = playerService.getPlayerProfileByUser(userSub);

    if (playerData == null) {
      log.warn("Player not found for user: {}", userSub);
      return ResponseEntity.notFound().build();
    }

    log.info("Successfully retrieved player profile for user: {}", userSub);
    return ResponseEntity.ok(playerData);
  }
}
