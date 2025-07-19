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
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {
    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public ChatService(
            DynamoDbClient dynamoDb,
            @Value("${messages.table:chat_messages}") String tableName) {
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
                .sorted(Comparator.comparing(m -> Instant.parse(m.get("ts").s())))
                .map(item -> new ChatMessage(
                        item.get("channel").s(),
                        item.get("userId").s(),
                        item.get("content").s(),
                        Instant.parse(item.get("ts").s())
                ))
                .collect(Collectors.toList());
    }
}
