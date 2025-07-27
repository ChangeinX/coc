package com.clanboards.messages.service;

import static org.junit.jupiter.api.Assertions.*;

import com.clanboards.messages.events.MessageSavedEvent;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.context.ApplicationEventPublisher;

class ChatServiceTest {
  @Test
  void publishSavesMessage() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ChatService service = new ChatService(repo, events);

    ChatMessage msg = service.publish("1", "hello", "u");
    assertEquals("1", msg.channel());
    Mockito.verify(repo).saveMessage(Mockito.any(ChatMessage.class));
    Mockito.verify(events).publishEvent(Mockito.any(MessageSavedEvent.class));
  }

  @Test
  void historyDelegatesToRepo() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    List<ChatMessage> expected = List.of(new ChatMessage("m1", "1", "u", "hi", Instant.now()));
    Mockito.when(repo.listMessages("1", 2, null)).thenReturn(expected);

    ChatService service = new ChatService(repo, events);
    List<ChatMessage> result = service.history("1", 2, null);
    assertSame(expected, result);
  }

  @Test
  void publishGlobalUsesShardKey() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ChatService service = new ChatService(repo, events);

    ChatMessage msg = service.publishGlobal("hi", "user1");
    assertEquals(ChatRepository.globalShardKey("user1"), msg.channel());
    Mockito.verify(repo).saveMessage(Mockito.any(ChatMessage.class));
  }

  @Test
  void createDirectChatCreatesChat() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ChatService service = new ChatService(repo, events);

    String id = service.createDirectChat("a", "b");
    assertEquals(ChatRepository.directChatId("a", "b"), id);
    Mockito.verify(repo).createChatIfAbsent(id);
  }
}
