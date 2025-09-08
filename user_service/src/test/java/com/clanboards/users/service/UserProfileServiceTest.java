package com.clanboards.users.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clanboards.users.exception.InvalidRequestException;
import com.clanboards.users.model.FeatureFlag;
import com.clanboards.users.model.User;
import com.clanboards.users.model.UserProfile;
import com.clanboards.users.repository.FeatureFlagRepository;
import com.clanboards.users.repository.UserProfileRepository;
import com.clanboards.users.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class UserProfileServiceTest {

  @Test
  void getUserProfileReturnsExistingProfile() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfile profile = new UserProfile();
    profile.setId(1L);
    profile.setUserId(123L);
    profile.setRiskWeightWar(0.45);
    profile.setIsLeader(true);
    when(profileRepo.findByUserId(123L)).thenReturn(Optional.of(profile));

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    UserProfile result = service.getUserProfile(123L);

    assertEquals(1L, result.getId());
    assertEquals(0.45, result.getRiskWeightWar());
    assertTrue(result.getIsLeader());
  }

  @Test
  void getUserProfileCreatesNewProfileWhenNotExists() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    when(profileRepo.findByUserId(123L)).thenReturn(Optional.empty());
    UserProfile savedProfile = new UserProfile();
    savedProfile.setId(2L);
    savedProfile.setUserId(123L);
    when(profileRepo.save(any(UserProfile.class))).thenReturn(savedProfile);

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    UserProfile result = service.getUserProfile(123L);

    assertEquals(2L, result.getId());
    assertEquals(123L, result.getUserId());

    ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
    verify(profileRepo).save(captor.capture());
    assertEquals(123L, captor.getValue().getUserId());
    assertEquals(0.40, captor.getValue().getRiskWeightWar()); // Default value
  }

  @Test
  void updateProfileUpdatesAllRiskWeights() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfile existingProfile = new UserProfile();
    existingProfile.setUserId(123L);
    existingProfile.setRiskWeightWar(0.40);
    existingProfile.setRiskWeightIdle(0.35);

    when(profileRepo.findByUserId(123L)).thenReturn(Optional.of(existingProfile));
    when(profileRepo.save(any(UserProfile.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    UserProfileService.ProfileUpdateRequest request = new UserProfileService.ProfileUpdateRequest();
    request.setRiskWeightWar(0.50);
    request.setRiskWeightIdle(0.30);
    request.setRiskWeightDonDeficit(0.15);
    request.setRiskWeightDonDrop(0.05);
    request.setIsLeader(true);

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    service.updateProfile(123L, request);

    ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
    verify(profileRepo).save(captor.capture());
    UserProfile saved = captor.getValue();

    assertEquals(0.50, saved.getRiskWeightWar());
    assertEquals(0.30, saved.getRiskWeightIdle());
    assertEquals(0.15, saved.getRiskWeightDonDeficit());
    assertEquals(0.05, saved.getRiskWeightDonDrop());
    assertTrue(saved.getIsLeader());
  }

  @Test
  void getFeatureFlagsReturnsAllWhenAllFeaturesEnabled() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfile profile = new UserProfile();
    profile.setUserId(123L);
    profile.setAllFeatures(true);
    when(profileRepo.findByUserId(123L)).thenReturn(Optional.of(profile));

    FeatureFlag flag1 = new FeatureFlag();
    flag1.setName("feature1");
    FeatureFlag flag2 = new FeatureFlag();
    flag2.setName("feature2");
    when(featureRepo.findAll()).thenReturn(List.of(flag1, flag2));

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    UserProfileService.FeatureFlagsResponse result = service.getFeatureFlags(123L);

    assertTrue(result.isAll());
    assertEquals(2, result.getFeatures().size());
    assertTrue(result.getFeatures().contains("feature1"));
    assertTrue(result.getFeatures().contains("feature2"));
  }

  @Test
  void updateFeatureFlagsSetsAllFeatures() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfile profile = new UserProfile();
    profile.setUserId(123L);
    when(profileRepo.findByUserId(123L)).thenReturn(Optional.of(profile));

    FeatureFlag flag1 = new FeatureFlag();
    flag1.setName("feature1");
    FeatureFlag flag2 = new FeatureFlag();
    flag2.setName("feature2");
    when(featureRepo.findAll()).thenReturn(List.of(flag1, flag2));

    UserProfileService.FeatureUpdateRequest request = new UserProfileService.FeatureUpdateRequest();
    request.setAll(true);

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    service.updateFeatureFlags(123L, request);

    ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
    verify(profileRepo).save(captor.capture());
    UserProfile saved = captor.getValue();

    assertTrue(saved.getAllFeatures());
    assertEquals(2, saved.getFeatures().size());
  }

  @Test
  void updateFeatureFlagsSetsSpecificFeatures() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfile profile = new UserProfile();
    profile.setUserId(123L);
    when(profileRepo.findByUserId(123L)).thenReturn(Optional.of(profile));

    FeatureFlag flag1 = new FeatureFlag();
    flag1.setName("feature1");
    when(featureRepo.findByNameIn(List.of("feature1"))).thenReturn(List.of(flag1));

    UserProfileService.FeatureUpdateRequest request = new UserProfileService.FeatureUpdateRequest();
    request.setAll(false);
    request.setFeatures(List.of("feature1"));

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    service.updateFeatureFlags(123L, request);

    ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
    verify(profileRepo).save(captor.capture());
    UserProfile saved = captor.getValue();

    assertFalse(saved.getAllFeatures());
    assertEquals(1, saved.getFeatures().size());
    assertEquals("feature1", saved.getFeatures().iterator().next().getName());
  }

  @Test
  void setPlayerTagUpdatesUnverifiedUser() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    User user = new User();
    user.setId(123L);
    user.setIsVerified(false);
    when(userRepo.findById(123L)).thenReturn(Optional.of(user));

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);
    String result = service.setPlayerTag(123L, "#ABC123");

    assertEquals("ABC123", result);
    assertEquals("ABC123", user.getPlayerTag());
    verify(userRepo).save(user);
  }

  @Test
  void setPlayerTagThrowsWhenUserVerified() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    User user = new User();
    user.setId(123L);
    user.setIsVerified(true);
    when(userRepo.findById(123L)).thenReturn(Optional.of(user));

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);

    assertThrows(
        InvalidRequestException.class,
        () -> {
          service.setPlayerTag(123L, "#ABC123");
        });
  }

  @Test
  void setPlayerTagThrowsWhenTagEmpty() {
    UserProfileRepository profileRepo = mock(UserProfileRepository.class);
    UserRepository userRepo = mock(UserRepository.class);
    FeatureFlagRepository featureRepo = mock(FeatureFlagRepository.class);

    UserProfileService service = new UserProfileService(profileRepo, userRepo, featureRepo);

    assertThrows(
        InvalidRequestException.class,
        () -> {
          service.setPlayerTag(123L, "");
        });
  }
}
