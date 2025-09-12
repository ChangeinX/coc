package com.clanboards.messages.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = com.clanboards.messages.controller.TestSecureController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, OidcJwtDecoderConfig.class})
class GraphQLAuthIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private JwtDecoder jwtDecoder;

  // Controller is provided as a separate test class under controller package

  @Test
  void secureEndpoint_AllowsWhenBearerTokenValid_andSetsSecurityContext() throws Exception {
    Instant now = Instant.now();
    Jwt jwt =
        new Jwt(
            "valid-token",
            now,
            now.plusSeconds(3600),
            Map.of("alg", "RS256"),
            Map.of("sub", "67890"));
    when(jwtDecoder.decode("valid-token")).thenReturn(jwt);

    mockMvc
        .perform(post("/api/v1/chat/secure-test").header("Authorization", "Bearer valid-token"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-UserId", "67890"));
  }

  @Test
  void secureEndpoint_Returns401_WhenNoTokenProvided() throws Exception {
    mockMvc.perform(post("/api/v1/chat/secure-test")).andExpect(status().isUnauthorized());
  }
}
