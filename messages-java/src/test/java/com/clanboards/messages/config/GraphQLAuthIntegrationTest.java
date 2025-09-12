package com.clanboards.messages.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = com.clanboards.messages.controller.TestSecureController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, OidcAuthenticationFilter.class})
class GraphQLAuthIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private OidcTokenValidator tokenValidator;

  // Controller is provided as a separate test class under controller package

  @Test
  void secureEndpoint_AllowsWhenBearerTokenValid_andSetsSecurityContext() throws Exception {
    Claims claims = Mockito.mock(Claims.class);
    when(tokenValidator.validateToken("valid-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(67890L);

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
