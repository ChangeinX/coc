package com.clanboards.clashdata.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.clanboards.clashdata.entity.ClanSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class ClanSnapshotRepositoryTest {

  @Autowired private TestEntityManager entityManager;

  @Autowired private ClanSnapshotRepository clanSnapshotRepository;

  @Test
  void testFindTopByClanTagOrderByTsDesc() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data1 = mapper.readTree("{\"warWinStreak\": 10}");
    JsonNode data2 = mapper.readTree("{\"warWinStreak\": 15}");

    ClanSnapshot oldSnapshot = new ClanSnapshot();
    oldSnapshot.setClanTag("#ABC123");
    oldSnapshot.setName("Test Clan");
    oldSnapshot.setMemberCount(45);
    oldSnapshot.setLevel(20);
    oldSnapshot.setWarWins(140);
    oldSnapshot.setWarLosses(25);
    oldSnapshot.setData(data1);
    oldSnapshot.setTs(LocalDateTime.of(2025, 1, 1, 10, 0, 0));

    ClanSnapshot newSnapshot = new ClanSnapshot();
    newSnapshot.setClanTag("#ABC123");
    newSnapshot.setName("Test Clan");
    newSnapshot.setMemberCount(46);
    newSnapshot.setLevel(20);
    newSnapshot.setWarWins(150);
    newSnapshot.setWarLosses(25);
    newSnapshot.setData(data2);
    newSnapshot.setTs(LocalDateTime.of(2025, 1, 1, 12, 0, 0));

    entityManager.persistAndFlush(oldSnapshot);
    entityManager.persistAndFlush(newSnapshot);

    // When
    ClanSnapshot result = clanSnapshotRepository.findTopByClanTagOrderByTsDesc("#ABC123");

    // Then
    assertThat(result).isNotNull();
    assertThat(result.getClanTag()).isEqualTo("#ABC123");
    assertThat(result.getMemberCount()).isEqualTo(46);
    assertThat(result.getWarWins()).isEqualTo(150);
    assertThat(result.getTs()).isEqualTo(LocalDateTime.of(2025, 1, 1, 12, 0, 0));
    assertThat(result.getData().get("warWinStreak").asInt()).isEqualTo(15);
  }

  @Test
  void testFindTopByClanTagOrderByTsDesc_NotFound() {
    // When
    ClanSnapshot result = clanSnapshotRepository.findTopByClanTagOrderByTsDesc("#NOTFOUND");

    // Then
    assertThat(result).isNull();
  }
}
