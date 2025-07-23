package com.clanboards.messages.service;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import com.clanboards.messages.events.MessageSavedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ChatService {
    private final ChatRepository repository;
    private final ApplicationEventPublisher events;

    public ChatService(ChatRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    public ChatMessage publish(String chatId, String text, String userId) {
        Instant ts = Instant.now();
        ChatMessage msg = new ChatMessage(chatId, userId, text, ts);
        repository.saveMessage(msg);
        events.publishEvent(new MessageSavedEvent(msg));
        return msg;
    }

    public ChatMessage publishGlobal(String text, String userId) {
        Instant ts = Instant.now();
        String shard = ChatRepository.globalShardKey(userId);
        ChatMessage msg = new ChatMessage(shard, userId, text, ts);
        repository.saveGlobalMessage(msg);
        events.publishEvent(new MessageSavedEvent(msg));
        return msg;
    }

    public List<ChatMessage> history(String chatId, int limit) {
        return history(chatId, limit, null);
    }

    public List<ChatMessage> history(String chatId, int limit, Instant before) {
        return repository.listMessages(chatId, limit, before);
    }
}
