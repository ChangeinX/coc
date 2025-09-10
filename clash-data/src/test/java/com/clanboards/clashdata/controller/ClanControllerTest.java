package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.clashdata.service.LoyaltyService;
import com.clanboards.clashdata.service.RiskService;
import com.clanboards.clashdata.service.SnapshotService;
import com.clanboards.clashdata.service.UserContextService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    value = ClanController.class,
    excludeAutoConfiguration = {
      org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    })
class ClanControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private SnapshotService snapshotService;
  @MockBean private LoyaltyService loyaltyService;
  @MockBean private RiskService riskService;
  @MockBean private UserContextService userContextService;

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

  @Test
  void testGetClanLoyalty_Success() throws Exception {
    // Given
    String clanTag = "#ABC123";
    Map<String, Integer> loyaltyData = new HashMap<>();
    loyaltyData.put("#PLAYER1", 30);
    loyaltyData.put("#PLAYER2", 15);
    loyaltyData.put("#PLAYER3", 120);

    when(loyaltyService.getClanLoyalty("#ABC123")).thenReturn(loyaltyData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/loyalty", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.#PLAYER1").value(30))
        .andExpect(jsonPath("$.#PLAYER2").value(15))
        .andExpect(jsonPath("$.#PLAYER3").value(120));
  }

  @Test
  void testGetClanLoyalty_EmptyClan() throws Exception {
    // Given
    String clanTag = "#EMPTY123";
    Map<String, Integer> emptyLoyaltyData = new HashMap<>();

    when(loyaltyService.getClanLoyalty("#EMPTY123")).thenReturn(emptyLoyaltyData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/loyalty", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$").isMap())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void testGetClanLoyalty_TagNormalization() throws Exception {
    // Given
    String unnormalizedTag = "abc123"; // No # prefix, lowercase
    Map<String, Integer> loyaltyData = new HashMap<>();
    loyaltyData.put("#PLAYER1", 5);

    // Service should receive the tag as-is, normalization happens in service
    when(loyaltyService.getClanLoyalty("abc123")).thenReturn(loyaltyData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/loyalty", unnormalizedTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.#PLAYER1").value(5));
  }

  @Test
  void testGetClanAtRisk_Success() throws Exception {
    // Given
    String clanTag = "#ABC123";
    List<Map<String, Object>> riskData = new ArrayList<>();

    // High risk player
    Map<String, Object> highRiskPlayer = new HashMap<>();
    highRiskPlayer.put("player_tag", "#PLAYER1");
    highRiskPlayer.put("name", "High Risk Player");
    highRiskPlayer.put("risk_score", 75);
    highRiskPlayer.put("last_seen", "2025-01-10T12:00:00Z");
    List<Map<String, Object>> breakdown1 = new ArrayList<>();
    Map<String, Object> breakdown1Item = new HashMap<>();
    breakdown1Item.put("points", 35);
    breakdown1Item.put("reason", "inactive for 4 days");
    breakdown1.add(breakdown1Item);
    highRiskPlayer.put("risk_breakdown", breakdown1);

    // Low risk player
    Map<String, Object> lowRiskPlayer = new HashMap<>();
    lowRiskPlayer.put("player_tag", "#PLAYER2");
    lowRiskPlayer.put("name", "Low Risk Player");
    lowRiskPlayer.put("risk_score", 15);
    lowRiskPlayer.put("last_seen", "2025-01-14T12:00:00Z");
    lowRiskPlayer.put("risk_breakdown", new ArrayList<>());

    riskData.add(highRiskPlayer);
    riskData.add(lowRiskPlayer);

    when(userContextService.getUserWeights()).thenReturn(null);
    when(riskService.getClanAtRisk("#ABC123", null)).thenReturn(riskData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/at-risk", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].player_tag").value("#PLAYER1"))
        .andExpect(jsonPath("$[0].name").value("High Risk Player"))
        .andExpect(jsonPath("$[0].risk_score").value(75))
        .andExpect(jsonPath("$[0].last_seen").value("2025-01-10T12:00:00Z"))
        .andExpect(jsonPath("$[0].risk_breakdown").isArray())
        .andExpect(jsonPath("$[0].risk_breakdown[0].points").value(35))
        .andExpect(jsonPath("$[0].risk_breakdown[0].reason").value("inactive for 4 days"))
        .andExpect(jsonPath("$[1].player_tag").value("#PLAYER2"))
        .andExpect(jsonPath("$[1].name").value("Low Risk Player"))
        .andExpect(jsonPath("$[1].risk_score").value(15));
  }

  @Test
  void testGetClanAtRisk_EmptyClan() throws Exception {
    // Given
    String clanTag = "#EMPTY123";
    List<Map<String, Object>> emptyRiskData = new ArrayList<>();

    when(userContextService.getUserWeights()).thenReturn(null);
    when(riskService.getClanAtRisk("#EMPTY123", null)).thenReturn(emptyRiskData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/at-risk", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void testGetClanAtRisk_WithCustomWeights() throws Exception {
    // Given
    String clanTag = "#ABC123";
    List<Map<String, Object>> riskData = new ArrayList<>();

    Map<String, Object> player = new HashMap<>();
    player.put("player_tag", "#PLAYER1");
    player.put("name", "Test Player");
    player.put("risk_score", 60);
    player.put("last_seen", "2025-01-14T12:00:00Z");
    player.put("risk_breakdown", new ArrayList<>());

    riskData.add(player);

    // Mock custom user weights
    Map<String, Double> customWeights = new HashMap<>();
    customWeights.put("war", 0.50);
    customWeights.put("idle", 0.30);
    customWeights.put("don_deficit", 0.15);
    customWeights.put("don_drop", 0.05);

    when(userContextService.getUserWeights()).thenReturn(customWeights);
    when(riskService.getClanAtRisk("#ABC123", customWeights)).thenReturn(riskData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/at-risk", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].player_tag").value("#PLAYER1"))
        .andExpect(jsonPath("$[0].risk_score").value(60));
  }

  @Test
  void testGetClanAtRisk_NoUserWeights() throws Exception {
    // Given
    String clanTag = "#ABC123";
    List<Map<String, Object>> riskData = new ArrayList<>();

    Map<String, Object> player = new HashMap<>();
    player.put("player_tag", "#PLAYER1");
    player.put("name", "Test Player");
    player.put("risk_score", 45);
    player.put("last_seen", "2025-01-14T12:00:00Z");
    player.put("risk_breakdown", new ArrayList<>());

    riskData.add(player);

    // Mock no user weights (unauthenticated or no profile)
    when(userContextService.getUserWeights()).thenReturn(null);
    when(riskService.getClanAtRisk("#ABC123", null)).thenReturn(riskData);

    // When & Then
    mockMvc
        .perform(get("/api/v1/clan-data/clans/{tag}/members/at-risk", clanTag))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].player_tag").value("#PLAYER1"))
        .andExpect(jsonPath("$[0].risk_score").value(45));
  }
}
