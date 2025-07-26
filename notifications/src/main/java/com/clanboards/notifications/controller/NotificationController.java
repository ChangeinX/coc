package com.clanboards.notifications.controller;

import com.clanboards.notifications.repository.entity.PushSubscription;
import com.clanboards.notifications.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody PushSubscription sub, Principal principal) {
        Long userId = Long.parseLong(principal.getName());
        service.subscribe(userId, sub);
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @PostMapping("/test")
    public ResponseEntity<?> test(@RequestBody Map<String, String> payload, Principal principal) {
        Long userId = Long.parseLong(principal.getName());
        service.sendTest(userId, payload.getOrDefault("message", "test"));
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
