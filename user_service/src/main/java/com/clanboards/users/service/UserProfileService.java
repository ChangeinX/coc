package com.clanboards.users.service;

import com.clanboards.users.exception.InvalidRequestException;
import com.clanboards.users.model.FeatureFlag;
import com.clanboards.users.model.User;
import com.clanboards.users.model.UserProfile;
import com.clanboards.users.repository.FeatureFlagRepository;
import com.clanboards.users.repository.UserProfileRepository;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.util.TagUtils;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserProfileService {

  private final UserProfileRepository userProfileRepository;
  private final UserRepository userRepository;
  private final FeatureFlagRepository featureFlagRepository;

  public UserProfileService(
      UserProfileRepository userProfileRepository,
      UserRepository userRepository,
      FeatureFlagRepository featureFlagRepository) {
    this.userProfileRepository = userProfileRepository;
    this.userRepository = userRepository;
    this.featureFlagRepository = featureFlagRepository;
  }

  public UserProfile getUserProfile(Long userId) {
    return userProfileRepository
        .findByUserId(userId)
        .orElseGet(
            () -> {
              UserProfile profile = new UserProfile();
              profile.setUserId(userId);
              return userProfileRepository.save(profile);
            });
  }

  public void updateProfile(Long userId, ProfileUpdateRequest request) {
    UserProfile profile = getUserProfile(userId);

    if (request.getRiskWeightWar() != null) {
      profile.setRiskWeightWar(request.getRiskWeightWar());
    }
    if (request.getRiskWeightIdle() != null) {
      profile.setRiskWeightIdle(request.getRiskWeightIdle());
    }
    if (request.getRiskWeightDonDeficit() != null) {
      profile.setRiskWeightDonDeficit(request.getRiskWeightDonDeficit());
    }
    if (request.getRiskWeightDonDrop() != null) {
      profile.setRiskWeightDonDrop(request.getRiskWeightDonDrop());
    }
    if (request.getIsLeader() != null) {
      profile.setIsLeader(request.getIsLeader());
    }

    userProfileRepository.save(profile);
  }

  public FeatureFlagsResponse getFeatureFlags(Long userId) {
    UserProfile profile = getUserProfile(userId);

    List<String> featureNames;
    if (profile.getAllFeatures()) {
      featureNames =
          featureFlagRepository.findAll().stream()
              .map(FeatureFlag::getName)
              .collect(Collectors.toList());
    } else {
      featureNames =
          profile.getFeatures() != null
              ? profile.getFeatures().stream()
                  .map(FeatureFlag::getName)
                  .collect(Collectors.toList())
              : List.of();
    }

    return new FeatureFlagsResponse(profile.getAllFeatures(), featureNames);
  }

  public void updateFeatureFlags(Long userId, FeatureUpdateRequest request) {
    UserProfile profile = getUserProfile(userId);

    profile.setAllFeatures(request.isAll());

    if (request.isAll()) {
      profile.setFeatures(new HashSet<>(featureFlagRepository.findAll()));
    } else {
      List<String> featureNames = request.getFeatures() != null ? request.getFeatures() : List.of();
      profile.setFeatures(new HashSet<>(featureFlagRepository.findByNameIn(featureNames)));
    }

    userProfileRepository.save(profile);
  }

  public String setPlayerTag(Long userId, String playerTag) {
    if (playerTag == null || playerTag.trim().isEmpty()) {
      throw new InvalidRequestException("Player tag cannot be empty");
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new InvalidRequestException("User not found"));

    if (user.getIsVerified()) {
      throw new InvalidRequestException("Cannot change player tag for verified user");
    }

    String normalizedTag = TagUtils.normalizeTag(playerTag);
    user.setPlayerTag(normalizedTag);
    userRepository.save(user);

    return normalizedTag;
  }

  public static class ProfileUpdateRequest {
    private Double riskWeightWar;
    private Double riskWeightIdle;
    private Double riskWeightDonDeficit;
    private Double riskWeightDonDrop;
    private Boolean isLeader;

    public Double getRiskWeightWar() {
      return riskWeightWar;
    }

    public void setRiskWeightWar(Double riskWeightWar) {
      this.riskWeightWar = riskWeightWar;
    }

    public Double getRiskWeightIdle() {
      return riskWeightIdle;
    }

    public void setRiskWeightIdle(Double riskWeightIdle) {
      this.riskWeightIdle = riskWeightIdle;
    }

    public Double getRiskWeightDonDeficit() {
      return riskWeightDonDeficit;
    }

    public void setRiskWeightDonDeficit(Double riskWeightDonDeficit) {
      this.riskWeightDonDeficit = riskWeightDonDeficit;
    }

    public Double getRiskWeightDonDrop() {
      return riskWeightDonDrop;
    }

    public void setRiskWeightDonDrop(Double riskWeightDonDrop) {
      this.riskWeightDonDrop = riskWeightDonDrop;
    }

    public Boolean getIsLeader() {
      return isLeader;
    }

    public void setIsLeader(Boolean isLeader) {
      this.isLeader = isLeader;
    }
  }

  public static class FeatureUpdateRequest {
    private boolean all;
    private List<String> features;

    public boolean isAll() {
      return all;
    }

    public void setAll(boolean all) {
      this.all = all;
    }

    public List<String> getFeatures() {
      return features;
    }

    public void setFeatures(List<String> features) {
      this.features = features;
    }
  }

  public static class FeatureFlagsResponse {
    private final boolean all;
    private final List<String> features;

    public FeatureFlagsResponse(boolean all, List<String> features) {
      this.all = all;
      this.features = features;
    }

    public boolean isAll() {
      return all;
    }

    public List<String> getFeatures() {
      return features;
    }
  }
}
