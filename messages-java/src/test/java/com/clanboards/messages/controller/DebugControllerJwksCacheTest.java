package com.clanboards.messages.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.service.JwksService;
import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.messages.config.OidcAuthenticationFilter;
import com.clanboards.messages.config.SecurityConfig;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = DebugController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, OidcAuthenticationFilter.class})
class DebugControllerJwksCacheTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private OidcProperties oidcProperties;

  @MockBean private OidcTokenValidator tokenValidator;

  @MockBean private JwksService jwksService;

  @Test
  void jwksCacheEndpoint_isPublic_andReturnsCacheInfo() throws Exception {
    when(jwksService.getCachedKeyFingerprints()).thenReturn(Map.of("dev-1", "abcd1234"));
    when(jwksService.getLastFetch()).thenReturn(Instant.parse("2025-09-01T00:00:00Z"));
    when(jwksService.getProviderLastUpdated()).thenReturn(Instant.parse("2025-09-01T00:00:00Z"));

    mockMvc
        .perform(get("/api/v1/chat/debug/jwks-cache"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.kids.dev-1").value("abcd1234"))
        .andExpect(jsonPath("$.lastFetch").value("2025-09-01T00:00:00Z"));
  }
}
