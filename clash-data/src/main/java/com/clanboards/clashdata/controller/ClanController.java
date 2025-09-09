package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.SnapshotService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clan-data/clans")
public class ClanController {

  private final SnapshotService snapshotService;

  @Autowired
  public ClanController(SnapshotService snapshotService) {
    this.snapshotService = snapshotService;
  }

  @GetMapping("/{tag}")
  public ResponseEntity<JsonNode> getClan(@PathVariable String tag) {
    JsonNode clanData = snapshotService.getClan(tag);

    if (clanData == null) {
      return ResponseEntity.notFound().build();
    }

    return ResponseEntity.ok(clanData);
  }
}
