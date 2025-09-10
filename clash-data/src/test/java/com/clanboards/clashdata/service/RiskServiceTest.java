package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RiskServiceTest {

  @Mock private PlayerSnapshotService playerSnapshotService;
  @Mock private SnapshotService snapshotService;
  @Mock private Clock clock;

  @InjectMocks private RiskService riskService;

  private LocalDateTime now;
  private String clanTag;

  @BeforeEach
  void setUp() {
    clanTag = "#CLAN123";
    now = LocalDateTime.of(2025, 1, 15, 12, 0, 0);

    // Mock the clock to return our test time
    ZonedDateTime fixedInstant = now.atZone(ZoneId.systemDefault());
    when(clock.instant()).thenReturn(fixedInstant.toInstant());
    when(clock.getZone()).thenReturn(ZoneId.systemDefault());
  }

  @Test
  void testGetClanAtRisk_WithMultipleMembers() {
    // Given
    PlayerSnapshot player1Latest =
        createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(1), 1000, 500, 300, 2);
    PlayerSnapshot player2Latest =
        createPlayerSnapshot("#PLAYER2", "Player Two", now.minusDays(1), 900, 400, 250, 0);

    List<PlayerSnapshot> latestSnapshots = Arrays.asList(player1Latest, player2Latest);
    when(playerSnapshotService.getLatestSnapshotsForClan(clanTag)).thenReturn(latestSnapshots);

    // Mock history for player 1 (low risk)
    List<PlayerSnapshot> player1History =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(10), 900, 450, 200, 1),
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(5), 950, 475, 250, 2),
            player1Latest);
    when(playerSnapshotService.getPlayerHistory("#PLAYER1", 30)).thenReturn(player1History);

    // Mock history for player 2 (high risk - idle for 4 days, no war attacks)
    List<PlayerSnapshot> player2History =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER2", "Player Two", now.minusDays(10), 850, 350, 200, 1),
            createPlayerSnapshot("#PLAYER2", "Player Two", now.minusDays(8), 900, 400, 220, 0),
            player2Latest);
    // Set last seen to 4 days ago (high idle risk)
    player2Latest.setLastSeen(now.minusDays(4));
    when(playerSnapshotService.getPlayerHistory("#PLAYER2", 30)).thenReturn(player2History);

    // When
    List<Map<String, Object>> result = riskService.getClanAtRisk(clanTag, null);

    // Then
    assertNotNull(result);
    assertEquals(2, result.size());

    // Results should be sorted by risk score (highest first)
    Map<String, Object> firstPlayer = result.get(0);
    Map<String, Object> secondPlayer = result.get(1);

    assertTrue((Integer) firstPlayer.get("risk_score") >= (Integer) secondPlayer.get("risk_score"));

    // Verify structure
    assertTrue(firstPlayer.containsKey("player_tag"));
    assertTrue(firstPlayer.containsKey("name"));
    assertTrue(firstPlayer.containsKey("risk_score"));
    assertTrue(firstPlayer.containsKey("last_seen"));
    assertTrue(firstPlayer.containsKey("risk_breakdown"));

    verify(snapshotService).getClan(clanTag);
    verify(playerSnapshotService).getLatestSnapshotsForClan(clanTag);
    verify(playerSnapshotService).getPlayerHistory("#PLAYER1", 30);
    verify(playerSnapshotService).getPlayerHistory("#PLAYER2", 30);
  }

  @Test
  void testGetClanAtRisk_EmptyClan() {
    // Given
    when(playerSnapshotService.getLatestSnapshotsForClan(clanTag)).thenReturn(Arrays.asList());

    // When
    List<Map<String, Object>> result = riskService.getClanAtRisk(clanTag, null);

    // Then
    assertNotNull(result);
    assertTrue(result.isEmpty());

    verify(snapshotService).getClan(clanTag);
    verify(playerSnapshotService).getLatestSnapshotsForClan(clanTag);
    verifyNoMoreInteractions(playerSnapshotService); // Empty clan means no player history calls
  }

  @Test
  void testGetClanAtRisk_WithCustomWeights() {
    // Given
    Map<String, Double> customWeights = new HashMap<>();
    customWeights.put("war", 0.5);
    customWeights.put("idle", 0.3);
    customWeights.put("don_deficit", 0.1);
    customWeights.put("don_drop", 0.1);

    PlayerSnapshot playerLatest =
        createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(1), 1000, 500, 300, 0);
    when(playerSnapshotService.getLatestSnapshotsForClan(clanTag))
        .thenReturn(Arrays.asList(playerLatest));

    List<PlayerSnapshot> playerHistory =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(5), 950, 450, 250, 2),
            playerLatest);
    when(playerSnapshotService.getPlayerHistory("#PLAYER1", 30)).thenReturn(playerHistory);

    // When
    List<Map<String, Object>> result = riskService.getClanAtRisk(clanTag, customWeights);

    // Then
    assertNotNull(result);
    assertEquals(1, result.size());

    Map<String, Object> player = result.get(0);
    assertTrue(player.containsKey("risk_score"));
    assertTrue(player.containsKey("risk_breakdown"));

    verify(snapshotService).getClan(clanTag);
  }

  @Test
  void testCalculateRiskScore_HighWarRisk() {
    // Given - Player with missed war attacks
    List<PlayerSnapshot> history =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(5), 950, 450, 250, 1),
            createPlayerSnapshot(
                "#PLAYER1", "Player One", now.minusDays(1), 1000, 500, 300, 0) // 0 attacks used
            );

    // When
    int riskScore = riskService.calculateRiskScore(history, null, null);

    // Then
    assertTrue(riskScore > 0, "Risk score should be > 0 for player with no war attacks");
  }

  @Test
  void testCalculateRiskScore_HighIdleRisk() {
    // Given - Player idle for 4+ days
    PlayerSnapshot recentSnapshot =
        createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(1), 1000, 500, 300, 2);
    recentSnapshot.setLastSeen(now.minusDays(4)); // Last seen 4 days ago

    List<PlayerSnapshot> history =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(5), 950, 450, 250, 2),
            recentSnapshot);

    // When
    int riskScore = riskService.calculateRiskScore(history, null, null);

    // Then
    assertTrue(riskScore > 0, "Risk score should be > 0 for idle player");
  }

  @Test
  void testCalculateRiskScore_LowRisk() {
    // Given - Active player with good stats
    List<PlayerSnapshot> history =
        Arrays.asList(
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(5), 950, 450, 250, 2),
            createPlayerSnapshot("#PLAYER1", "Player One", now.minusDays(1), 1000, 500, 300, 2));

    // When
    int riskScore = riskService.calculateRiskScore(history, null, null);

    // Then
    assertTrue(riskScore >= 0 && riskScore <= 100, "Risk score should be between 0-100");
  }

  private PlayerSnapshot createPlayerSnapshot(
      String playerTag,
      String name,
      LocalDateTime ts,
      int trophies,
      int donations,
      int donationsReceived,
      Integer warAttacksUsed) {
    PlayerSnapshot snapshot = new PlayerSnapshot();
    snapshot.setPlayerTag(playerTag);
    snapshot.setName(name);
    snapshot.setTs(ts);
    snapshot.setTrophies(trophies);
    snapshot.setDonations(donations);
    snapshot.setDonationsReceived(donationsReceived);
    snapshot.setWarAttacksUsed(warAttacksUsed);
    snapshot.setLastSeen(ts.minusHours(1)); // Default last seen to slightly before snapshot
    return snapshot;
  }
}
