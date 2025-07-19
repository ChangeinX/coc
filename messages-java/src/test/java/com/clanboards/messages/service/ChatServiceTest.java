package com.clanboards.messages.service;

import com.clanboards.messages.model.ChatMessage;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ChatServiceTest {
    @Test
    void historyParsesTimestampsWithoutZone() {
        DynamoDbClient dynamoDb = Mockito.mock(DynamoDbClient.class);
        ChatService service = new ChatService(dynamoDb, "chat");
        String ts = "2025-07-19T06:55:24.755730";
        Map<String, AttributeValue> item = Map.of(
                "channel", AttributeValue.fromS("1"),
                "userId", AttributeValue.fromS("u"),
                "content", AttributeValue.fromS("hi"),
                "ts", AttributeValue.fromS(ts)
        );
        QueryResponse resp = QueryResponse.builder().items(List.of(item)).build();
        Mockito.when(dynamoDb.query(Mockito.any(QueryRequest.class))).thenReturn(resp);

        List<ChatMessage> msgs = service.history("1", 1);
        Instant expected = LocalDateTime.parse(ts).toInstant(ZoneOffset.UTC);
        assertEquals(1, msgs.size());
        assertEquals(expected, msgs.get(0).ts());
    }

    @Test
    void historySortsByTimestamp() {
        DynamoDbClient dynamoDb = Mockito.mock(DynamoDbClient.class);
        ChatService service = new ChatService(dynamoDb, "chat");
        Map<String, AttributeValue> item1 = Map.of(
                "channel", AttributeValue.fromS("1"),
                "userId", AttributeValue.fromS("u"),
                "content", AttributeValue.fromS("first"),
                "ts", AttributeValue.fromS("2025-07-19T06:55:24Z")
        );
        Map<String, AttributeValue> item2 = Map.of(
                "channel", AttributeValue.fromS("1"),
                "userId", AttributeValue.fromS("u"),
                "content", AttributeValue.fromS("second"),
                "ts", AttributeValue.fromS("2025-07-19T06:55:25Z")
        );
        QueryResponse resp = QueryResponse.builder().items(List.of(item2, item1)).build();
        Mockito.when(dynamoDb.query(Mockito.any(QueryRequest.class))).thenReturn(resp);

        List<ChatMessage> msgs = service.history("1", 2);
        assertEquals(2, msgs.size());
        assertEquals("first", msgs.get(0).content());
        assertEquals("second", msgs.get(1).content());
    }
}
