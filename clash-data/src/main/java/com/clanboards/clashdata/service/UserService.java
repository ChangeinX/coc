package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.User;
import com.clanboards.clashdata.repository.UserRepository;
import com.clanboards.clashdata.util.TagUtils;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private static final Logger logger = LoggerFactory.getLogger(UserService.class);

  private final UserRepository userRepository;
  private final CocClientService cocClientService;

  @Autowired
  public UserService(UserRepository userRepository, CocClientService cocClientService) {
    this.userRepository = userRepository;
    this.cocClientService = cocClientService;
  }

  /**
   * Verify a player's API token and update their verification status.
   *
   * @param token the player's API token to verify
   * @return the normalized player tag if verification succeeds
   * @throws IllegalArgumentException if token is missing, user has no player tag, or is already
   *     verified
   * @throws RuntimeException if token verification fails
   */
  public String verifyPlayerToken(String token) {
    if (token == null || token.trim().isEmpty()) {
      throw new IllegalArgumentException("Token is required");
    }

    User currentUser = getCurrentUser();
    if (currentUser == null) {
      throw new RuntimeException("User not found");
    }

    if (currentUser.getPlayerTag() == null || currentUser.getPlayerTag().trim().isEmpty()) {
      throw new IllegalArgumentException("User must have a player tag set");
    }

    if (Boolean.TRUE.equals(currentUser.getIsVerified())) {
      throw new IllegalArgumentException("User is already verified");
    }

    String playerTag = currentUser.getPlayerTag();
    logger.info("Verifying token for user {} with player tag {}", currentUser.getId(), playerTag);

    boolean isValid = cocClientService.verifyPlayerToken(playerTag, token.trim());
    if (!isValid) {
      logger.warn(
          "Token verification failed for user {} with tag {}", currentUser.getId(), playerTag);
      throw new RuntimeException("Token verification failed");
    }

    // Normalize the player tag and update verification status
    String normalizedTag = TagUtils.normalizeTag(playerTag);
    currentUser.setPlayerTag(normalizedTag);
    currentUser.setIsVerified(true);
    userRepository.save(currentUser);

    logger.info("Successfully verified user {} with tag {}", currentUser.getId(), normalizedTag);
    return normalizedTag;
  }

  /**
   * Get the current authenticated user from the security context.
   *
   * @return the current user or null if not found
   */
  private User getCurrentUser() {
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

      Optional<User> userOpt = userRepository.findBySub(userSub);
      if (userOpt.isEmpty()) {
        logger.warn("User not found for sub: {}", userSub);
        return null;
      }

      return userOpt.get();
    } catch (Exception e) {
      logger.error("Error getting current user: {}", e.getMessage());
      return null;
    }
  }
}
