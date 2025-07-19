package com.clanboards.messages.service;

import com.clanboards.messages.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {
    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public ChatService(
            DynamoDbClient dynamoDb,
            @Value("${messages.table:webapp-chat-messages}") String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
    }

    public ChatMessage publish(String groupId, String text, String userId) {
        Instant ts = Instant.now();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("channel", AttributeValue.fromS(groupId));
        item.put("ts", AttributeValue.fromS(ts.toString()));
        item.put("userId", AttributeValue.fromS(userId));
        item.put("content", AttributeValue.fromS(text));
        dynamoDb.putItem(PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build());
        return new ChatMessage(groupId, userId, text, ts);
    }

    public List<ChatMessage> history(String groupId, int limit) {
        QueryRequest req = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("channel = :c")
                .expressionAttributeValues(Map.of(
                        ":c", AttributeValue.fromS(groupId)))
                .limit(limit)
                .scanIndexForward(false)
                .build();
        QueryResponse resp = dynamoDb.query(req);
        return resp.items().stream()
                .sorted(Comparator.comparing(m -> parseInstant(m.get("ts").s())))
                .map(item -> new ChatMessage(
                        item.get("channel").s(),
                        item.get("userId").s(),
                        item.get("content").s(),
                        parseInstant(item.get("ts").s())
                ))
                .collect(Collectors.toList());
    }

    private Instant parseInstant(String value) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return LocalDateTime.parse(value).toInstant(ZoneOffset.UTC);
        }
    }
}
