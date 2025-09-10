package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.clashdata.service.SnapshotService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ClanController.class)
class ClanControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private SnapshotService snapshotService;

  @Test
  void testGetClan_Success() throws Exception {
    // Given
    String clanTag = "#ABC123";
    ObjectMapper mapper = new ObjectMapper();
    JsonNode mockClanData =
        mapper.readTree(
            """
        {
          "tag": "ABC123",
          "name": "Test Clan",
          "clanLevel": 20,
          "members": 45,
          "warWins": 150,
          "warLosses": 25,
          "warWinStreak": 15,
          "ts": "2025-01-01T12:00:00Z",
          "description": "A great test clan",
          "badgeUrls": {
            "large": "https://example.com/badge.png"
          },
          "deep_link": "https://link.clashofclans.com/clan?tag=#ABC123",
          "memberList": [
            {
              "tag": "#PLAYER1",
              "name": "Player One",
              "role": "member",
              "townHallLevel": 14,
              "trophies": 3500,
              "donations": 1000,
              "donationsReceived": 800,
              "warAttacksUsed": 2,
              "last_seen": "2025-01-01T11:00:00Z",
              "leagueIcon": "https://example.com/league1.png",
              "deep_link": "https://link.clashofclans.com/player?tag=#PLAYER1"
            }
          ]
        }
        """);

    when(snapshotService.getClan("#ABC123")).thenReturn(mockClanData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.tag").value("ABC123"))
        .andExpect(jsonPath("$.name").value("Test Clan"))
        .andExpect(jsonPath("$.clanLevel").value(20))
        .andExpect(jsonPath("$.members").value(45))
        .andExpect(jsonPath("$.warWins").value(150))
        .andExpect(jsonPath("$.warLosses").value(25))
        .andExpect(jsonPath("$.warWinStreak").value(15))
        .andExpect(jsonPath("$.description").value("A great test clan"))
        .andExpect(jsonPath("$.badgeUrls.large").value("https://example.com/badge.png"))
        .andExpect(jsonPath("$.deep_link").value("https://link.clashofclans.com/clan?tag=#ABC123"))
        .andExpect(jsonPath("$.memberList").isArray())
        .andExpect(jsonPath("$.memberList[0].tag").value("#PLAYER1"))
        .andExpect(jsonPath("$.memberList[0].name").value("Player One"))
        .andExpect(jsonPath("$.memberList[0].role").value("member"))
        .andExpect(jsonPath("$.memberList[0].townHallLevel").value(14))
        .andExpect(jsonPath("$.memberList[0].trophies").value(3500))
        .andExpect(jsonPath("$.memberList[0].donations").value(1000))
        .andExpect(jsonPath("$.memberList[0].donationsReceived").value(800))
        .andExpect(jsonPath("$.memberList[0].warAttacksUsed").value(2))
        .andExpect(jsonPath("$.memberList[0].leagueIcon").value("https://example.com/league1.png"))
        .andExpect(
            jsonPath("$.memberList[0].deep_link")
                .value("https://link.clashofclans.com/player?tag=#PLAYER1"));
  }

  @Test
  void testGetClan_NotFound() throws Exception {
    // Given
    String clanTag = "#NOTFOUND";
    when(snapshotService.getClan("#NOTFOUND")).thenReturn(null);

    // When & Then
    mockMvc.perform(get("/api/v1/clan-data/clans/{tag}", clanTag)).andExpect(status().isNotFound());
  }

  @Test
  void testGetClan_TagNormalization() throws Exception {
    // Given - use unnormalized tag in URL
    String unnormalizedTag = "abc123"; // no # prefix, lowercase
    ObjectMapper mapper = new ObjectMapper();
    JsonNode mockClanData =
        mapper.readTree(
            """
        {
          "tag": "ABC123",
          "name": "Test Clan",
          "clanLevel": 20,
          "members": 45
        }
        """);

    // Service should receive normalized tag
    when(snapshotService.getClan("abc123")).thenReturn(mockClanData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}", unnormalizedTag))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tag").value("ABC123"))
        .andExpect(jsonPath("$.name").value("Test Clan"));
  }

  @Test
  void testGetClan_InvalidTag() throws Exception {
    // Given
    String invalidTag = ""; // empty tag

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}", invalidTag))
        .andExpect(status().isNotFound()); // Spring will return 404 for empty path variable
  }
}
