package com.clanboards.messages;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.model.Session;
import com.clanboards.messages.repository.SessionRepository;
import com.clanboards.messages.service.ChatService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties =
        "jwt.signing-key=test-secret-key-for-jwt-signing-that-is-long-enough-for-hmac-sha256-requirements")
@AutoConfigureMockMvc
class GraphQLControllerTest {
  @Autowired private MockMvc mvc;

  @MockBean private ChatService chatService;
  @MockBean private SessionRepository sessionRepository;

  private static final String TEST_KEY =
      "test-secret-key-for-jwt-signing-that-is-long-enough-for-hmac-sha256-requirements";
  private static final SecretKey signingKey =
      Keys.hmacShaKeyFor(TEST_KEY.getBytes(StandardCharsets.UTF_8));

  private String token(String sub, Long sessionId) {
    return Jwts.builder()
        .setSubject(sub)
        .claim("sid", sessionId)
        .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
        .signWith(signingKey)
        .compact();
  }

  @Test
  void getMessagesWorks() throws Exception {
    // Setup session mock
    Long sessionId = 1L;
    Long userId = 42L;
    Session session = new Session();
    session.setId(sessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().plusSeconds(3600));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    Instant ts = Instant.parse("2024-01-01T00:00:00Z");
    List<ChatMessage> msgs = List.of(new ChatMessage("m1", "1", "u", "hi", ts));
    Mockito.when(chatService.history("1", 2, null)).thenReturn(msgs);

    String query = "query($id:ID!,$limit:Int){ getMessages(chatId:$id,limit:$limit){ content } }";
    mvc.perform(
            post("/api/v1/chat/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token("u", sessionId))
                .content("{\"query\":\"" + query + "\",\"variables\":{\"id\":\"1\",\"limit\":2}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.getMessages[0].content").value("hi"));
  }

  @Test
  void createDirectChatWorks() throws Exception {
    // Setup session mock
    Long sessionId = 2L;
    Long userId = 99L;
    Session session = new Session();
    session.setId(sessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().plusSeconds(3600));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    Mockito.when(chatService.createDirectChat(String.valueOf(userId), "v"))
        .thenReturn("direct#u#v");

    String query = "mutation($id:ID!){ createDirectChat(recipientId:$id){ id } }";
    mvc.perform(
            post("/api/v1/chat/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token("u", sessionId))
                .content("{\"query\":\"" + query + "\",\"variables\":{\"id\":\"v\"}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.createDirectChat.id").value("direct#u#v"));
    Mockito.verify(chatService).createDirectChat(String.valueOf(userId), "v");
  }
}
