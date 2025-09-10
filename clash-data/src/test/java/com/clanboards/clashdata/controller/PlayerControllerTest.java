package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.clashdata.service.PlayerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = PlayerController.class,
    excludeAutoConfiguration = {
      org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    })
class PlayerControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private PlayerService playerService;

  @Autowired private ObjectMapper objectMapper;

  @Test
  void getPlayer_WithValidPlayerTag_ReturnsPlayerData() throws Exception {
    // Given
    String playerTag = "2Y0Y9CL";
    JsonNode playerData =
        objectMapper.readTree(
            """
        {
          "tag": "#2Y0Y9CL",
          "name": "TestPlayer",
          "townHallLevel": 15,
          "trophies": 5000,
          "loyalty": 30,
          "risk_score": 25,
          "risk_breakdown": [
            {"category": "war", "score": 10},
            {"category": "idle", "score": 15}
          ]
        }
        """);

    when(playerService.getPlayerProfile(playerTag)).thenReturn(playerData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/players/{playerTag}", playerTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.tag").value("#2Y0Y9CL"))
        .andExpect(jsonPath("$.name").value("TestPlayer"))
        .andExpect(jsonPath("$.loyalty").value(30))
        .andExpect(jsonPath("$.risk_score").value(25));
  }

  @Test
  void getPlayer_WithInvalidPlayerTag_ReturnsNotFound() throws Exception {
    // Given
    String playerTag = "INVALID";
    when(playerService.getPlayerProfile(playerTag)).thenReturn(null);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/players/{playerTag}", playerTag))
        .andExpect(status().isNotFound());
  }

  @Test
  void getPlayerByUser_WithValidUserSub_ReturnsPlayerData() throws Exception {
    // Given
    String userSub = "google-oauth2|123456789";
    JsonNode playerData =
        objectMapper.readTree(
            """
        {
          "tag": "#2Y0Y9CL",
          "name": "TestPlayer",
          "townHallLevel": 15,
          "trophies": 5000,
          "loyalty": 30,
          "risk_score": 25,
          "risk_breakdown": []
        }
        """);

    when(playerService.getPlayerProfileByUser(userSub)).thenReturn(playerData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/players/by-user/{userSub}", userSub))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.tag").value("#2Y0Y9CL"))
        .andExpect(jsonPath("$.name").value("TestPlayer"));
  }

  @Test
  void getPlayerByUser_WithInvalidUserSub_ReturnsNotFound() throws Exception {
    // Given
    String userSub = "invalid-user";
    when(playerService.getPlayerProfileByUser(userSub)).thenReturn(null);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/players/by-user/{userSub}", userSub))
        .andExpect(status().isNotFound());
  }
}
