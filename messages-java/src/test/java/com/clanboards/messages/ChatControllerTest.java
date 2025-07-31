package com.clanboards.messages;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ChatControllerTest {

  @Autowired private MockMvc mvc;

  @MockBean private ChatService chatService;

  @Test
  void publishReturnsOk() throws Exception {
    Instant ts = Instant.parse("2024-01-01T00:00:00Z");
    Mockito.when(chatService.publish("1", "hi", "u", null, null))
        .thenReturn(new ChatMessage("m1", "1", "u", "hi", ts));

    mvc.perform(
            post("/api/v1/chat/publish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chatId\":\"1\",\"text\":\"hi\",\"userId\":\"u\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.ts").value(ts.toString()));
  }

  @Test
  void historyReturnsMessages() throws Exception {
    Instant ts = Instant.parse("2024-01-01T00:00:00Z");
    List<ChatMessage> msgs = List.of(new ChatMessage("m2", "1", "0", "hi", ts));
    Mockito.when(chatService.history(Mockito.eq("1"), Mockito.eq(2), Mockito.isNull()))
        .thenReturn(msgs);

    mvc.perform(get("/api/v1/chat/history/1?limit=2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].content").value("hi"));
  }

  @Test
  void publishGlobalReturnsOk() throws Exception {
    Instant ts = Instant.parse("2024-01-01T00:00:00Z");
    Mockito.when(chatService.publishGlobal("hi", "u", null, null))
        .thenReturn(new ChatMessage("m3", "global#shard-1", "u", "hi", ts));

    mvc.perform(
            post("/api/v1/chat/publish/global")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"hi\",\"userId\":\"u\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void publishHandlesBadRequest() throws Exception {
    Mockito.when(chatService.publish("1", "hi", "u", null, null))
        .thenThrow(new IllegalArgumentException("bad"));

    mvc.perform(
            post("/api/v1/chat/publish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chatId\":\"1\",\"text\":\"hi\",\"userId\":\"u\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("bad"));
  }

  @Test
  void restrictionEndpointReturnsNone() throws Exception {
    Mockito.when(chatService.getRestriction("u")).thenReturn(null);

    mvc.perform(get("/api/v1/chat/restrictions/u"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("NONE"));
  }
}
