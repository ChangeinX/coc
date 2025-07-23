package com.clanboards.messages.repository;

import com.clanboards.messages.model.ChatMessage;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.lang.Math;

public class ChatRepository {
    private final DynamoDbTable<MessageItem> table;

    public static final int SHARD_COUNT = 20;

    public ChatRepository(DynamoDbEnhancedClient client, String tableName) {
        this.table = client.table(tableName, software.amazon.awssdk.enhanced.dynamodb.TableSchema.fromBean(MessageItem.class));
    }

    public static String globalShardKey(String userId) {
        return "global#shard-" + Math.floorMod(userId.hashCode(), SHARD_COUNT);
    }

    static String pk(String chatId) {
        return "CHAT#" + chatId;
    }

    static String sk(Instant ts, String uuid) {
        return "MSG#" + ts.toString() + "#" + uuid;
    }

    public void saveGlobalMessage(ChatMessage msg) {
        saveMessageInternal(globalShardKey(msg.userId()), msg);
    }

    private void saveMessageInternal(String chatId, ChatMessage msg) {
        MessageItem item = new MessageItem();
        item.setPK(pk(chatId));
        item.setSK(sk(msg.ts(), UUID.randomUUID().toString()));
        item.setChatId(chatId);
        item.setSenderId(msg.userId());
        item.setContent(msg.content());
        item.setTs(msg.ts().toString());
        table.putItem(item);
    }

    public void saveMessage(ChatMessage msg) {
        saveMessageInternal(msg.channel(), msg);
    }

    public List<ChatMessage> listMessages(String chatId, int limit, Instant before) {
        QueryConditional cond;
        if (before != null) {
            cond = QueryConditional.sortLessThan(Key.builder()
                    .partitionValue(pk(chatId))
                    .sortValue("MSG#" + before.toString())
                    .build());
        } else {
            cond = QueryConditional.keyEqualTo(Key.builder().partitionValue(pk(chatId)).build());
        }

        QueryEnhancedRequest req = QueryEnhancedRequest.builder()
                .queryConditional(cond)
                .limit(limit)
                .scanIndexForward(false)
                .build();

        List<ChatMessage> result = new ArrayList<>();
        for (Page<MessageItem> page : table.query(req)) {
            for (MessageItem it : page.items()) {
                result.add(new ChatMessage(
                        it.getChatId(),
                        it.getSenderId(),
                        it.getContent(),
                        Instant.parse(it.getTs())
                ));
            }
        }
        result.sort(Comparator.comparing(ChatMessage::ts));
        return result;
    }
}
