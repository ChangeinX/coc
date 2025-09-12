package com.clanboards.messages.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestSecureController {

  @PostMapping("/api/v1/chat/secure-test")
  public ResponseEntity<String> secure() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String userId = auth != null ? auth.getName() : "none";
    return ResponseEntity.ok().header("X-UserId", userId).body("OK");
  }
}
