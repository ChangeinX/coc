package com.clanboards.users.controller;

import com.clanboards.users.exception.ResourceNotFoundException;
import com.clanboards.users.exception.UnauthorizedException;
import com.clanboards.users.exception.ValidationException;
import com.clanboards.users.model.User;
import com.clanboards.users.model.UserProfile;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.service.LegalService;
import com.clanboards.users.service.UserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
  private static final Logger logger = LoggerFactory.getLogger(UserController.class);

  private final UserRepository userRepository;
  private final UserProfileService userProfileService;
  private final LegalService legalService;

  public UserController(
      UserRepository userRepository,
      UserProfileService userProfileService,
      LegalService legalService) {
    this.userRepository = userRepository;
    this.userProfileService = userProfileService;
    this.legalService = legalService;
  }

  private Long getUserId(HttpServletRequest request) {
    Object userId = request.getAttribute("userId");
    if (userId == null) {
      throw new UnauthorizedException(
          "Authentication required", "AUTH_REQUIRED", "No valid session found");
    }
    return (Long) userId;
  }

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> getMe(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Retrieving user profile for userId: {}", userId);

    User user = userRepository.findById(userId).orElse(null);

    if (user == null) {
      logger.warn("User profile not found for authenticated userId: {}", userId);
      throw new ResourceNotFoundException(
          "User profile not found", "User", userId.toString(), request);
    }

    return ResponseEntity.ok(
        Map.of(
            "id", user.getId(),
            "sub", user.getSub(),
            "email", user.getEmail() != null ? user.getEmail() : "",
            "name", user.getName() != null ? user.getName() : "",
            "player_tag", user.getPlayerTag() != null ? user.getPlayerTag() : "",
            "verified", user.getIsVerified() != null ? user.getIsVerified() : false));
  }

  @PostMapping("/player-tag")
  public ResponseEntity<Map<String, String>> setPlayerTag(
      HttpServletRequest request, @RequestBody Map<String, String> payload) {
    Long userId = getUserId(request);
    logger.debug("Setting player tag for userId: {}", userId);

    String playerTag = payload.get("player_tag");
    if (playerTag == null || playerTag.trim().isEmpty()) {
      throw new ValidationException(
          "Player tag cannot be empty", "INVALID_PLAYER_TAG", "player_tag");
    }

    // Basic format validation for Clash of Clans player tags
    String trimmedTag = playerTag.trim().toUpperCase();
    if (!trimmedTag.startsWith("#") && !trimmedTag.matches("^[0-9A-Z]+$")) {
      throw new ValidationException(
          "Invalid player tag format. Must start with # or contain only numbers and letters",
          "INVALID_PLAYER_TAG_FORMAT",
          "player_tag");
    }

    try {
      String normalizedTag = userProfileService.setPlayerTag(userId, playerTag);
      logger.info("Player tag set successfully for userId: {} - tag: {}", userId, normalizedTag);
      return ResponseEntity.ok(Map.of("player_tag", normalizedTag));
    } catch (Exception e) {
      logger.error("Failed to set player tag for userId: {} - tag: {}", userId, playerTag, e);
      throw e;
    }
  }

  @GetMapping("/profile")
  public ResponseEntity<Map<String, Object>> getProfile(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Retrieving profile settings for userId: {}", userId);

    try {
      UserProfile profile = userProfileService.getUserProfile(userId);
      User user = userRepository.findById(userId).orElse(new User());

      return ResponseEntity.ok(
          Map.of(
              "risk_weight_war", profile.getRiskWeightWar(),
              "risk_weight_idle", profile.getRiskWeightIdle(),
              "risk_weight_don_deficit", profile.getRiskWeightDonDeficit(),
              "risk_weight_don_drop", profile.getRiskWeightDonDrop(),
              "is_leader", profile.getIsLeader(),
              "verified", user.getIsVerified() != null ? user.getIsVerified() : false));
    } catch (Exception e) {
      logger.error("Failed to retrieve profile for userId: {}", userId, e);
      throw e;
    }
  }

  @PostMapping("/profile")
  public ResponseEntity<Map<String, String>> updateProfile(
      HttpServletRequest request, @RequestBody Map<String, Object> payload) {
    Long userId = getUserId(request);
    logger.debug("Updating profile settings for userId: {}", userId);

    UserProfileService.ProfileUpdateRequest updateRequest =
        new UserProfileService.ProfileUpdateRequest();

    try {
      if (payload.containsKey("risk_weight_war")) {
        Object value = payload.get("risk_weight_war");
        if (value instanceof Number) {
          updateRequest.setRiskWeightWar(((Number) value).doubleValue());
        } else {
          throw new ValidationException(
              "risk_weight_war must be a number", "INVALID_RISK_WEIGHT", "risk_weight_war");
        }
      }
      if (payload.containsKey("risk_weight_idle")) {
        Object value = payload.get("risk_weight_idle");
        if (value instanceof Number) {
          updateRequest.setRiskWeightIdle(((Number) value).doubleValue());
        } else {
          throw new ValidationException(
              "risk_weight_idle must be a number", "INVALID_RISK_WEIGHT", "risk_weight_idle");
        }
      }
      if (payload.containsKey("risk_weight_don_deficit")) {
        Object value = payload.get("risk_weight_don_deficit");
        if (value instanceof Number) {
          updateRequest.setRiskWeightDonDeficit(((Number) value).doubleValue());
        } else {
          throw new ValidationException(
              "risk_weight_don_deficit must be a number",
              "INVALID_RISK_WEIGHT",
              "risk_weight_don_deficit");
        }
      }
      if (payload.containsKey("risk_weight_don_drop")) {
        Object value = payload.get("risk_weight_don_drop");
        if (value instanceof Number) {
          updateRequest.setRiskWeightDonDrop(((Number) value).doubleValue());
        } else {
          throw new ValidationException(
              "risk_weight_don_drop must be a number",
              "INVALID_RISK_WEIGHT",
              "risk_weight_don_drop");
        }
      }
      if (payload.containsKey("is_leader")) {
        Object value = payload.get("is_leader");
        if (value instanceof Boolean) {
          updateRequest.setIsLeader((Boolean) value);
        } else {
          throw new ValidationException(
              "is_leader must be a boolean", "INVALID_BOOLEAN", "is_leader");
        }
      }

      userProfileService.updateProfile(userId, updateRequest);
      logger.info("Profile updated successfully for userId: {}", userId);
      return ResponseEntity.ok(Map.of("status", "ok"));
    } catch (ValidationException e) {
      throw e; // Re-throw validation exceptions
    } catch (Exception e) {
      logger.error("Failed to update profile for userId: {}", userId, e);
      throw e;
    }
  }

  @GetMapping("/features")
  public ResponseEntity<Map<String, Object>> getFeatures(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Retrieving feature flags for userId: {}", userId);

    try {
      UserProfileService.FeatureFlagsResponse response = userProfileService.getFeatureFlags(userId);

      return ResponseEntity.ok(
          Map.of(
              "all", response.isAll(),
              "features", response.getFeatures()));
    } catch (Exception e) {
      logger.error("Failed to retrieve feature flags for userId: {}", userId, e);
      throw e;
    }
  }

  @SuppressWarnings("unchecked")
  @PostMapping("/features")
  public ResponseEntity<Map<String, String>> updateFeatures(
      HttpServletRequest request, @RequestBody Map<String, Object> payload) {
    Long userId = getUserId(request);
    logger.debug("Updating feature flags for userId: {}", userId);

    try {
      UserProfileService.FeatureUpdateRequest updateRequest =
          new UserProfileService.FeatureUpdateRequest();

      Object allValue = payload.getOrDefault("all", false);
      if (!(allValue instanceof Boolean)) {
        throw new ValidationException("'all' must be a boolean value", "INVALID_BOOLEAN", "all");
      }
      updateRequest.setAll((Boolean) allValue);

      if (payload.containsKey("features")) {
        Object featuresValue = payload.get("features");
        if (featuresValue instanceof List) {
          updateRequest.setFeatures((List<String>) featuresValue);
        } else {
          throw new ValidationException(
              "'features' must be an array of strings", "INVALID_ARRAY", "features");
        }
      }

      userProfileService.updateFeatureFlags(userId, updateRequest);
      logger.info("Feature flags updated successfully for userId: {}", userId);
      return ResponseEntity.ok(Map.of("status", "ok"));
    } catch (ValidationException e) {
      throw e;
    } catch (Exception e) {
      logger.error("Failed to update feature flags for userId: {}", userId, e);
      throw e;
    }
  }

  @GetMapping("/legal")
  public ResponseEntity<Map<String, Object>> getLegal(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Retrieving legal status for userId: {}", userId);

    try {
      LegalService.LegalStatusResponse response = legalService.getLegalStatus(userId);

      return ResponseEntity.ok(
          Map.of(
              "accepted", response.isAccepted(),
              "version", response.getVersion()));
    } catch (Exception e) {
      logger.error("Failed to retrieve legal status for userId: {}", userId, e);
      throw e;
    }
  }

  @PostMapping("/legal")
  public ResponseEntity<Map<String, String>> acceptLegal(
      HttpServletRequest request, @RequestBody Map<String, String> payload) {
    Long userId = getUserId(request);
    logger.debug("Accepting legal terms for userId: {}", userId);

    String version = payload.get("version");
    if (version == null || version.trim().isEmpty()) {
      throw new ValidationException("Legal version is required", "MISSING_VERSION", "version");
    }

    try {
      legalService.acceptLegal(userId, version);
      logger.info("Legal terms accepted for userId: {} - version: {}", userId, version);
      return ResponseEntity.ok(Map.of("status", "ok"));
    } catch (Exception e) {
      logger.error("Failed to accept legal terms for userId: {} - version: {}", userId, version, e);
      throw e;
    }
  }

  @GetMapping("/disclaimer")
  public ResponseEntity<Map<String, Boolean>> getDisclaimer(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Retrieving disclaimer status for userId: {}", userId);

    try {
      boolean seen = legalService.getDisclaimerStatus(userId);
      return ResponseEntity.ok(Map.of("seen", seen));
    } catch (Exception e) {
      logger.error("Failed to retrieve disclaimer status for userId: {}", userId, e);
      throw e;
    }
  }

  @PostMapping("/disclaimer")
  public ResponseEntity<Map<String, String>> acceptDisclaimer(HttpServletRequest request) {
    Long userId = getUserId(request);
    logger.debug("Accepting disclaimer for userId: {}", userId);

    try {
      legalService.acceptDisclaimer(userId);
      logger.info("Disclaimer accepted for userId: {}", userId);
      return ResponseEntity.ok(Map.of("status", "ok"));
    } catch (Exception e) {
      logger.error("Failed to accept disclaimer for userId: {}", userId, e);
      throw e;
    }
  }
}
