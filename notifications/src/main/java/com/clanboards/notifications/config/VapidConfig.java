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
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node;
            if (secretArn != null && !secretArn.isEmpty()) {
                var client = SecretsManagerClient.builder().build();
                var request = GetSecretValueRequest.builder()
                        .secretId(secretArn)
                        .build();
                var secret = client.getSecretValue(request).secretString();
                node = mapper.readTree(secret);
            } else {
                var file = new java.io.File("/secrets/vapid.json");
                if (!file.exists()) {
                    throw new IllegalStateException("VAPID_KEYS env var or /secrets/vapid.json required");
                }
                node = mapper.readTree(file);
            }
            return new PushService(
                node.get("publicKey").asText(),
                node.get("privateKey").asText(),
                node.get("subject").asText());
        } catch (IOException | java.security.GeneralSecurityException e) {
            logger.error("Failed to load VAPID keys", e);
            throw new RuntimeException(e);
        }
    }
}
