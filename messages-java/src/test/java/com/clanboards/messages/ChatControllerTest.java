package com.clanboards.messages;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ChatService chatService;

    @Test
    void publishReturnsOk() throws Exception {
        Instant ts = Instant.parse("2024-01-01T00:00:00Z");
        Mockito.when(chatService.publish("1", "hi", "0"))
                .thenReturn(new ChatMessage("1", "0", "hi", ts));

        mvc.perform(post("/api/v1/chat/publish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"groupId\":\"1\",\"text\":\"hi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.ts").value(ts.toString()));
    }

    @Test
    void historyReturnsMessages() throws Exception {
        Instant ts = Instant.parse("2024-01-01T00:00:00Z");
        List<ChatMessage> msgs = List.of(new ChatMessage("1", "0", "hi", ts));
        Mockito.when(chatService.history("1", 2)).thenReturn(msgs);

        mvc.perform(get("/api/v1/chat/history/1?limit=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("hi"));
    }
}
