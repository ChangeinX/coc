package com.clanboards.users.controller;

import com.clanboards.users.exception.InvalidRequestException;
import com.clanboards.users.model.User;
import com.clanboards.users.model.UserProfile;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.service.LegalService;
import com.clanboards.users.service.UserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

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
      throw new InvalidRequestException("User not authenticated");
    }
    return (Long) userId;
  }

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> getMe(HttpServletRequest request) {
    Long userId = getUserId(request);

    User user = userRepository.findById(userId).orElse(null);

    if (user == null) {
      return ResponseEntity.notFound().build();
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

    String playerTag = payload.get("player_tag");
    if (playerTag == null || playerTag.trim().isEmpty()) {
      return ResponseEntity.badRequest().build();
    }

    String normalizedTag = userProfileService.setPlayerTag(userId, playerTag);
    return ResponseEntity.ok(Map.of("player_tag", normalizedTag));
  }

  @GetMapping("/profile")
  public ResponseEntity<Map<String, Object>> getProfile(HttpServletRequest request) {
    Long userId = getUserId(request);

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
  }

  @PostMapping("/profile")
  public ResponseEntity<Map<String, String>> updateProfile(
      HttpServletRequest request, @RequestBody Map<String, Object> payload) {
    Long userId = getUserId(request);

    UserProfileService.ProfileUpdateRequest updateRequest =
        new UserProfileService.ProfileUpdateRequest();

    if (payload.containsKey("risk_weight_war")) {
      updateRequest.setRiskWeightWar(((Number) payload.get("risk_weight_war")).doubleValue());
    }
    if (payload.containsKey("risk_weight_idle")) {
      updateRequest.setRiskWeightIdle(((Number) payload.get("risk_weight_idle")).doubleValue());
    }
    if (payload.containsKey("risk_weight_don_deficit")) {
      updateRequest.setRiskWeightDonDeficit(
          ((Number) payload.get("risk_weight_don_deficit")).doubleValue());
    }
    if (payload.containsKey("risk_weight_don_drop")) {
      updateRequest.setRiskWeightDonDrop(
          ((Number) payload.get("risk_weight_don_drop")).doubleValue());
    }
    if (payload.containsKey("is_leader")) {
      updateRequest.setIsLeader((Boolean) payload.get("is_leader"));
    }

    userProfileService.updateProfile(userId, updateRequest);
    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/features")
  public ResponseEntity<Map<String, Object>> getFeatures(HttpServletRequest request) {
    Long userId = getUserId(request);

    UserProfileService.FeatureFlagsResponse response = userProfileService.getFeatureFlags(userId);

    return ResponseEntity.ok(
        Map.of(
            "all", response.isAll(),
            "features", response.getFeatures()));
  }

  @SuppressWarnings("unchecked")
  @PostMapping("/features")
  public ResponseEntity<Map<String, String>> updateFeatures(
      HttpServletRequest request, @RequestBody Map<String, Object> payload) {
    Long userId = getUserId(request);

    UserProfileService.FeatureUpdateRequest updateRequest =
        new UserProfileService.FeatureUpdateRequest();
    updateRequest.setAll((Boolean) payload.getOrDefault("all", false));

    if (payload.containsKey("features") && payload.get("features") instanceof List) {
      updateRequest.setFeatures((List<String>) payload.get("features"));
    }

    userProfileService.updateFeatureFlags(userId, updateRequest);
    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/legal")
  public ResponseEntity<Map<String, Object>> getLegal(HttpServletRequest request) {
    Long userId = getUserId(request);

    LegalService.LegalStatusResponse response = legalService.getLegalStatus(userId);

    return ResponseEntity.ok(
        Map.of(
            "accepted", response.isAccepted(),
            "version", response.getVersion()));
  }

  @PostMapping("/legal")
  public ResponseEntity<Map<String, String>> acceptLegal(
      HttpServletRequest request, @RequestBody Map<String, String> payload) {
    Long userId = getUserId(request);

    String version = payload.get("version");
    legalService.acceptLegal(userId, version);

    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/disclaimer")
  public ResponseEntity<Map<String, Boolean>> getDisclaimer(HttpServletRequest request) {
    Long userId = getUserId(request);

    boolean seen = legalService.getDisclaimerStatus(userId);

    return ResponseEntity.ok(Map.of("seen", seen));
  }

  @PostMapping("/disclaimer")
  public ResponseEntity<Map<String, String>> acceptDisclaimer(HttpServletRequest request) {
    Long userId = getUserId(request);

    legalService.acceptDisclaimer(userId);

    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @ExceptionHandler(InvalidRequestException.class)
  public ResponseEntity<Void> handleInvalidRequest(InvalidRequestException e) {
    if ("User not authenticated".equals(e.getMessage())) {
      return ResponseEntity.status(401).build();
    }
    return ResponseEntity.badRequest().build();
  }
}
