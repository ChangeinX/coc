package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class PlayerSnapshotTest {

  @Test
  void testPlayerSnapshotMapping() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data =
        mapper.readTree(
            "{\"league\": {\"iconUrls\": {\"tiny\": \"https://example.com/league.png\"}}, \"labels\": [{\"name\": \"Veteran\"}]}");

    PlayerSnapshot snapshot = new PlayerSnapshot();
    snapshot.setPlayerTag("#PLAYER123");
    snapshot.setClanTag("#CLAN123");
    snapshot.setName("TestPlayer");
    snapshot.setRole("member");
    snapshot.setTownHall(14);
    snapshot.setTrophies(3500);
    snapshot.setDonations(1000);
    snapshot.setDonationsReceived(800);
    snapshot.setWarAttacksUsed(2);
    snapshot.setLastSeen(LocalDateTime.of(2025, 1, 1, 10, 0, 0));
    snapshot.setData(data);
    snapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    // Then
    assertThat(snapshot.getPlayerTag()).isEqualTo("#PLAYER123");
    assertThat(snapshot.getClanTag()).isEqualTo("#CLAN123");
    assertThat(snapshot.getName()).isEqualTo("TestPlayer");
    assertThat(snapshot.getRole()).isEqualTo("member");
    assertThat(snapshot.getTownHall()).isEqualTo(14);
    assertThat(snapshot.getTrophies()).isEqualTo(3500);
    assertThat(snapshot.getDonations()).isEqualTo(1000);
    assertThat(snapshot.getDonationsReceived()).isEqualTo(800);
    assertThat(snapshot.getWarAttacksUsed()).isEqualTo(2);
    assertThat(snapshot.getLastSeen()).isEqualTo(LocalDateTime.of(2025, 1, 1, 10, 0, 0));
    assertThat(snapshot.getData()).isNotNull();
    assertThat(snapshot.getData().get("league").get("iconUrls").get("tiny").asText())
        .isEqualTo("https://example.com/league.png");
    assertThat(snapshot.getTs()).isEqualTo(LocalDateTime.of(2025, 1, 1, 12, 0, 0));
  }

  @Test
  void testPlayerSnapshotWithNullValues() {
    // Given
    PlayerSnapshot snapshot = new PlayerSnapshot();
    snapshot.setPlayerTag("#PLAYER456");
    snapshot.setClanTag("#CLAN456");
    snapshot.setName("NullDataPlayer");
    snapshot.setRole(null);
    snapshot.setWarAttacksUsed(null);
    snapshot.setLastSeen(null);
    snapshot.setData(null);

    // Then
    assertThat(snapshot.getPlayerTag()).isEqualTo("#PLAYER456");
    assertThat(snapshot.getRole()).isNull();
    assertThat(snapshot.getWarAttacksUsed()).isNull();
    assertThat(snapshot.getLastSeen()).isNull();
    assertThat(snapshot.getData()).isNull();
  }
}
