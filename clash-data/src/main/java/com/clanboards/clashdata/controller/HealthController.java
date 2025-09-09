package com.clanboards.clashdata.controller;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

  @GetMapping({"", "/"})
  public ResponseEntity<Map<String, String>> healthCheck() {
    return ResponseEntity.ok(Map.of("status", "ok"));
  }
}
