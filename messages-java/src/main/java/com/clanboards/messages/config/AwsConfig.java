package com.clanboards.messages.config;

import com.clanboards.messages.repository.ChatRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
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

    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient client) {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(client)
                .build();
    }

    @Bean
    public ChatRepository chatRepository(
            DynamoDbEnhancedClient enhancedClient,
            @Value("${chat.table:webapp-chat}") String tableName) {
        return new ChatRepository(enhancedClient, tableName);
    }
}
