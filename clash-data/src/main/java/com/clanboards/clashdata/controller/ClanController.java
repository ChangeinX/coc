package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.SnapshotService;
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
@RequestMapping("/api/v1/clan-data/clans")
public class ClanController {

  private static final Logger log = LoggerFactory.getLogger(ClanController.class);
  private final SnapshotService snapshotService;

  @Autowired
  public ClanController(SnapshotService snapshotService) {
    this.snapshotService = snapshotService;
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
}
