package com.clanboards.clashdata.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.clanboards.clashdata.entity.LoyaltyMembership;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class LoyaltyMembershipRepositoryTest {

  @Autowired private TestEntityManager entityManager;

  @Autowired private LoyaltyMembershipRepository loyaltyMembershipRepository;

  @Test
  void testFindActivePlayerTagsByClanTag() {
    // Given
    LoyaltyMembership activeMember1 = new LoyaltyMembership();
    activeMember1.setPlayerTag("#PLAYER1");
    activeMember1.setClanTag("#CLAN123");
    activeMember1.setJoinedAt(LocalDateTime.of(2024, 6, 1, 10, 0, 0));
    activeMember1.setLeftAt(null); // still active

    LoyaltyMembership activeMember2 = new LoyaltyMembership();
    activeMember2.setPlayerTag("#PLAYER2");
    activeMember2.setClanTag("#CLAN123");
    activeMember2.setJoinedAt(LocalDateTime.of(2024, 7, 1, 10, 0, 0));
    activeMember2.setLeftAt(null); // still active

    LoyaltyMembership inactiveMember = new LoyaltyMembership();
    inactiveMember.setPlayerTag("#PLAYER3");
    inactiveMember.setClanTag("#CLAN123");
    inactiveMember.setJoinedAt(LocalDateTime.of(2024, 5, 1, 10, 0, 0));
    inactiveMember.setLeftAt(LocalDateTime.of(2024, 8, 1, 10, 0, 0)); // left the clan

    LoyaltyMembership differentClan = new LoyaltyMembership();
    differentClan.setPlayerTag("#PLAYER4");
    differentClan.setClanTag("#CLAN456");
    differentClan.setJoinedAt(LocalDateTime.of(2024, 6, 1, 10, 0, 0));
    differentClan.setLeftAt(null); // active but different clan

    entityManager.persistAndFlush(activeMember1);
    entityManager.persistAndFlush(activeMember2);
    entityManager.persistAndFlush(inactiveMember);
    entityManager.persistAndFlush(differentClan);

    // When
    List<String> activePlayerTags =
        loyaltyMembershipRepository.findActivePlayerTagsByClanTag("#CLAN123");

    // Then
    assertThat(activePlayerTags).hasSize(2);
    assertThat(activePlayerTags).containsExactlyInAnyOrder("#PLAYER1", "#PLAYER2");
  }

  @Test
  void testFindActivePlayerTagsByClanTag_NoActiveMembers() {
    // Given
    LoyaltyMembership inactiveMember = new LoyaltyMembership();
    inactiveMember.setPlayerTag("#PLAYER1");
    inactiveMember.setClanTag("#CLAN123");
    inactiveMember.setJoinedAt(LocalDateTime.of(2024, 5, 1, 10, 0, 0));
    inactiveMember.setLeftAt(LocalDateTime.of(2024, 8, 1, 10, 0, 0));

    entityManager.persistAndFlush(inactiveMember);

    // When
    List<String> activePlayerTags =
        loyaltyMembershipRepository.findActivePlayerTagsByClanTag("#CLAN123");

    // Then
    assertThat(activePlayerTags).isEmpty();
  }
}
