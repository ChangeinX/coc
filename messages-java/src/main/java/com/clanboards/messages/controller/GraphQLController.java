package com.clanboards.messages.controller;

import com.clanboards.messages.graphql.Chat;
import com.clanboards.messages.graphql.ChatKind;
import com.clanboards.messages.graphql.Message;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import com.clanboards.messages.service.ChatService;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class GraphQLController {
  private final ChatService chatService;
  private static final Logger log = LoggerFactory.getLogger(GraphQLController.class);

  public GraphQLController(ChatService chatService) {
    this.chatService = chatService;
  }

  @QueryMapping
  public List<Chat> listChats() {
    log.debug("Listing global chat shards");
    return IntStream.range(0, ChatRepository.SHARD_COUNT)
        .mapToObj(
            i ->
                new Chat(
                    "global#shard-" + i,
                    ChatKind.GLOBAL,
                    null,
                    Collections.emptyList(),
                    Instant.EPOCH,
                    null))
        .toList();
  }

  @MutationMapping
  public Chat createDirectChat(
      @Argument String recipientId,
      @ContextValue(value = "userId", required = false) String userId) {
    if (userId == null || userId.isBlank()) {
      throw new RuntimeException("Unauthenticated");
    }
    log.info("GraphQL createDirectChat {} -> {}", userId, recipientId);
    String id = chatService.createDirectChat(userId, recipientId);
    return new Chat(id, ChatKind.DIRECT, null, List.of(userId, recipientId), Instant.now(), null);
  }

  @QueryMapping
  public List<Message> getMessages(
      @Argument String chatId, @Argument Instant after, @Argument Integer limit) {
    int lim = limit != null ? limit : 50;
    log.debug("GraphQL getMessages {} limit {}", chatId, lim);
    List<ChatMessage> msgs = chatService.history(chatId, lim, after);
    return msgs.stream()
        .map(m -> new Message(m.id(), m.channel(), m.ts(), m.userId(), m.content()))
        .toList();
  }

  @MutationMapping
  public Message sendMessage(
      @Argument String chatId,
      @Argument String content,
      @ContextValue(value = "userId", required = false) String userId) {
    if (userId == null || userId.isBlank()) {
      throw new RuntimeException("Unauthenticated");
    }
    log.info("GraphQL sendMessage to {} by {}", chatId, userId);
    ChatMessage saved;
    if (chatId.startsWith("global#")) {
      saved = chatService.publishGlobal(content, userId);
    } else {
      saved = chatService.publish(chatId, content, userId);
    }
    return new Message(saved.id(), saved.channel(), saved.ts(), saved.userId(), saved.content());
  }
}
