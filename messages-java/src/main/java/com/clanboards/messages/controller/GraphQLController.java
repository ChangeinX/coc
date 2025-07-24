package com.clanboards.messages.controller;

import com.clanboards.messages.graphql.Chat;
import com.clanboards.messages.graphql.ChatKind;
import com.clanboards.messages.graphql.Message;
import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import com.clanboards.messages.service.ChatService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Controller
public class GraphQLController {
    private final ChatService chatService;

    public GraphQLController(ChatService chatService) {
        this.chatService = chatService;
    }

    @QueryMapping
    public List<Chat> listChats() {
        return IntStream.range(0, ChatRepository.SHARD_COUNT)
                .mapToObj(i -> new Chat("global#shard-" + i, ChatKind.GLOBAL, null, Collections.emptyList(), Instant.EPOCH, null))
                .toList();
    }

    @QueryMapping
    public List<Message> getMessages(@Argument String chatId, @Argument Instant after, @Argument Integer limit) {
        int lim = limit != null ? limit : 50;
        List<ChatMessage> msgs = chatService.history(chatId, lim, after);
        return msgs.stream()
                .map(m -> new Message(UUID.randomUUID().toString(), m.channel(), m.ts(), m.userId(), m.content()))
                .toList();
    }

    @MutationMapping
    public Message sendMessage(@Argument String chatId, @Argument String content, @ContextValue("userId") String userId) {
        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("Unauthenticated");
        }
        ChatMessage saved;
        if (chatId.startsWith("global#")) {
            saved = chatService.publishGlobal(content, userId);
        } else {
            saved = chatService.publish(chatId, content, userId);
        }
        return new Message(UUID.randomUUID().toString(), saved.channel(), saved.ts(), saved.userId(), saved.content());
    }
}
