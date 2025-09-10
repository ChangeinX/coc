package com.clanboards.clashdata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserProfileTest {

  @Test
  void testUserProfileCreation() {
    // Given
    Long id = 1L;
    Long userId = 123L;
    Double riskWeightWar = 0.45;
    Double riskWeightIdle = 0.30;
    Double riskWeightDonDeficit = 0.15;
    Double riskWeightDonDrop = 0.10;
    Boolean isLeader = true;
    Boolean allFeatures = false;

    // When
    UserProfile profile = new UserProfile();
    profile.setId(id);
    profile.setUserId(userId);
    profile.setRiskWeightWar(riskWeightWar);
    profile.setRiskWeightIdle(riskWeightIdle);
    profile.setRiskWeightDonDeficit(riskWeightDonDeficit);
    profile.setRiskWeightDonDrop(riskWeightDonDrop);
    profile.setIsLeader(isLeader);
    profile.setAllFeatures(allFeatures);

    // Then
    assertThat(profile.getId()).isEqualTo(id);
    assertThat(profile.getUserId()).isEqualTo(userId);
    assertThat(profile.getRiskWeightWar()).isEqualTo(riskWeightWar);
    assertThat(profile.getRiskWeightIdle()).isEqualTo(riskWeightIdle);
    assertThat(profile.getRiskWeightDonDeficit()).isEqualTo(riskWeightDonDeficit);
    assertThat(profile.getRiskWeightDonDrop()).isEqualTo(riskWeightDonDrop);
    assertThat(profile.getIsLeader()).isEqualTo(isLeader);
    assertThat(profile.getAllFeatures()).isEqualTo(allFeatures);
  }

  @Test
  void testUserProfileDefaultValues() {
    // When
    UserProfile profile = new UserProfile();

    // Then - default values should match Python model defaults
    assertThat(profile.getRiskWeightWar()).isEqualTo(0.40);
    assertThat(profile.getRiskWeightIdle()).isEqualTo(0.35);
    assertThat(profile.getRiskWeightDonDeficit()).isEqualTo(0.15);
    assertThat(profile.getRiskWeightDonDrop()).isEqualTo(0.10);
    assertThat(profile.getIsLeader()).isFalse();
    assertThat(profile.getAllFeatures()).isFalse();
  }

  @Test
  void testUserProfileEqualsAndHashCode() {
    // Given
    UserProfile profile1 = new UserProfile();
    profile1.setId(1L);
    profile1.setUserId(123L);

    UserProfile profile2 = new UserProfile();
    profile2.setId(1L);
    profile2.setUserId(123L);

    UserProfile profile3 = new UserProfile();
    profile3.setId(2L);
    profile3.setUserId(456L);

    // Then
    assertThat(profile1).isEqualTo(profile2);
    assertThat(profile1).isNotEqualTo(profile3);
    assertThat(profile1.hashCode()).isEqualTo(profile2.hashCode());
    assertThat(profile1.hashCode()).isNotEqualTo(profile3.hashCode());
  }

  @Test
  void testToString() {
    // Given
    UserProfile profile = new UserProfile();
    profile.setId(1L);
    profile.setUserId(123L);
    profile.setRiskWeightWar(0.40);

    // When
    String result = profile.toString();

    // Then
    assertThat(result).contains("UserProfile");
    assertThat(result).contains("id=1");
    assertThat(result).contains("userId=123");
    assertThat(result).contains("riskWeightWar=0.4");
  }
}
