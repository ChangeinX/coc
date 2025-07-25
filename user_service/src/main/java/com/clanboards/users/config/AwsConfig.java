package com.clanboards.users.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.regions.Region;

@Configuration
public class AwsConfig {
    @Bean
    public SecretsManagerClient secretsManagerClient(@Value("${aws.region:us-east-1}") String region) {
        return SecretsManagerClient.builder()
                .region(Region.of(region))
                .build();
    }
}
