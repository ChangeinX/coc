package com.clanboards.clashdata.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.clanboards.clashdata.entity.Clan;
import com.clanboards.clashdata.entity.ClanSnapshot;
import com.clanboards.clashdata.entity.Player;
import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.clanboards.clashdata.repository.ClanRepository;
import com.clanboards.clashdata.repository.ClanSnapshotRepository;
import com.clanboards.clashdata.repository.LoyaltyMembershipRepository;
import com.clanboards.clashdata.repository.PlayerRepository;
import com.clanboards.clashdata.repository.PlayerSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class SnapshotServiceTest {

  @Mock private ClanSnapshotRepository clanSnapshotRepository;
  @Mock private ClanRepository clanRepository;
  @Mock private PlayerSnapshotRepository playerSnapshotRepository;
  @Mock private PlayerRepository playerRepository;
  @Mock private LoyaltyMembershipRepository loyaltyMembershipRepository;
  @Mock private StringRedisTemplate redisTemplate;
  @Mock private ValueOperations<String, String> valueOperations;

  private SnapshotService snapshotService;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    snapshotService =
        new SnapshotService(
            clanSnapshotRepository,
            clanRepository,
            playerSnapshotRepository,
            playerRepository,
            loyaltyMembershipRepository,
            redisTemplate,
            60, // cacheTtl
            600 // staleAfter
            );
    objectMapper = new ObjectMapper();
  }

  @Test
  void testGetClan_CacheHit() throws Exception {
    // Given
    String clanTag = "#ABC123";
    String cacheKey = "snapshot:clan:#ABC123";
    // Use a recent timestamp that won't be considered stale
    String recentTimestamp =
        LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
    String cachedDataString =
        String.format(
            "{\"tag\":\"#ABC123\",\"name\":\"Test Clan\",\"ts\":\"%s\",\"members\":45}",
            recentTimestamp);
    when(valueOperations.get(cacheKey)).thenReturn(cachedDataString);

    // When
    JsonNode result = snapshotService.getClan(clanTag);

    // Then
    assertThat(result).isNotNull();
    assertThat(result.get("tag").asText()).isEqualTo("#ABC123");
    assertThat(result.get("name").asText()).isEqualTo("Test Clan");
    assertThat(result.get("members").asInt()).isEqualTo(45);

    // Verify no database calls were made
    verifyNoInteractions(clanSnapshotRepository);
    verifyNoInteractions(clanRepository);
  }

  @Test
  void testGetClan_CacheMiss_DatabaseHit() throws Exception {
    // Given
    String clanTag = "#ABC123";
    String cacheKey = "snapshot:clan:#ABC123";
    when(valueOperations.get(cacheKey)).thenReturn(null);

    // Mock clan snapshot
    ClanSnapshot clanSnapshot = new ClanSnapshot();
    clanSnapshot.setClanTag("#ABC123");
    clanSnapshot.setName("Test Clan");
    clanSnapshot.setMemberCount(45);
    clanSnapshot.setLevel(20);
    clanSnapshot.setWarWins(150);
    clanSnapshot.setWarLosses(25);
    clanSnapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));
    JsonNode snapshotData = objectMapper.readTree("{\"warWinStreak\": 15}");
    clanSnapshot.setData(snapshotData);

    when(clanSnapshotRepository.findTopByClanTagOrderByTsDesc("#ABC123")).thenReturn(clanSnapshot);

    // Mock clan metadata
    Clan clan = new Clan();
    clan.setTag("#ABC123");
    clan.setDeepLink("https://link.clashofclans.com/clan?tag=#ABC123");
    JsonNode clanData =
        objectMapper.readTree(
            "{\"description\":\"A great clan\",\"badgeUrls\":{\"large\":\"https://example.com/badge.png\"}}");
    clan.setData(clanData);
    when(clanRepository.findById("#ABC123")).thenReturn(Optional.of(clan));

    // Mock active members
    when(loyaltyMembershipRepository.findActivePlayerTagsByClanTag("#ABC123"))
        .thenReturn(List.of("#PLAYER1", "#PLAYER2"));

    // Mock player snapshots
    PlayerSnapshot player1Snapshot = new PlayerSnapshot();
    player1Snapshot.setPlayerTag("#PLAYER1");
    player1Snapshot.setName("Player One");
    player1Snapshot.setRole("member");
    player1Snapshot.setTownHall(14);
    player1Snapshot.setTrophies(3500);
    player1Snapshot.setDonations(1000);
    player1Snapshot.setDonationsReceived(800);
    player1Snapshot.setWarAttacksUsed(2);
    player1Snapshot.setLastSeen(LocalDateTime.of(2025, 1, 1, 11, 0, 0));
    JsonNode player1Data =
        objectMapper.readTree(
            "{\"league\":{\"iconUrls\":{\"tiny\":\"https://example.com/league1.png\"}},\"labels\":[{\"name\":\"Veteran\"}],\"deep_link\":\"https://link.clashofclans.com/player?tag=#PLAYER1\"}");
    player1Snapshot.setData(player1Data);
    player1Snapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    PlayerSnapshot player2Snapshot = new PlayerSnapshot();
    player2Snapshot.setPlayerTag("#PLAYER2");
    player2Snapshot.setName("Player Two");
    player2Snapshot.setRole("elder");
    player2Snapshot.setTownHall(15);
    player2Snapshot.setTrophies(4000);
    player2Snapshot.setDonations(1500);
    player2Snapshot.setDonationsReceived(1200);
    player2Snapshot.setWarAttacksUsed(3);
    player2Snapshot.setLastSeen(LocalDateTime.of(2025, 1, 1, 10, 30, 0));
    JsonNode player2Data =
        objectMapper.readTree(
            "{\"league\":{\"iconUrls\":{\"tiny\":\"https://example.com/league2.png\"}}}");
    player2Snapshot.setData(player2Data);
    player2Snapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    when(playerSnapshotRepository.findLatestSnapshotsByPlayerTags(List.of("#PLAYER1", "#PLAYER2")))
        .thenReturn(List.of(player1Snapshot, player2Snapshot));

    // Mock Player entities
    Player player1 = new Player();
    player1.setTag("#PLAYER1");
    JsonNode player1ExtraData =
        objectMapper.readTree(
            "{\"deep_link\":\"https://link.clashofclans.com/player?tag=#PLAYER1\"}");
    player1.setData(player1ExtraData);

    when(playerRepository.findById("#PLAYER1")).thenReturn(Optional.of(player1));
    when(playerRepository.findById("#PLAYER2")).thenReturn(Optional.empty());

    // When
    JsonNode result = snapshotService.getClan(clanTag);

    // Then
    assertThat(result).isNotNull();
    assertThat(result.get("tag").asText()).isEqualTo("#ABC123");
    assertThat(result.get("name").asText()).isEqualTo("Test Clan");
    assertThat(result.get("members").asInt()).isEqualTo(2); // Should be count of memberList
    assertThat(result.get("clanLevel").asInt()).isEqualTo(20);
    assertThat(result.get("warWins").asInt()).isEqualTo(150);
    assertThat(result.get("warLosses").asInt()).isEqualTo(25);
    assertThat(result.get("warWinStreak").asInt()).isEqualTo(15);
    assertThat(result.get("description").asText()).isEqualTo("A great clan");
    assertThat(result.get("badgeUrls").get("large").asText())
        .isEqualTo("https://example.com/badge.png");
    assertThat(result.get("deep_link").asText())
        .isEqualTo("https://link.clashofclans.com/clan?tag=#ABC123");

    // Check memberList
    JsonNode memberList = result.get("memberList");
    assertThat(memberList.isArray()).isTrue();
    assertThat(memberList).hasSize(2);

    JsonNode member1 = memberList.get(0);
    assertThat(member1.get("tag").asText()).isEqualTo("#PLAYER1");
    assertThat(member1.get("name").asText()).isEqualTo("Player One");
    assertThat(member1.get("role").asText()).isEqualTo("member");
    assertThat(member1.get("townHallLevel").asInt()).isEqualTo(14);
    assertThat(member1.get("trophies").asInt()).isEqualTo(3500);
    assertThat(member1.get("donations").asInt()).isEqualTo(1000);
    assertThat(member1.get("donationsReceived").asInt()).isEqualTo(800);
    assertThat(member1.get("warAttacksUsed").asInt()).isEqualTo(2);
    assertThat(member1.get("leagueIcon").asText()).isEqualTo("https://example.com/league1.png");
    assertThat(member1.get("deep_link").asText())
        .isEqualTo("https://link.clashofclans.com/player?tag=#PLAYER1");

    // Verify cache was set
    verify(valueOperations).set(eq(cacheKey), any(String.class), eq(60L), any());
  }

  @Test
  void testGetClan_NotFound() {
    // Given
    String clanTag = "#NOTFOUND";
    String cacheKey = "snapshot:clan:#NOTFOUND";
    when(valueOperations.get(cacheKey)).thenReturn(null);
    when(clanSnapshotRepository.findTopByClanTagOrderByTsDesc("#NOTFOUND")).thenReturn(null);

    // When
    JsonNode result = snapshotService.getClan(clanTag);

    // Then
    assertThat(result).isNull();

    // Verify cache was checked but not set
    verify(valueOperations).get(cacheKey);
  }

  @Test
  void testGetClan_TagNormalization() {
    // Given
    String unnormalizedTag = "abc123"; // no # prefix, lowercase
    String cacheKey = "snapshot:clan:#ABC123";
    when(valueOperations.get(cacheKey)).thenReturn(null);
    when(clanSnapshotRepository.findTopByClanTagOrderByTsDesc("#ABC123")).thenReturn(null);

    // When
    JsonNode result = snapshotService.getClan(unnormalizedTag);

    // Then
    assertThat(result).isNull();

    // Verify the tag was normalized before database query
    verify(clanSnapshotRepository).findTopByClanTagOrderByTsDesc("#ABC123");
  }
}
