package com.clanboards.clashdata.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class PlayerSnapshotRepositoryTest {

  @Autowired private TestEntityManager entityManager;

  @Autowired private PlayerSnapshotRepository playerSnapshotRepository;

  @Test
  void testFindLatestSnapshotsByPlayerTags() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data1 = mapper.readTree("{\"league\": {\"iconUrls\": {\"tiny\": \"url1\"}}}");
    JsonNode data2 = mapper.readTree("{\"league\": {\"iconUrls\": {\"tiny\": \"url2\"}}}");

    // Player 1 - older snapshot
    PlayerSnapshot player1Old = new PlayerSnapshot();
    player1Old.setPlayerTag("#PLAYER1");
    player1Old.setClanTag("#CLAN123");
    player1Old.setName("Player One");
    player1Old.setRole("member");
    player1Old.setTownHall(13);
    player1Old.setTrophies(3400);
    player1Old.setDonations(900);
    player1Old.setDonationsReceived(700);
    player1Old.setWarAttacksUsed(2);
    player1Old.setLastSeen(LocalDateTime.of(2025, 1, 1, 9, 0, 0));
    player1Old.setData(data1);
    player1Old.setTs(LocalDateTime.of(2025, 1, 1, 10, 0, 0));

    // Player 1 - newer snapshot (this should be returned)
    PlayerSnapshot player1New = new PlayerSnapshot();
    player1New.setPlayerTag("#PLAYER1");
    player1New.setClanTag("#CLAN123");
    player1New.setName("Player One");
    player1New.setRole("member");
    player1New.setTownHall(14);
    player1New.setTrophies(3500);
    player1New.setDonations(1000);
    player1New.setDonationsReceived(800);
    player1New.setWarAttacksUsed(2);
    player1New.setLastSeen(LocalDateTime.of(2025, 1, 1, 11, 0, 0));
    player1New.setData(data2);
    player1New.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    // Player 2 - only one snapshot
    PlayerSnapshot player2 = new PlayerSnapshot();
    player2.setPlayerTag("#PLAYER2");
    player2.setClanTag("#CLAN123");
    player2.setName("Player Two");
    player2.setRole("elder");
    player2.setTownHall(15);
    player2.setTrophies(4000);
    player2.setDonations(1500);
    player2.setDonationsReceived(1200);
    player2.setWarAttacksUsed(3);
    player2.setLastSeen(LocalDateTime.of(2025, 1, 1, 11, 30, 0));
    player2.setData(data1);
    player2.setTs(LocalDateTime.of(2025, 1, 1, 12, 30, 0));

    entityManager.persistAndFlush(player1Old);
    entityManager.persistAndFlush(player1New);
    entityManager.persistAndFlush(player2);

    // When
    List<String> playerTags = List.of("#PLAYER1", "#PLAYER2");
    List<PlayerSnapshot> results =
        playerSnapshotRepository.findLatestSnapshotsByPlayerTags(playerTags);

    // Then
    assertThat(results).hasSize(2);

    PlayerSnapshot result1 =
        results.stream().filter(p -> p.getPlayerTag().equals("#PLAYER1")).findFirst().orElse(null);
    assertThat(result1).isNotNull();
    assertThat(result1.getTownHall()).isEqualTo(14); // should be the newer snapshot
    assertThat(result1.getTrophies()).isEqualTo(3500);
    assertThat(result1.getTs()).isEqualTo(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    PlayerSnapshot result2 =
        results.stream().filter(p -> p.getPlayerTag().equals("#PLAYER2")).findFirst().orElse(null);
    assertThat(result2).isNotNull();
    assertThat(result2.getName()).isEqualTo("Player Two");
    assertThat(result2.getRole()).isEqualTo("elder");
    assertThat(result2.getTownHall()).isEqualTo(15);
  }

  @Test
  void testFindLatestSnapshotsByPlayerTags_EmptyList() {
    // When
    List<PlayerSnapshot> results =
        playerSnapshotRepository.findLatestSnapshotsByPlayerTags(List.of());

    // Then
    assertThat(results).isEmpty();
  }

  @Test
  void testFindLatestSnapshotsByPlayerTags_NoMatches() {
    // When
    List<String> playerTags = List.of("#NOTFOUND1", "#NOTFOUND2");
    List<PlayerSnapshot> results =
        playerSnapshotRepository.findLatestSnapshotsByPlayerTags(playerTags);

    // Then
    assertThat(results).isEmpty();
  }
}
