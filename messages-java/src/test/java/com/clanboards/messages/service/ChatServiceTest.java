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
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, java.util.Map.of()));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ChatMessage msg = service.publish("1", "hello", "u", null, null);
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
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, java.util.Map.of()));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ChatMessage msg = service.publishGlobal("hi", "user1", null, null);
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
        .thenReturn(new ModerationOutcome(ModerationResult.ALLOW, java.util.Map.of()));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    service.publish("1", "hi", "u", null, null);

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
        .thenReturn(new ModerationOutcome(ModerationResult.BLOCK, java.util.Map.of()));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u", null, null));
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
    Mockito.verify(blockedRepo)
        .upsert(
            Mockito.eq("u"),
            Mockito.isNull(),
            Mockito.eq(true),
            Mockito.anyString(),
            Mockito.any());
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
        .thenReturn(new ModerationOutcome(ModerationResult.MUTE, java.util.Map.of()));
    Mockito.when(modRepo.countByUserId("u")).thenReturn(0L);
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ModerationException ex =
        assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u", null, null));
    assertEquals("MUTED", ex.getMessage());
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
    org.mockito.ArgumentCaptor<java.time.Instant> until =
        org.mockito.ArgumentCaptor.forClass(java.time.Instant.class);
    Mockito.verify(blockedRepo)
        .upsert(
            Mockito.eq("u"), until.capture(), Mockito.eq(false), Mockito.anyString(), Mockito.any());
    long mins =
        java.time.Duration.between(java.time.Instant.now(), until.getValue()).toMinutes();
    assertTrue(mins >= 29 && mins <= 31);
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
        .thenReturn(new ModerationOutcome(ModerationResult.READONLY, java.util.Map.of()));
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ModerationException ex =
        assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u", null, null));
    assertEquals("READONLY", ex.getMessage());
    Mockito.verify(repo, Mockito.never()).saveMessage(Mockito.any());
    Mockito.verify(modRepo, Mockito.never()).save(Mockito.any());
    Mockito.verify(blockedRepo, Mockito.never())
        .upsert(
            Mockito.any(), Mockito.any(), Mockito.anyBoolean(), Mockito.anyString(), Mockito.any());
  }

  @Test
  void publishMuteEscalatesTo24Hours() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.MUTE, java.util.Map.of()));
    Mockito.when(modRepo.countByUserId("u")).thenReturn(2L);
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ModerationException ex =
        assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u", null, null));
    assertEquals("MUTED", ex.getMessage());
    org.mockito.ArgumentCaptor<java.time.Instant> until =
        org.mockito.ArgumentCaptor.forClass(java.time.Instant.class);
    Mockito.verify(blockedRepo)
        .upsert(
            Mockito.eq("u"), until.capture(), Mockito.eq(false), Mockito.anyString(), Mockito.any());
    long hrs =
        java.time.Duration.between(java.time.Instant.now(), until.getValue()).toHours();
    assertTrue(hrs >= 23 && hrs <= 25);
  }

  @Test
  void publishSpamMuteIsTwoHours() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(moderation.verify("u", "hi"))
        .thenReturn(new ModerationOutcome(ModerationResult.MUTE, java.util.Map.of("spam", 1.0)));
    Mockito.when(modRepo.countByUserId("u")).thenReturn(0L);
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    ModerationException ex =
        assertThrows(ModerationException.class, () -> service.publish("1", "hi", "u", null, null));
    assertEquals("MUTED", ex.getMessage());
    org.mockito.ArgumentCaptor<java.time.Instant> until =
        org.mockito.ArgumentCaptor.forClass(java.time.Instant.class);
    Mockito.verify(blockedRepo)
        .upsert(
            Mockito.eq("u"), until.capture(), Mockito.eq(false), Mockito.anyString(), Mockito.any());
    long hrs =
        java.time.Duration.between(java.time.Instant.now(), until.getValue()).toHours();
    assertTrue(hrs >= 1 && hrs <= 3);
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

  @Test
  void getRestrictionReturnsNullWhenNotBlocked() {
    ChatRepository repo = Mockito.mock(ChatRepository.class);
    ApplicationEventPublisher events = Mockito.mock(ApplicationEventPublisher.class);
    ModerationService moderation = Mockito.mock(ModerationService.class);
    com.clanboards.messages.repository.ModerationRepository modRepo =
        Mockito.mock(com.clanboards.messages.repository.ModerationRepository.class);
    com.clanboards.messages.repository.BlockedUserRepository blockedRepo =
        Mockito.mock(com.clanboards.messages.repository.BlockedUserRepository.class);
    Mockito.when(blockedRepo.findById("u")).thenReturn(java.util.Optional.empty());
    ChatService service = new ChatService(repo, events, moderation, modRepo, blockedRepo);

    assertNull(service.getRestriction("u"));
  }
}
