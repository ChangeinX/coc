package com.clanboards.messages.service;

import com.clanboards.messages.events.MessageSavedEvent;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/** Chat operations with pre-save moderation checks. */
@Service
public class ChatService {
  private final ChatRepository repository;
  private final ApplicationEventPublisher events;
  private final ModerationService moderation;
  private static final Logger log = LoggerFactory.getLogger(ChatService.class);

  public ChatService(
      ChatRepository repository, ApplicationEventPublisher events, ModerationService moderation) {
    this.repository = repository;
    this.events = events;
    this.moderation = moderation;
  }

  public String createDirectChat(String fromUserId, String toUserId) {
    String id = ChatRepository.directChatId(fromUserId, toUserId);
    repository.createChatIfAbsent(id);
    return id;
  }

  public ChatMessage publish(String chatId, String text, String userId) {
    log.info("Publishing message to chat {} by {}", chatId, userId);
    try {
      if (moderation.verify(userId, text) == ModerationResult.BLOCK) {
        throw new IllegalArgumentException("message rejected");
      }
      Instant ts = Instant.now();
      String uuid = java.util.UUID.randomUUID().toString();
      ChatMessage msg = new ChatMessage(uuid, chatId, userId, text, ts);
      repository.saveMessage(msg);
      events.publishEvent(new MessageSavedEvent(msg));
      return msg;
    } catch (Exception ex) {
      log.error("Failed to publish message", ex);
      throw new RuntimeException("Unable to publish message", ex);
    }
  }

  public ChatMessage publishGlobal(String text, String userId) {
    log.info("Publishing global message by {}", userId);
    try {
      if (moderation.verify(userId, text) == ModerationResult.BLOCK) {
        throw new IllegalArgumentException("message rejected");
      }
      Instant ts = Instant.now();
      String shard = ChatRepository.globalShardKey(userId);
      String uuid = java.util.UUID.randomUUID().toString();
      ChatMessage msg = new ChatMessage(uuid, shard, userId, text, ts);
      repository.saveMessage(msg);
      events.publishEvent(new MessageSavedEvent(msg));
      return msg;
    } catch (Exception ex) {
      log.error("Failed to publish global message", ex);
      throw new RuntimeException("Unable to publish message", ex);
    }
  }

  public List<ChatMessage> history(String chatId, int limit) {
    return history(chatId, limit, null);
  }

  public List<ChatMessage> history(String chatId, int limit, Instant before) {
    log.debug("Retrieving {} messages for {} before {}", limit, chatId, before);
    try {
      return repository.listMessages(chatId, limit, before);
    } catch (Exception ex) {
      log.error("Failed to load history", ex);
      throw new RuntimeException("Unable to load messages", ex);
    }
  }
}
