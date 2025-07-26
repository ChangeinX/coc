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
import software.amazon.awssdk.services.secretsmanager.model.SecretsManagerException;

import java.io.StringReader;
import java.util.Properties;

import java.io.IOException;

@Configuration
public class VapidConfig {
    private static final Logger logger = LoggerFactory.getLogger(VapidConfig.class);

    @Bean
    public PushService pushService() {
        String secretArn = System.getenv("VAPID_KEYS");
        ObjectMapper mapper = new ObjectMapper();
        try {
            String secretContent;
            if (secretArn != null && !secretArn.isBlank()) {
                logger.info("Loading VAPID keys from Secrets Manager using id {}", secretArn);
                var client = SecretsManagerClient.builder().build();
                var request = GetSecretValueRequest.builder()
                        .secretId(secretArn)
                        .build();
                secretContent = client.getSecretValue(request).secretString();
            } else {
                var file = new java.io.File("/secrets/vapid.json");
                if (!file.exists()) {
                    throw new IllegalStateException("VAPID_KEYS env var or /secrets/vapid.json required");
                }
                logger.info("Loading VAPID keys from {}", file.getAbsolutePath());
                secretContent = java.nio.file.Files.readString(file.toPath());
            }

            VapidKeys keys = parseSecret(secretContent, mapper);
            return new PushService(keys.publicKey, keys.privateKey, keys.subject);
        } catch (SecretsManagerException e) {
            logger.error("Failed to retrieve secret {} from Secrets Manager: {}", secretArn, e.awsErrorDetails().errorMessage(), e);
            throw e;
        } catch (IOException | java.security.GeneralSecurityException e) {
            logger.error("Failed to load VAPID keys", e);
            throw new RuntimeException(e);
        }
    }

    private VapidKeys parseSecret(String secret, ObjectMapper mapper) throws IOException {
        if (secret.trim().startsWith("{")) {
            JsonNode node = mapper.readTree(secret);
            return new VapidKeys(
                    node.path("publicKey").asText(),
                    node.path("privateKey").asText(),
                    node.path("subject").asText());
        } else {
            Properties props = new Properties();
            props.load(new StringReader(secret));
            return new VapidKeys(
                    props.getProperty("publicKey", ""),
                    props.getProperty("privateKey", ""),
                    props.getProperty("subject", ""));
        }
    }

    private static class VapidKeys {
        final String publicKey;
        final String privateKey;
        final String subject;

        VapidKeys(String publicKey, String privateKey, String subject) {
            this.publicKey = publicKey;
            this.privateKey = privateKey;
            this.subject = subject;
        }
    }
}
