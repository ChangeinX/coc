package com.clanboards.clashdata.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    value = HealthController.class,
    excludeAutoConfiguration = {
      org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    })
public class HealthControllerTest {

  @Autowired private MockMvc mockMvc;

  @Test
  public void healthCheck_shouldReturnOkStatus() throws Exception {
    mockMvc
        .perform(get("/api/v1/health"))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  public void healthCheck_withTrailingSlash_shouldReturnOkStatus() throws Exception {
    mockMvc
        .perform(get("/api/v1/health/"))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.status").value("ok"));
  }
}
