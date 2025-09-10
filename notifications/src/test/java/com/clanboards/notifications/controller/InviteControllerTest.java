package com.clanboards.notifications.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.notifications.service.InviteService;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.main.allow-bean-definition-overriding=true",
      "jwt.signing-key=0123456789abcdef0123456789abcdef"
    })
@AutoConfigureMockMvc
class InviteControllerTest {

  @TestConfiguration
  static class TestConfig {
    @Bean
    @Primary
    DataSource dataSource() {
      DriverManagerDataSource ds = new DriverManagerDataSource();
      ds.setDriverClassName("org.h2.Driver");
      ds.setUrl("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1");
      ds.setUsername("sa");
      ds.setPassword("");
      return ds;
    }
  }

  @Autowired private MockMvc mockMvc;

  @MockBean private InviteService inviteService;

  @MockBean private com.clanboards.notifications.repository.UserRepository userRepository;

  @MockBean private com.clanboards.notifications.repository.SessionRepository sessionRepository;

  @MockBean private com.clanboards.notifications.service.SqsListener sqsListener;

  @MockBean private nl.martijndwars.webpush.PushService pushService;

  @Test
  void sendInvite_ValidRequest_ReturnsNoContent() throws Exception {
    // Arrange
    Long fromUserId = 123L;
    Long toUserId = 456L;

    doNothing().when(inviteService).sendInvite(fromUserId, toUserId);

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/notifications/invites/{toUserId}", toUserId)
                .header("X-User-Id", fromUserId.toString()))
        .andExpect(status().isNoContent());

    verify(inviteService).sendInvite(fromUserId, toUserId);
  }

  @Test
  void sendInvite_MissingUserIdHeader_ReturnsBadRequest() throws Exception {
    // Act & Assert
    mockMvc.perform(post("/api/v1/notifications/invites/456")).andExpect(status().isBadRequest());

    verifyNoInteractions(inviteService);
  }

  @Test
  void sendInvite_InvalidUserIdHeader_ReturnsBadRequest() throws Exception {
    // Act & Assert
    mockMvc
        .perform(post("/api/v1/notifications/invites/456").header("X-User-Id", "invalid"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(inviteService);
  }

  @Test
  void sendInvite_ServiceThrowsException_ReturnsInternalServerError() throws Exception {
    // Arrange
    Long fromUserId = 123L;
    Long toUserId = 456L;

    doThrow(new RuntimeException("Service error"))
        .when(inviteService)
        .sendInvite(fromUserId, toUserId);

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/notifications/invites/{toUserId}", toUserId)
                .header("X-User-Id", fromUserId.toString()))
        .andExpect(status().isInternalServerError());

    verify(inviteService).sendInvite(fromUserId, toUserId);
  }
}
