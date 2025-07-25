package com.clanboards.users.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {
    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);
    @GetMapping("/api/v1/health")
    public Map<String, String> health() {
        logger.debug("Health check");
        return Map.of("status", "ok");
    }
}
