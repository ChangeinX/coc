package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class ClanTest {

  @Test
  void testClanMapping() throws Exception {
    // Given
    ObjectMapper mapper = new ObjectMapper();
    JsonNode data =
        mapper.readTree(
            "{\"description\": \"A great clan\", \"badgeUrls\": {\"large\": \"https://example.com/badge.png\"}}");

    Clan clan = new Clan();
    clan.setTag("#ABC123");
    clan.setDeepLink("https://link.clashofclans.com/clan?tag=#ABC123");
    clan.setData(data);

    // Then
    assertThat(clan.getTag()).isEqualTo("#ABC123");
    assertThat(clan.getDeepLink()).isEqualTo("https://link.clashofclans.com/clan?tag=#ABC123");
    assertThat(clan.getData()).isNotNull();
    assertThat(clan.getData().get("description").asText()).isEqualTo("A great clan");
    assertThat(clan.getData().get("badgeUrls").get("large").asText())
        .isEqualTo("https://example.com/badge.png");
  }

  @Test
  void testClanWithNullValues() {
    // Given
    Clan clan = new Clan();
    clan.setTag("#DEF456");
    clan.setDeepLink(null);
    clan.setData(null);

    // Then
    assertThat(clan.getTag()).isEqualTo("#DEF456");
    assertThat(clan.getDeepLink()).isNull();
    assertThat(clan.getData()).isNull();
  }
}
