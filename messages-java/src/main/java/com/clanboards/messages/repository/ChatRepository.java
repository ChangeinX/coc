package com.clanboards.messages.repository;

import com.clanboards.messages.model.ChatMessage;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Expression;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.BatchWriteItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.PutItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.WriteBatch;

public class ChatRepository {
  private final DynamoDbEnhancedClient client;
  private final DynamoDbTable<MessageItem> table;

  public static final int SHARD_COUNT = 20;
  private static final Duration MESSAGE_TTL = Duration.ofDays(30);

  public ChatRepository(DynamoDbEnhancedClient client, String tableName) {
    this.client = client;
    this.table =
        client.table(
            tableName,
            software.amazon.awssdk.enhanced.dynamodb.TableSchema.fromBean(MessageItem.class));
  }

  public static String globalShardKey(String userId) {
    return "global#shard-" + Math.floorMod(userId.hashCode(), SHARD_COUNT);
  }

  public static String directChatId(String a, String b) {
    if (a.compareTo(b) < 0) {
      return "direct#" + a + "#" + b;
    }
    return "direct#" + b + "#" + a;
  }

  static String pk(String chatId) {
    return "CHAT#" + chatId;
  }

  static String sk(Instant ts, String uuid) {
    return "MSG#" + ts.toString() + "#" + uuid;
  }

  public void saveGlobalMessage(ChatMessage msg) {
    String uuid = msg.id() != null ? msg.id() : UUID.randomUUID().toString();
    WriteBatch.Builder<MessageItem> batch =
        WriteBatch.builder(MessageItem.class).mappedTableResource(table);
    for (int i = 0; i < SHARD_COUNT; i++) {
      String shard = "global#shard-" + i;
      batch.addPutItem(toItem(shard, msg, uuid));
    }
    BatchWriteItemEnhancedRequest req =
        BatchWriteItemEnhancedRequest.builder().writeBatches(batch.build()).build();
    client.batchWriteItem(req);
  }

  private MessageItem toItem(String chatId, ChatMessage msg, String uuid) {
    MessageItem item = new MessageItem();
    item.setPK(pk(chatId));
    item.setSK(sk(msg.ts(), uuid));
    item.setId(uuid);
    item.setChatId(chatId);
    item.setSenderId(msg.userId());
    item.setContent(msg.content());
    item.setTs(msg.ts().toString());
    item.setTtl(msg.ts().plus(MESSAGE_TTL).getEpochSecond());
    return item;
  }

  private void saveMessageInternal(String chatId, ChatMessage msg) {
    String uuid = msg.id() != null ? msg.id() : UUID.randomUUID().toString();
    MessageItem item = toItem(chatId, msg, uuid);
    table.putItem(item);
  }

  public void createChatIfAbsent(String chatId) {
    MessageItem meta = new MessageItem();
    meta.setPK(pk(chatId));
    meta.setSK("META");
    Expression expr = Expression.builder().expression("attribute_not_exists(PK)").build();
    PutItemEnhancedRequest<MessageItem> req =
        PutItemEnhancedRequest.builder(MessageItem.class)
            .item(meta)
            .conditionExpression(expr)
            .build();
    try {
      table.putItem(req);
    } catch (
        software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException ignored) {
    }
  }

  public void saveMessage(ChatMessage msg) {
    saveMessageInternal(msg.channel(), msg);
  }

  public List<ChatMessage> listMessages(String chatId, int limit, Instant before) {
    QueryConditional cond;
    if (before != null) {
      cond =
          QueryConditional.sortLessThan(
              Key.builder()
                  .partitionValue(pk(chatId))
                  .sortValue("MSG#" + before.toString())
                  .build());
    } else {
      cond = QueryConditional.keyEqualTo(Key.builder().partitionValue(pk(chatId)).build());
    }

    QueryEnhancedRequest req =
        QueryEnhancedRequest.builder()
            .queryConditional(cond)
            .limit(limit)
            .scanIndexForward(false)
            .build();

    List<ChatMessage> result = new ArrayList<>();
    for (Page<MessageItem> page : table.query(req)) {
      for (MessageItem it : page.items()) {
        if (it.getTs() == null || !it.getSK().startsWith("MSG#")) {
          continue;
        }
        String id = it.getId();
        if (id == null) {
          String sk = it.getSK();
          int idx = sk != null ? sk.lastIndexOf('#') : -1;
          if (idx != -1) {
            id = sk.substring(idx + 1);
          }
        }
        result.add(
            new ChatMessage(
                id, it.getChatId(), it.getSenderId(), it.getContent(), Instant.parse(it.getTs())));
      }
    }
    result.sort(Comparator.comparing(ChatMessage::ts));
    return result;
  }
}
