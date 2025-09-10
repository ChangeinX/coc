package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.clashdata.service.WarService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = WarController.class,
    excludeAutoConfiguration = {
      org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    })
class WarControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private WarService warService;

  @Autowired private ObjectMapper objectMapper;

  @Test
  void getCurrentWar_WithValidClanTag_ReturnsWarData() throws Exception {
    // Given
    String clanTag = "2Y0Y9CL";
    JsonNode warData =
        objectMapper.readTree(
            """
        {
          "state": "inWar",
          "teamSize": 15,
          "preparationStartTime": "20231201T120000.000Z",
          "startTime": "20231201T180000.000Z",
          "endTime": "20231202T180000.000Z"
        }
        """);

    when(warService.getCurrentWarSnapshot(clanTag)).thenReturn(warData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/wars/{clanTag}/current", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.state").value("inWar"))
        .andExpect(jsonPath("$.teamSize").value(15));
  }

  @Test
  void getCurrentWar_WithClanNotInWar_ReturnsNotInWarState() throws Exception {
    // Given
    String clanTag = "2Y0Y9CL";
    when(warService.getCurrentWarSnapshot(clanTag)).thenReturn(null);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/wars/{clanTag}/current", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.state").value("notInWar"));
  }

  @Test
  void getCurrentWar_WithInvalidClanTag_ReturnsNotInWarState() throws Exception {
    // Given
    String invalidClanTag = "INVALID";
    when(warService.getCurrentWarSnapshot(invalidClanTag)).thenReturn(null);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/wars/{clanTag}/current", invalidClanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.state").value("notInWar"));
  }
}
