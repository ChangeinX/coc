package com.clanboards.notifications.controller;

import com.clanboards.notifications.repository.UserRepository;
import com.clanboards.notifications.repository.entity.PushSubscription;
import com.clanboards.notifications.repository.entity.User;
import com.clanboards.notifications.service.NotificationService;
import java.security.Principal;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
  private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);
  private final NotificationService service;
  private final UserRepository userRepository;

  public NotificationController(NotificationService service, UserRepository userRepository) {
    this.service = service;
    this.userRepository = userRepository;
  }

  @PostMapping("/subscribe")
  public ResponseEntity<?> subscribe(
      @RequestBody PushSubscription sub,
      jakarta.servlet.http.HttpServletRequest request,
      Principal principal) {
    Long userId = parseUserId(request, principal);
    service.subscribe(userId, sub);
    logger.info("User {} subscribed", userId);
    return ResponseEntity.ok(Map.of("status", "subscribed"));
  }

  @PostMapping("/test")
  public ResponseEntity<?> test(
      @RequestBody Map<String, String> payload,
      jakarta.servlet.http.HttpServletRequest request,
      Principal principal) {
    Long userId = parseUserId(request, principal);
    service.sendTest(userId, payload.getOrDefault("message", "test"));
    return ResponseEntity.ok(Map.of("status", "sent"));
  }

  private Long parseUserId(jakarta.servlet.http.HttpServletRequest request, Principal principal) {
    String name = null;
    if (principal != null) {
      name = principal.getName();
    }
    if (name == null) {
      Object sub = request.getAttribute("sub");
      if (sub instanceof String s) {
        name = s;
      }
    }
    if (name == null) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED);
    }
    try {
      return Long.parseLong(name);
    } catch (NumberFormatException e) {
      return userRepository
          .findBySub(name)
          .map(User::getId)
          .orElseThrow(
              () ->
                  new org.springframework.web.server.ResponseStatusException(
                      org.springframework.http.HttpStatus.UNAUTHORIZED));
    }
  }
}
