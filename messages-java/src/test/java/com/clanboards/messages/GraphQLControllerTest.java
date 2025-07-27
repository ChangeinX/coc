package com.clanboards.messages;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import java.time.Instant;
import java.util.Base64;
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
class GraphQLControllerTest {
  @Autowired private MockMvc mvc;

  @MockBean private ChatService chatService;

  private static String token(String sub) {
    String payload =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(("{\"sub\":\"" + sub + "\"}").getBytes());
    return "x." + payload + ".y";
  }

  @Test
  void getMessagesWorks() throws Exception {
    Instant ts = Instant.parse("2024-01-01T00:00:00Z");
    List<ChatMessage> msgs = List.of(new ChatMessage("m1", "1", "u", "hi", ts));
    Mockito.when(chatService.history("1", 2, null)).thenReturn(msgs);

    String query = "query($id:ID!,$limit:Int){ getMessages(chatId:$id,limit:$limit){ content } }";
    mvc.perform(
            post("/api/v1/chat/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token("u"))
                .content("{\"query\":\"" + query + "\",\"variables\":{\"id\":\"1\",\"limit\":2}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.getMessages[0].content").value("hi"));
  }

  @Test
  void createDirectChatWorks() throws Exception {
    Mockito.when(chatService.createDirectChat("u", "v")).thenReturn("direct#u#v");

    String query = "mutation($id:ID!){ createDirectChat(recipientId:$id){ id } }";
    mvc.perform(
            post("/api/v1/chat/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token("u"))
                .content("{\"query\":\"" + query + "\",\"variables\":{\"id\":\"v\"}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.createDirectChat.id").value("direct#u#v"));
    Mockito.verify(chatService).createDirectChat("u", "v");
  }
}
