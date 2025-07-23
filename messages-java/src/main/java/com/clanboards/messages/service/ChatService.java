package com.clanboards.messages.service;

import com.clanboards.messages.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {
    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);
    private final DynamoDbClient dynamoDb;
    private final String tableName;
    private final String legacyTableName;

    public ChatService(
            DynamoDbClient dynamoDb,
            @Value("${chat.table:webapp-chat}") String tableName,
            @Value("${messages.table:webapp-chat-messages}") String legacyTableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
        this.legacyTableName = legacyTableName;
    }

    public ChatMessage publish(String groupId, String text, String userId) {
        Instant ts = Instant.now();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("PK", AttributeValue.fromS(groupId));
        item.put("SK", AttributeValue.fromS(ts.toString()));
        item.put("GSI1PK", AttributeValue.fromS(userId));
        item.put("channel", AttributeValue.fromS(groupId));
        item.put("ts", AttributeValue.fromS(ts.toString()));
        item.put("userId", AttributeValue.fromS(userId));
        item.put("content", AttributeValue.fromS(text));
        try {
        System.out.println("Attempting to write to table: " + tableName);
        logger.info("Attempting to write to table (logger): {}", tableName);
            dynamoDb.putItem(PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build());
        } catch (DynamoDbException ex) {
//             to stdout as well for testing println
            System.err.println("Failed to write to table " + tableName + ": " + ex.getMessage());
            logger.error("Failed to write to table (logger) {}: {}", tableName, ex.getMessage());
        }

        if (legacyTableName != null && !legacyTableName.isBlank() && !legacyTableName.equals(tableName)) {
            Map<String, AttributeValue> legacy = new HashMap<>();
            legacy.put("channel", AttributeValue.fromS(groupId));
            legacy.put("ts", AttributeValue.fromS(ts.toString()));
            legacy.put("userId", AttributeValue.fromS(userId));
            legacy.put("content", AttributeValue.fromS(text));
            System.out.println("Attempting to write to legacy table: " + legacyTableName);
            logger.info("Attempting to write to legacy table (logger): {}", legacyTableName);
            try {
                dynamoDb.putItem(PutItemRequest.builder()
                        .tableName(legacyTableName)
                        .item(legacy)
                        .build());
            } catch (DynamoDbException ex) {
                logger.warn("Failed to write to legacy table (logger) {}: {}", legacyTableName, ex.getMessage());
                System.err.println("Failed to write to legacy table " + legacyTableName + ": " + ex.getMessage());
            }
        }
        return new ChatMessage(groupId, userId, text, ts);
    }

    public List<ChatMessage> history(String groupId, int limit) {
        return history(groupId, limit, null);
    }

    public List<ChatMessage> history(String groupId, int limit, Instant before) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":c", AttributeValue.fromS(groupId));
        String expr = "channel = :c";
        if (before != null) {
            expr += " and ts < :b";
            values.put(":b", AttributeValue.fromS(before.toString()));
        }

        QueryRequest req = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression(expr)
                .expressionAttributeValues(values)
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
