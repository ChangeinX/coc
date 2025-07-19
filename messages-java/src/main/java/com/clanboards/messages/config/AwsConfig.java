package com.clanboards.messages.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Configuration
public class AwsConfig {
    @Bean
    public DynamoDbClient dynamoDbClient(@Value("${aws.region:us-east-1}") String region) {
        return DynamoDbClient.builder()
                .region(Region.of(region))
                .build();
    }
}
