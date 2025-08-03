package com.clanboards.messages.service;

import com.clanboards.messages.events.MessageSavedEvent;
import com.clanboards.messages.model.BlockedUser;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.model.ModerationRecord;
import com.clanboards.messages.repository.BlockedUserRepository;
import com.clanboards.messages.repository.ChatRepository;
import java.time.Duration;
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
  private final com.clanboards.messages.repository.ModerationRepository modRepo;
  private final BlockedUserRepository blockedRepo;
  private static final Logger log = LoggerFactory.getLogger(ChatService.class);

  public ChatService(
      ChatRepository repository,
      ApplicationEventPublisher events,
      ModerationService moderation,
      com.clanboards.messages.repository.ModerationRepository modRepo,
      BlockedUserRepository blockedRepo) {
    this.repository = repository;
    this.events = events;
    this.moderation = moderation;
    this.modRepo = modRepo;
    this.blockedRepo = blockedRepo;
  }

  public String createDirectChat(String fromUserId, String toUserId) {
    String id = ChatRepository.directChatId(fromUserId, toUserId);
    repository.createChatIfAbsent(id);
    return id;
  }

  public ChatMessage publish(
      String chatId, String text, String userId, String ip, String userAgent) {
    log.info("Publishing message to chat {} by {}", chatId, userId);
    try {
      if (isBlocked(userId)) {
        throw new ModerationException("BANNED");
      }
      ModerationOutcome res = moderation.verify(userId, text);
      long fails = modRepo.countByUserId(userId);
      if (res.result() != ModerationResult.ALLOW && res.result() != ModerationResult.READONLY) {
        ModerationRecord rec = new ModerationRecord();
        rec.setUserId(userId);
        rec.setContent(text);
        rec.setCategories(res.categories());
        rec.setIp(ip);
        rec.setUserAgent(userAgent);
        modRepo.save(rec);
        fails++;
      }
      switch (res.result()) {
        case BLOCK -> {
          saveBan(userId, "moderation");
          throw new ModerationException("BANNED");
        }
        case MUTE -> {
          if (res.categories().containsKey("spam")) {
            saveMute(userId, Duration.ofHours(2), "spam");
            throw new ModerationException("MUTED");
          }
          Duration d = Duration.ofMinutes(30);
          if (fails == 2) {
            d = Duration.ofHours(2);
          } else if (fails >= 3) {
            d = Duration.ofHours(24);
          }
          saveMute(userId, d, "moderation");
          throw new ModerationException("MUTED");
        }
        case READONLY -> {
          throw new ModerationException("READONLY");
        }
        case WARNING -> {
          moderation.markWarning(userId);
          throw new ModerationException("TOXICITY_WARNING");
        }
        default -> {}
      }
      Instant ts = Instant.now();
      String uuid = java.util.UUID.randomUUID().toString();
      ChatMessage msg = new ChatMessage(uuid, chatId, userId, text, ts);
      repository.saveMessage(msg);
      events.publishEvent(new MessageSavedEvent(msg));
      return msg;
    } catch (ModerationException ex) {
      throw ex;
    } catch (Exception ex) {
      log.error("Failed to publish message", ex);
      throw new RuntimeException("Unable to publish message", ex);
    }
  }

  public ChatMessage publishGlobal(String text, String userId, String ip, String userAgent) {
    log.info("Publishing global message by {}", userId);
    try {
      if (isBlocked(userId)) {
        throw new ModerationException("BANNED");
      }
      ModerationOutcome res = moderation.verify(userId, text);
      long fails = modRepo.countByUserId(userId);
      if (res.result() != ModerationResult.ALLOW && res.result() != ModerationResult.READONLY) {
        ModerationRecord rec = new ModerationRecord();
        rec.setUserId(userId);
        rec.setContent(text);
        rec.setCategories(res.categories());
        rec.setIp(ip);
        rec.setUserAgent(userAgent);
        modRepo.save(rec);
        fails++;
      }
      switch (res.result()) {
        case BLOCK -> {
          saveBan(userId, "moderation");
          throw new ModerationException("BANNED");
        }
        case MUTE -> {
          if (res.categories().containsKey("spam")) {
            saveMute(userId, Duration.ofHours(2), "spam");
            throw new ModerationException("MUTED");
          }
          Duration d = Duration.ofMinutes(30);
          if (fails == 2) {
            d = Duration.ofHours(2);
          } else if (fails >= 3) {
            d = Duration.ofHours(24);
          }
          saveMute(userId, d, "moderation");
          throw new ModerationException("MUTED");
        }
        case READONLY -> {
          throw new ModerationException("READONLY");
        }
        case WARNING -> {
          moderation.markWarning(userId);
          throw new ModerationException("TOXICITY_WARNING");
        }
        default -> {}
      }
      Instant ts = Instant.now();
      String shard = ChatRepository.globalShardKey(userId);
      String uuid = java.util.UUID.randomUUID().toString();
      ChatMessage msg = new ChatMessage(uuid, shard, userId, text, ts);
      repository.saveMessage(msg);
      events.publishEvent(new MessageSavedEvent(msg));
      return msg;
    } catch (ModerationException ex) {
      throw ex;
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

  private boolean isBlocked(String userId) {
    return blockedRepo
        .findById(userId)
        .map(
            b ->
                Boolean.TRUE.equals(b.getPermanent())
                    || (b.getUntil() != null && b.getUntil().isAfter(Instant.now())))
        .orElse(false);
  }

  /** Return the active restriction for a user or null when none apply. */
  public BlockedUser getRestriction(String userId) {
    return blockedRepo
        .findById(userId)
        .filter(
            b ->
                Boolean.TRUE.equals(b.getPermanent())
                    || (b.getUntil() != null && b.getUntil().isAfter(Instant.now())))
        .orElse(null);
  }

  private void saveBan(String userId, String reason) {
    Instant now = Instant.now();
    blockedRepo.upsert(userId, null, true, reason, now);
  }

  private void saveMute(String userId, Duration duration, String reason) {
    Instant now = Instant.now();
    blockedRepo.upsert(userId, now.plus(duration), false, reason, now);
  }
}
