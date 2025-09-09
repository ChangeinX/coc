package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class PlayerTest {

  @Test
  void testPlayerMapping() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data =
        mapper.readTree(
            "{\"league\": {\"name\": \"Champion League\"}, \"labels\": [{\"name\": \"Veteran\", \"id\": 123}]}");

    Player player = new Player();
    player.setTag("#PLAYER123");
    player.setName("TestPlayer");
    player.setTownHall(14);
    player.setRole("member");
    player.setClanTag("#CLAN123");
    player.setDeepLink("https://link.clashofclans.com/player?tag=#PLAYER123");
    player.setData(data);

    // Then
    assertThat(player.getTag()).isEqualTo("#PLAYER123");
    assertThat(player.getName()).isEqualTo("TestPlayer");
    assertThat(player.getTownHall()).isEqualTo(14);
    assertThat(player.getRole()).isEqualTo("member");
    assertThat(player.getClanTag()).isEqualTo("#CLAN123");
    assertThat(player.getDeepLink())
        .isEqualTo("https://link.clashofclans.com/player?tag=#PLAYER123");
    assertThat(player.getData()).isNotNull();
    assertThat(player.getData().get("league").get("name").asText()).isEqualTo("Champion League");
    assertThat(player.getData().get("labels").isArray()).isTrue();
  }

  @Test
  void testPlayerWithNullValues() {
    // Given
    Player player = new Player();
    player.setTag("#PLAYER456");
    player.setName("NullDataPlayer");
    player.setTownHall(null);
    player.setRole(null);
    player.setClanTag(null);
    player.setDeepLink(null);
    player.setData(null);

    // Then
    assertThat(player.getTag()).isEqualTo("#PLAYER456");
    assertThat(player.getName()).isEqualTo("NullDataPlayer");
    assertThat(player.getTownHall()).isNull();
    assertThat(player.getRole()).isNull();
    assertThat(player.getClanTag()).isNull();
    assertThat(player.getDeepLink()).isNull();
    assertThat(player.getData()).isNull();
  }
}
