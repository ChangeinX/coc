package com.clanboards.notifications;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.notifications.repository.UserRepository;
import com.clanboards.notifications.service.NotificationService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.main.allow-bean-definition-overriding=true",
      "jwt.signing-key=0123456789abcdef0123456789abcdef"
    })
@AutoConfigureMockMvc
class NotificationControllerAuthTest {

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

  @Autowired private MockMvc mvc;

  @MockBean private NotificationService service;

  @MockBean private UserRepository userRepository;

  @MockBean private com.clanboards.notifications.service.SqsListener sqsListener;

  @MockBean private nl.martijndwars.webpush.PushService pushService;

  private static final byte[] KEY =
      "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);

  private static String token(String sub) {
    return Jwts.builder().claim("sub", sub).signWith(SignatureAlgorithm.HS256, KEY).compact();
  }

  @Test
  void unauthenticatedRequestsReturn401() throws Exception {
    mvc.perform(
            post("/api/v1/notifications/subscribe")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"endpoint\":\"e\",\"p256dhKey\":\"k\",\"authKey\":\"a\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void validTokenSucceeds() throws Exception {
    mvc.perform(
            post("/api/v1/notifications/subscribe")
                .header("Authorization", "Bearer " + token("1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"endpoint\":\"e\",\"p256dhKey\":\"k\",\"authKey\":\"a\"}"))
        .andExpect(status().isOk());
  }
}
