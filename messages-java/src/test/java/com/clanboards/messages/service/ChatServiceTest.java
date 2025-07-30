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
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hello"))
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ChatMessage msg = service.publish("1", "hello", "u");
    assertEquals("1", msg.channel());
    Mockito.verify(repo).saveMessage(Mockito.any(ChatMessage.class));
    Mockito.verify(events).publishEvent(Mockito.any(MessageSavedEvent.class));
  }

  @Test
  void historyDelegatesToRepo() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    List<ChatMessage> expected = List.of(new ChatMessage("m1", "1", "u", "hi", Instant.now()));
    Mockito.when(repo.listMessages("1", 2, null)).thenReturn(expected);

    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);
    List<ChatMessage> result = service.history("1", 2, null);
    assertSame(expected, result);
  }

  @Test
  void publishGlobalUsesShardKey() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("user1", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ChatMessage msg = service.publishGlobal("hi", "user1");
    assertEquals(ChatRepository.globalShardKey("user1"), msg.channel());
    Mockito.verify(repo).saveMessage(Mockito.any(ChatMessage.class));
  }

  @Test
  void publishInvokesModeration() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    service.publish("1", "hi", "u");

    Mockito.verify(moderation).verify("u", "hi");
  }

  @Test
  void publishThrowsWhenModerationFails() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.BLOCK, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u"));
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
  }

  @Test
  void publishHandlesMute() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.MUTE, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u"));
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
  }

  @Test
  void publishHandlesReadonly() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.READONLY, "{}"));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u"));
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
  }

  @Test
  void createDirectChatCreatesChat() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    String id = service.createDirectChat("a", "b");
    assertEquals(ChatRepository.directChatId("a", "b"), id);
    Mockito.verify(repo).createChatIfAbsent(id);
  }
}
