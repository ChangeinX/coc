package com.clanboards.messages.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.clanboards.messages.model.ChatMessage;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

class ChatRepositoryTest {
  @Test
  void listMessagesSkipsMetaItem() {
    DynamoDbEnhancedClient client = Mockito.mock(DynamoDbEnhancedClient.class);
    DynamoDbTable<MessageItem> table = Mockito.mock(DynamoDbTable.class);
    Mockito.when(
            client.table(
                Mockito.anyString(),
                Mockito.<software.amazon.awssdk.enhanced.dynamodb.TableSchema<MessageItem>>any()))
        .thenReturn(table);

    MessageItem meta = new MessageItem();
    meta.setPK("CHAT#1");
    meta.setSK("META");

    MessageItem msg = new MessageItem();
    msg.setPK("CHAT#1");
    msg.setSK("MSG#2024-01-01T00:00:00Z#1");
    msg.setChatId("1");
    msg.setSenderId("u");
    msg.setContent("hi");
    msg.setTs("2024-01-01T00:00:00Z");

    Page<MessageItem> page = Page.create(List.of(meta, msg));
    software.amazon.awssdk.core.pagination.sync.SdkIterable<Page<MessageItem>> pages =
        () -> List.of(page).iterator();
    software.amazon.awssdk.enhanced.dynamodb.model.PageIterable<MessageItem> iterable =
        software.amazon.awssdk.enhanced.dynamodb.model.PageIterable.create(pages);
    Mockito.when(table.query(Mockito.any(QueryEnhancedRequest.class))).thenReturn(iterable);

    ChatRepository repo = new ChatRepository(client, "tbl");
    List<ChatMessage> result = repo.listMessages("1", 10, null);

    assertEquals(1, result.size());
    assertEquals("hi", result.get(0).content());
  }
}
