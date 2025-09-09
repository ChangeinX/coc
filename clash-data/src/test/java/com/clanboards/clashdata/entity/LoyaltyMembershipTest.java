package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class LoyaltyMembershipTest {

  @Test
  void testLoyaltyMembershipMapping() {
    // Given
    LoyaltyMembership membership = new LoyaltyMembership();
    membership.setPlayerTag("#PLAYER123");
    membership.setClanTag("#CLAN123");
    membership.setJoinedAt(LocalDateTime.of(2024, 6, 1, 10, 0, 0));
    membership.setLeftAt(LocalDateTime.of(2024, 12, 1, 15, 30, 0));

    // Then
    assertThat(membership.getPlayerTag()).isEqualTo("#PLAYER123");
    assertThat(membership.getClanTag()).isEqualTo("#CLAN123");
    assertThat(membership.getJoinedAt()).isEqualTo(LocalDateTime.of(2024, 6, 1, 10, 0, 0));
    assertThat(membership.getLeftAt()).isEqualTo(LocalDateTime.of(2024, 12, 1, 15, 30, 0));
  }

  @Test
  void testActiveMembership() {
    // Given - active membership (no left_at date)
    LoyaltyMembership membership = new LoyaltyMembership();
    membership.setPlayerTag("#PLAYER456");
    membership.setClanTag("#CLAN456");
    membership.setJoinedAt(LocalDateTime.of(2024, 12, 1, 8, 0, 0));
    membership.setLeftAt(null);

    // Then
    assertThat(membership.getPlayerTag()).isEqualTo("#PLAYER456");
    assertThat(membership.getClanTag()).isEqualTo("#CLAN456");
    assertThat(membership.getJoinedAt()).isEqualTo(LocalDateTime.of(2024, 12, 1, 8, 0, 0));
    assertThat(membership.getLeftAt()).isNull();
    assertThat(membership.isActive()).isTrue();
  }

  @Test
  void testInactiveMembership() {
    // Given - inactive membership (has left_at date)
    LoyaltyMembership membership = new LoyaltyMembership();
    membership.setPlayerTag("#PLAYER789");
    membership.setClanTag("#CLAN789");
    membership.setJoinedAt(LocalDateTime.of(2024, 1, 1, 8, 0, 0));
    membership.setLeftAt(LocalDateTime.of(2024, 6, 1, 8, 0, 0));

    // Then
    assertThat(membership.isActive()).isFalse();
  }
}
