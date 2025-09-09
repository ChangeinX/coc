package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class ClanSnapshotTest {

  @Test
  void testClanSnapshotMapping() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data =
        mapper.readTree("{\"warWinStreak\": 15, \"location\": {\"name\": \"United States\"}}");

    ClanSnapshot snapshot = new ClanSnapshot();
    snapshot.setClanTag("#ABC123");
    snapshot.setName("Test Clan");
    snapshot.setMemberCount(45);
    snapshot.setLevel(20);
    snapshot.setWarWins(150);
    snapshot.setWarLosses(25);
    snapshot.setData(data);
    snapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    // Then - basic getters should work
    assertThat(snapshot.getClanTag()).isEqualTo("#ABC123");
    assertThat(snapshot.getName()).isEqualTo("Test Clan");
    assertThat(snapshot.getMemberCount()).isEqualTo(45);
    assertThat(snapshot.getLevel()).isEqualTo(20);
    assertThat(snapshot.getWarWins()).isEqualTo(150);
    assertThat(snapshot.getWarLosses()).isEqualTo(25);
    assertThat(snapshot.getData()).isNotNull();
    assertThat(snapshot.getData().get("warWinStreak").asInt()).isEqualTo(15);
    assertThat(snapshot.getTs()).isEqualTo(LocalDateTime.of(2025, 1, 1, 12, 0, 0));
  }

  @Test
  void testClanSnapshotWithNullData() {
    // Given
    ClanSnapshot snapshot = new ClanSnapshot();
    snapshot.setClanTag("#DEF456");
    snapshot.setName("Null Data Clan");
    snapshot.setMemberCount(30);
    snapshot.setLevel(10);
    snapshot.setWarWins(50);
    snapshot.setWarLosses(10);
    snapshot.setData(null);

    // Then
    assertThat(snapshot.getData()).isNull();
    assertThat(snapshot.getClanTag()).isEqualTo("#DEF456");
  }
}
