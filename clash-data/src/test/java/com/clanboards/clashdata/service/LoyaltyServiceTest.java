package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.clashdata.entity.LoyaltyMembership;
import com.clanboards.clashdata.repository.LoyaltyMembershipRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceTest {

  @Mock private LoyaltyMembershipRepository loyaltyMembershipRepository;
  @Mock private Clock clock;

  @InjectMocks private LoyaltyService loyaltyService;

  private String clanTag;
  private LocalDateTime now;

  @BeforeEach
  void setUp() {
    clanTag = "ABC123"; // Normalized clan tag (no # prefix)
    now = LocalDateTime.of(2025, 1, 15, 12, 0, 0);

    // Mock the clock to return our test time
    ZonedDateTime fixedInstant = now.atZone(ZoneId.systemDefault());
    when(clock.instant()).thenReturn(fixedInstant.toInstant());
    when(clock.getZone()).thenReturn(ZoneId.systemDefault());
  }

  @Test
  void testGetClanLoyalty_WithActiveMembers() {
    // Given
    LoyaltyMembership member1 =
        createLoyaltyMembership("#PLAYER1", clanTag, now.minusDays(30), null);
    LoyaltyMembership member2 =
        createLoyaltyMembership("#PLAYER2", clanTag, now.minusDays(10), null);
    LoyaltyMembership member3 =
        createLoyaltyMembership("#PLAYER3", clanTag, now.minusDays(100), null);

    List<LoyaltyMembership> activeMemberships = Arrays.asList(member1, member2, member3);
    when(loyaltyMembershipRepository.findByClanTagAndLeftAtIsNull(clanTag))
        .thenReturn(activeMemberships);

    // When
    Map<String, Integer> result = loyaltyService.getClanLoyalty(clanTag);

    // Then
    assertNotNull(result);
    assertEquals(3, result.size());
    assertEquals(30, result.get("#PLAYER1"));
    assertEquals(10, result.get("#PLAYER2"));
    assertEquals(100, result.get("#PLAYER3"));

    verify(loyaltyMembershipRepository).findByClanTagAndLeftAtIsNull(clanTag);
  }

  @Test
  void testGetClanLoyalty_EmptyClan() {
    // Given
    when(loyaltyMembershipRepository.findByClanTagAndLeftAtIsNull(clanTag))
        .thenReturn(Arrays.asList());

    // When
    Map<String, Integer> result = loyaltyService.getClanLoyalty(clanTag);

    // Then
    assertNotNull(result);
    assertTrue(result.isEmpty());

    verify(loyaltyMembershipRepository).findByClanTagAndLeftAtIsNull(clanTag);
  }

  @Test
  void testGetClanLoyalty_SingleMemberSameDay() {
    // Given
    LoyaltyMembership member = createLoyaltyMembership("#PLAYER1", clanTag, now, null);
    List<LoyaltyMembership> activeMemberships = Arrays.asList(member);
    when(loyaltyMembershipRepository.findByClanTagAndLeftAtIsNull(clanTag))
        .thenReturn(activeMemberships);

    // When
    Map<String, Integer> result = loyaltyService.getClanLoyalty(clanTag);

    // Then
    assertNotNull(result);
    assertEquals(1, result.size());
    assertEquals(0, result.get("#PLAYER1")); // Same day = 0 days

    verify(loyaltyMembershipRepository).findByClanTagAndLeftAtIsNull(clanTag);
  }

  @Test
  void testGetClanLoyalty_TagNormalization() {
    // Given
    String unnormalizedTag = "#abc123";
    String normalizedTag = "ABC123"; // After normalization: strip # and uppercase

    LoyaltyMembership member =
        createLoyaltyMembership("#PLAYER1", normalizedTag, now.minusDays(5), null);
    when(loyaltyMembershipRepository.findByClanTagAndLeftAtIsNull(normalizedTag))
        .thenReturn(Arrays.asList(member));

    // When
    Map<String, Integer> result = loyaltyService.getClanLoyalty(unnormalizedTag);

    // Then
    assertNotNull(result);
    assertEquals(1, result.size());
    assertEquals(5, result.get("#PLAYER1"));

    verify(loyaltyMembershipRepository).findByClanTagAndLeftAtIsNull(normalizedTag);
  }

  private LoyaltyMembership createLoyaltyMembership(
      String playerTag, String clanTag, LocalDateTime joinedAt, LocalDateTime leftAt) {
    LoyaltyMembership membership = new LoyaltyMembership();
    membership.setPlayerTag(playerTag);
    membership.setClanTag(clanTag);
    membership.setJoinedAt(joinedAt);
    membership.setLeftAt(leftAt);
    return membership;
  }
}
