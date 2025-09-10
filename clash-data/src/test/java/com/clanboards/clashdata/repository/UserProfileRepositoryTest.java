package com.clanboards.clashdata.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.clanboards.clashdata.entity.UserProfile;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class UserProfileRepositoryTest {

  @Autowired private TestEntityManager entityManager;

  @Autowired private UserProfileRepository repository;

  @Test
  void testFindByUserId_Success() {
    // Given
    UserProfile profile = new UserProfile();
    profile.setUserId(123L);
    profile.setRiskWeightWar(0.45);
    profile.setRiskWeightIdle(0.30);
    profile.setRiskWeightDonDeficit(0.15);
    profile.setRiskWeightDonDrop(0.10);
    profile.setIsLeader(true);
    entityManager.persistAndFlush(profile);

    // When
    Optional<UserProfile> result = repository.findByUserId(123L);

    // Then
    assertThat(result).isPresent();
    UserProfile found = result.get();
    assertThat(found.getUserId()).isEqualTo(123L);
    assertThat(found.getRiskWeightWar()).isEqualTo(0.45);
    assertThat(found.getRiskWeightIdle()).isEqualTo(0.30);
    assertThat(found.getRiskWeightDonDeficit()).isEqualTo(0.15);
    assertThat(found.getRiskWeightDonDrop()).isEqualTo(0.10);
    assertThat(found.getIsLeader()).isTrue();
  }

  @Test
  void testFindByUserId_NotFound() {
    // When
    Optional<UserProfile> result = repository.findByUserId(999L);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  void testSaveUserProfile() {
    // Given
    UserProfile profile = new UserProfile();
    profile.setUserId(456L);
    profile.setRiskWeightWar(0.50);
    profile.setIsLeader(false);
    profile.setAllFeatures(true);

    // When
    UserProfile saved = repository.save(profile);

    // Then
    assertThat(saved.getId()).isNotNull();
    assertThat(saved.getUserId()).isEqualTo(456L);
    assertThat(saved.getRiskWeightWar()).isEqualTo(0.50);
    assertThat(saved.getIsLeader()).isFalse();
    assertThat(saved.getAllFeatures()).isTrue();

    // Verify it's persisted
    Optional<UserProfile> found = repository.findByUserId(456L);
    assertThat(found).isPresent();
    assertThat(found.get().getId()).isEqualTo(saved.getId());
  }

  @Test
  void testDefaultValues() {
    // Given
    UserProfile profile = new UserProfile();
    profile.setUserId(789L);

    // When
    UserProfile saved = repository.save(profile);

    // Then - verify default values are applied
    assertThat(saved.getRiskWeightWar()).isEqualTo(0.40);
    assertThat(saved.getRiskWeightIdle()).isEqualTo(0.35);
    assertThat(saved.getRiskWeightDonDeficit()).isEqualTo(0.15);
    assertThat(saved.getRiskWeightDonDrop()).isEqualTo(0.10);
    assertThat(saved.getIsLeader()).isFalse();
    assertThat(saved.getAllFeatures()).isFalse();
  }

  @Test
  void testUniqueUserIdConstraint() {
    // Given - first profile
    UserProfile profile1 = new UserProfile();
    profile1.setUserId(100L);
    repository.save(profile1);

    // When - try to save another profile with same userId
    UserProfile profile2 = new UserProfile();
    profile2.setUserId(100L);

    // Then - should throw exception due to unique constraint
    try {
      repository.saveAndFlush(profile2);
      assertThat(false).as("Expected unique constraint violation").isTrue();
    } catch (Exception e) {
      assertThat(e).hasMessageContaining("user_id");
    }
  }
}
