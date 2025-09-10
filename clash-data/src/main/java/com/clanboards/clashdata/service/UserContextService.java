package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.UserProfile;
import com.clanboards.clashdata.repository.UserProfileRepository;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class UserContextService {

  private static final Logger logger = LoggerFactory.getLogger(UserContextService.class);

  private final UserProfileRepository userProfileRepository;

  @Autowired
  public UserContextService(UserProfileRepository userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Get the current user's risk weights from their profile.
   *
   * @return a map of risk weights or null if no user is authenticated or no profile exists
   */
  public Map<String, Double> getUserWeights() {
    Long userId = getCurrentUserId();
    if (userId == null) {
      logger.debug("No authenticated user found");
      return null;
    }

    Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId);
    if (profileOpt.isEmpty()) {
      logger.debug("No profile found for user ID: {}", userId);
      return null;
    }

    UserProfile profile = profileOpt.get();
    Map<String, Double> weights = new HashMap<>();
    weights.put("war", profile.getRiskWeightWar());
    weights.put("idle", profile.getRiskWeightIdle());
    weights.put("don_deficit", profile.getRiskWeightDonDeficit());
    weights.put("don_drop", profile.getRiskWeightDonDrop());

    logger.debug("Retrieved custom weights for user {}: {}", userId, weights);
    return weights;
  }

  /**
   * Get the current authenticated user's ID from the JWT token.
   *
   * @return the user ID or null if no user is authenticated
   */
  public Long getCurrentUserId() {
    try {
      Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
      if (authentication == null || !(authentication instanceof JwtAuthenticationToken)) {
        logger.debug("No JWT authentication found");
        return null;
      }

      JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
      String userSub = jwtAuth.getToken().getClaimAsString("sub");

      if (userSub == null) {
        logger.warn("JWT token missing 'sub' claim");
        return null;
      }

      try {
        return Long.parseLong(userSub);
      } catch (NumberFormatException e) {
        logger.warn("Invalid user ID format in JWT sub claim: {}", userSub);
        return null;
      }
    } catch (Exception e) {
      logger.debug("Error getting user ID from security context: {}", e.getMessage());
      return null;
    }
  }
}
