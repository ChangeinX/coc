package com.clanboards.notifications.controller;

import com.clanboards.notifications.repository.entity.PushSubscription;
import com.clanboards.notifications.service.NotificationService;
import com.clanboards.notifications.repository.UserRepository;
import com.clanboards.notifications.repository.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    private final UserRepository userRepository;

    public NotificationController(NotificationService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody PushSubscription sub, Principal principal) {
        Long userId = parseUserId(principal);
        service.subscribe(userId, sub);
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @PostMapping("/test")
    public ResponseEntity<?> test(@RequestBody Map<String, String> payload, Principal principal) {
        Long userId = parseUserId(principal);
        service.sendTest(userId, payload.getOrDefault("message", "test"));
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    private Long parseUserId(Principal principal) {
        String name = principal.getName();
        try {
            return Long.parseLong(name);
        } catch (NumberFormatException e) {
            return userRepository.findBySub(name)
                    .map(User::getId)
                    .orElseThrow();
        }
    }
}
