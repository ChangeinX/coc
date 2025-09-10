package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.clanboards.clashdata.repository.PlayerSnapshotRepository;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlayerSnapshotServiceTest {

  @Mock private PlayerSnapshotRepository playerSnapshotRepository;

  @InjectMocks private PlayerSnapshotService playerSnapshotService;

  private String playerTag;
  private LocalDateTime now;

  @BeforeEach
  void setUp() {
    playerTag = "#PLAYER123";
    now = LocalDateTime.of(2025, 1, 15, 12, 0, 0);
  }

  @Test
  void testGetPlayerHistory_WithSnapshots() {
    // Given
    int days = 30;
    LocalDateTime cutoff = now.minusDays(days);

    PlayerSnapshot snap1 = createPlayerSnapshot(playerTag, now.minusDays(5), 1000, 500, 2);
    PlayerSnapshot snap2 = createPlayerSnapshot(playerTag, now.minusDays(10), 900, 450, 1);
    PlayerSnapshot snap3 = createPlayerSnapshot(playerTag, now.minusDays(20), 800, 400, 0);

    List<PlayerSnapshot> snapshots =
        Arrays.asList(snap3, snap2, snap1); // Repository returns oldest to newest
    when(playerSnapshotRepository.findByPlayerTagAndTsAfterOrderByTsAsc(
            eq(playerTag), any(LocalDateTime.class)))
        .thenReturn(snapshots);

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getPlayerHistory(playerTag, days);

    // Then
    assertNotNull(result);
    assertEquals(3, result.size());
    assertEquals(snap3, result.get(0)); // Oldest first
    assertEquals(snap2, result.get(1));
    assertEquals(snap1, result.get(2)); // Newest last

    verify(playerSnapshotRepository)
        .findByPlayerTagAndTsAfterOrderByTsAsc(eq(playerTag), any(LocalDateTime.class));
  }

  @Test
  void testGetPlayerHistory_EmptyHistory() {
    // Given
    int days = 30;
    when(playerSnapshotRepository.findByPlayerTagAndTsAfterOrderByTsAsc(
            eq(playerTag), any(LocalDateTime.class)))
        .thenReturn(Arrays.asList());

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getPlayerHistory(playerTag, days);

    // Then
    assertNotNull(result);
    assertTrue(result.isEmpty());

    verify(playerSnapshotRepository)
        .findByPlayerTagAndTsAfterOrderByTsAsc(eq(playerTag), any(LocalDateTime.class));
  }

  @Test
  void testGetPlayerHistory_DefaultDays() {
    // Given
    PlayerSnapshot snap1 = createPlayerSnapshot(playerTag, now.minusDays(15), 1000, 500, 2);
    List<PlayerSnapshot> snapshots = Arrays.asList(snap1);
    when(playerSnapshotRepository.findByPlayerTagAndTsAfterOrderByTsAsc(
            eq(playerTag), any(LocalDateTime.class)))
        .thenReturn(snapshots);

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getPlayerHistory(playerTag);

    // Then
    assertNotNull(result);
    assertEquals(1, result.size());
    assertEquals(snap1, result.get(0));

    verify(playerSnapshotRepository)
        .findByPlayerTagAndTsAfterOrderByTsAsc(eq(playerTag), any(LocalDateTime.class));
  }

  @Test
  void testGetPlayerHistory_TagNormalization() {
    // Given
    String unnormalizedTag = "player123"; // No # prefix, lowercase
    String normalizedTag = "#PLAYER123";

    PlayerSnapshot snap1 = createPlayerSnapshot(normalizedTag, now.minusDays(5), 1000, 500, 2);
    when(playerSnapshotRepository.findByPlayerTagAndTsAfterOrderByTsAsc(
            eq(normalizedTag), any(LocalDateTime.class)))
        .thenReturn(Arrays.asList(snap1));

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getPlayerHistory(unnormalizedTag, 30);

    // Then
    assertNotNull(result);
    assertEquals(1, result.size());
    assertEquals(snap1, result.get(0));

    verify(playerSnapshotRepository)
        .findByPlayerTagAndTsAfterOrderByTsAsc(eq(normalizedTag), any(LocalDateTime.class));
  }

  @Test
  void testGetLatestSnapshotsForClan_WithMembers() {
    // Given
    String clanTag = "#CLAN123";

    PlayerSnapshot player1Latest = createPlayerSnapshot("#PLAYER1", now.minusDays(1), 1000, 500, 2);
    player1Latest.setClanTag("CLAN123");
    PlayerSnapshot player2Latest = createPlayerSnapshot("#PLAYER2", now.minusDays(2), 900, 450, 1);
    player2Latest.setClanTag("CLAN123");

    List<PlayerSnapshot> latestSnapshots = Arrays.asList(player1Latest, player2Latest);
    when(playerSnapshotRepository.findLatestSnapshotsForClan(eq("CLAN123")))
        .thenReturn(latestSnapshots);

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getLatestSnapshotsForClan(clanTag);

    // Then
    assertNotNull(result);
    assertEquals(2, result.size());
    assertEquals(player1Latest, result.get(0));
    assertEquals(player2Latest, result.get(1));

    verify(playerSnapshotRepository).findLatestSnapshotsForClan(eq("CLAN123"));
  }

  @Test
  void testGetLatestSnapshotsForClan_EmptyClan() {
    // Given
    String clanTag = "#EMPTY123";
    when(playerSnapshotRepository.findLatestSnapshotsForClan(eq("EMPTY123")))
        .thenReturn(Arrays.asList());

    // When
    List<PlayerSnapshot> result = playerSnapshotService.getLatestSnapshotsForClan(clanTag);

    // Then
    assertNotNull(result);
    assertTrue(result.isEmpty());

    verify(playerSnapshotRepository).findLatestSnapshotsForClan(eq("EMPTY123"));
  }

  private PlayerSnapshot createPlayerSnapshot(
      String playerTag, LocalDateTime ts, int trophies, int donations, Integer warAttacksUsed) {
    PlayerSnapshot snapshot = new PlayerSnapshot();
    snapshot.setPlayerTag(playerTag);
    snapshot.setTs(ts);
    snapshot.setTrophies(trophies);
    snapshot.setDonations(donations);
    snapshot.setWarAttacksUsed(warAttacksUsed);
    snapshot.setLastSeen(ts.minusHours(1)); // Last seen slightly before snapshot
    return snapshot;
  }
}
