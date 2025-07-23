package com.clanboards.messages.service;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.repository.ChatRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ChatServiceTest {
    @Test
    void publishSavesMessage() {
        ChatRepository repo = Mockito.mock(ChatRepository.class);
        ChatService service = new ChatService(repo);

        ChatMessage msg = service.publish("1", "hello", "u");
        assertEquals("1", msg.channel());
        Mockito.verify(repo).saveMessage(Mockito.any(ChatMessage.class));
    }

    @Test
    void historyDelegatesToRepo() {
        ChatRepository repo = Mockito.mock(ChatRepository.class);
        List<ChatMessage> expected = List.of(new ChatMessage("1", "u", "hi", Instant.now()));
        Mockito.when(repo.listMessages("1", 2, null)).thenReturn(expected);

        ChatService service = new ChatService(repo);
        List<ChatMessage> result = service.history("1", 2, null);
        assertSame(expected, result);
    }
}
