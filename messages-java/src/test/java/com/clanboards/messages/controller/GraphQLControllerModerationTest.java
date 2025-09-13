package com.clanboards.messages.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.messages.graphql.Message;
import com.clanboards.messages.graphql.ModerationResponse;
import com.clanboards.messages.graphql.SendMessageResult;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import com.clanboards.messages.service.ModerationException;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GraphQLControllerModerationTest {

  @Mock private ChatService chatService;

  private GraphQLController controller;

  @BeforeEach
  void setUp() {
    controller = new GraphQLController(chatService);
  }

  @Test
  void sendMessage_ShouldReturnSuccessWhenMessageIsSaved() {
    // Given
    String chatId = "test-chat";
    String content = "Hello world";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    ChatMessage savedMessage = new ChatMessage("msg-1", chatId, userId, content, Instant.now());
    when(chatService.publish(chatId, content, userId, ip, ua)).thenReturn(savedMessage);

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Success);
    SendMessageResult.Success success = (SendMessageResult.Success) result;
    Message message = success.message();
    assertEquals("msg-1", message.id());
    assertEquals(chatId, message.chatId());
    assertEquals(userId, message.senderId());
    assertEquals(content, message.content());
  }

  @Test
  void sendMessage_ShouldReturnModerationResponseForToxicityWarning() {
    // Given
    String chatId = "test-chat";
    String content = "Toxic message";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    when(chatService.publish(chatId, content, userId, ip, ua))
        .thenThrow(new ModerationException("TOXICITY_WARNING"));

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Moderated);
    SendMessageResult.Moderated moderated = (SendMessageResult.Moderated) result;
    ModerationResponse response = moderated.moderation();
    assertEquals(ModerationResponse.ModerationAction.WARNING, response.action());
    assertTrue(response.reason().contains("inappropriate content"));
  }

  @Test
  void sendMessage_ShouldReturnModerationResponseForMuted() {
    // Given
    String chatId = "test-chat";
    String content = "Spam message";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    when(chatService.publish(chatId, content, userId, ip, ua))
        .thenThrow(new ModerationException("MUTED"));

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Moderated);
    SendMessageResult.Moderated moderated = (SendMessageResult.Moderated) result;
    ModerationResponse response = moderated.moderation();
    assertEquals(ModerationResponse.ModerationAction.MUTED, response.action());
    assertEquals("You are temporarily muted", response.reason());
    assertEquals(30, response.durationMinutes());
  }

  @Test
  void sendMessage_ShouldReturnModerationResponseForBanned() {
    // Given
    String chatId = "test-chat";
    String content = "Banned content";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    when(chatService.publish(chatId, content, userId, ip, ua))
        .thenThrow(new ModerationException("BANNED"));

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Moderated);
    SendMessageResult.Moderated moderated = (SendMessageResult.Moderated) result;
    ModerationResponse response = moderated.moderation();
    assertEquals(ModerationResponse.ModerationAction.BANNED, response.action());
    assertEquals("You are banned from chat", response.reason());
    assertNull(response.durationMinutes());
  }

  @Test
  void sendMessage_ShouldReturnModerationResponseForReadonly() {
    // Given
    String chatId = "test-chat";
    String content = "Any message";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    when(chatService.publish(chatId, content, userId, ip, ua))
        .thenThrow(new ModerationException("READONLY"));

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Moderated);
    SendMessageResult.Moderated moderated = (SendMessageResult.Moderated) result;
    ModerationResponse response = moderated.moderation();
    assertEquals(ModerationResponse.ModerationAction.READONLY, response.action());
    assertEquals("You are in read-only mode", response.reason());
    assertNull(response.durationMinutes());
  }

  @Test
  void sendMessage_ShouldHandleGlobalChat() {
    // Given
    String chatId = "global#shard-1";
    String content = "Global message";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    ChatMessage savedMessage = new ChatMessage("msg-1", chatId, userId, content, Instant.now());
    when(chatService.publishGlobal(content, userId, ip, ua)).thenReturn(savedMessage);

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Success);
    verify(chatService).publishGlobal(content, userId, ip, ua);
    verify(chatService, never()).publish(any(), any(), any(), any(), any());
  }

  @Test
  void sendMessage_ShouldThrowForUnauthenticatedUser() {
    // Given
    String chatId = "test-chat";
    String content = "Message";
    String userId = null; // Unauthenticated

    // When & Then
    RuntimeException exception =
        assertThrows(
            RuntimeException.class,
            () -> controller.sendMessage(chatId, content, userId, null, null));
    assertEquals("Unauthenticated", exception.getMessage());
  }

  @Test
  void sendMessage_ShouldHandleUnknownModerationException() {
    // Given
    String chatId = "test-chat";
    String content = "Message";
    String userId = "user123";
    String ip = "192.168.1.1";
    String ua = "TestAgent";

    when(chatService.publish(chatId, content, userId, ip, ua))
        .thenThrow(new ModerationException("UNKNOWN_MODERATION_TYPE"));

    // When
    SendMessageResult result = controller.sendMessage(chatId, content, userId, ip, ua);

    // Then
    assertTrue(result instanceof SendMessageResult.Moderated);
    SendMessageResult.Moderated moderated = (SendMessageResult.Moderated) result;
    ModerationResponse response = moderated.moderation();
    assertEquals(ModerationResponse.ModerationAction.WARNING, response.action());
    assertTrue(response.reason().contains("moderation policies"));
  }
}
