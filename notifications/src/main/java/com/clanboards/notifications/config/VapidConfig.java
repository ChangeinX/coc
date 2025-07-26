package com.clanboards.notifications.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.PushService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

import java.io.IOException;

@Configuration
public class VapidConfig {
    private static final Logger logger = LoggerFactory.getLogger(VapidConfig.class);

    @Bean
    public PushService pushService() {
        String secretArn = System.getenv("VAPID_KEYS");
        if (secretArn == null || secretArn.isEmpty()) {
            throw new IllegalStateException("VAPID_KEYS env var is required");
        }
        var client = SecretsManagerClient.builder().build();
        var request = GetSecretValueRequest.builder()
                .secretId(secretArn)
                .build();
        try {
            var secret = client.getSecretValue(request).secretString();
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(secret);
            return new PushService(
                node.get("publicKey").asText(),
                node.get("privateKey").asText(),
                node.get("subject").asText());
        } catch (IOException | java.security.GeneralSecurityException e) {
            logger.error("Failed to parse VAPID keys", e);
            throw new RuntimeException(e);
        }
    }
}
