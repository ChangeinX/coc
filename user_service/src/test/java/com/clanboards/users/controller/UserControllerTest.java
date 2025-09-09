package com.clanboards.users.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

class UserControllerTest {

  @Mock private UserRepository userRepository;
  @Mock private UserProfileService userProfileService;
  @Mock private LegalService legalService;
  @Mock private HttpServletRequest request;

  private UserController controller;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    controller = new UserController(userRepository, userProfileService, legalService);
    when(request.getAttribute("userId")).thenReturn(123L);
  }

  @Test
  void getMeReturnsUserInformation() {
    User user = new User();
    user.setId(123L);
    user.setSub("google_sub_123");
    user.setEmail("test@example.com");
    user.setName("Test User");
    user.setPlayerTag("ABC123");
    user.setIsVerified(true);

    when(userRepository.findById(123L)).thenReturn(Optional.of(user));

    ResponseEntity<Map<String, Object>> response = controller.getMe(request);

    assertEquals(200, response.getStatusCode().value());
    Map<String, Object> body = response.getBody();
    assertEquals(123L, body.get("id"));
    assertEquals("google_sub_123", body.get("sub"));
    assertEquals("test@example.com", body.get("email"));
    assertEquals("Test User", body.get("name"));
    assertEquals("ABC123", body.get("player_tag"));
    assertEquals(true, body.get("verified"));
  }

  @Test
  void getMeReturns404WhenUserNotFound() {
    when(userRepository.findById(123L)).thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> controller.getMe(request));
  }

  @Test
  void setPlayerTagUpdatesPlayerTag() {
    when(userProfileService.setPlayerTag(123L, "#ABC123")).thenReturn("ABC123");

    Map<String, String> payload = Map.of("player_tag", "#ABC123");
    ResponseEntity<Map<String, String>> response = controller.setPlayerTag(request, payload);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("ABC123", response.getBody().get("player_tag"));
  }

  @Test
  void setPlayerTagReturns400ForEmptyTag() {
    Map<String, String> payload = Map.of("player_tag", "");

    assertThrows(ValidationException.class, () -> controller.setPlayerTag(request, payload));
  }

  @Test
  void getProfileReturnsProfileWithFeatures() {
    UserProfile profile = new UserProfile();
    profile.setUserId(123L);
    profile.setRiskWeightWar(0.45);
    profile.setRiskWeightIdle(0.30);
    profile.setRiskWeightDonDeficit(0.15);
    profile.setRiskWeightDonDrop(0.10);
    profile.setIsLeader(true);

    User user = new User();
    user.setIsVerified(true);

    when(userProfileService.getUserProfile(123L)).thenReturn(profile);
    when(userRepository.findById(123L)).thenReturn(Optional.of(user));

    ResponseEntity<Map<String, Object>> response = controller.getProfile(request);

    assertEquals(200, response.getStatusCode().value());
    Map<String, Object> body = response.getBody();
    assertEquals(0.45, body.get("risk_weight_war"));
    assertEquals(0.30, body.get("risk_weight_idle"));
    assertEquals(0.15, body.get("risk_weight_don_deficit"));
    assertEquals(0.10, body.get("risk_weight_don_drop"));
    assertEquals(true, body.get("is_leader"));
    assertEquals(true, body.get("verified"));
  }

  @Test
  void updateProfileUpdatesAllFields() {
    Map<String, Object> payload =
        Map.of(
            "risk_weight_war", 0.50,
            "risk_weight_idle", 0.25,
            "risk_weight_don_deficit", 0.15,
            "risk_weight_don_drop", 0.10,
            "is_leader", true);

    ResponseEntity<Map<String, String>> response = controller.updateProfile(request, payload);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("ok", response.getBody().get("status"));
    verify(userProfileService)
        .updateProfile(eq(123L), any(UserProfileService.ProfileUpdateRequest.class));
  }

  @Test
  void getFeaturesReturnsFeatureFlags() {
    UserProfileService.FeatureFlagsResponse mockResponse =
        new UserProfileService.FeatureFlagsResponse(true, List.of("feature1", "feature2"));

    when(userProfileService.getFeatureFlags(123L)).thenReturn(mockResponse);

    ResponseEntity<Map<String, Object>> response = controller.getFeatures(request);

    assertEquals(200, response.getStatusCode().value());
    Map<String, Object> body = response.getBody();
    assertEquals(true, body.get("all"));
    assertEquals(List.of("feature1", "feature2"), body.get("features"));
  }

  @Test
  void updateFeaturesUpdatesFeatureFlags() {
    Map<String, Object> payload = Map.of("all", false, "features", List.of("feature1"));

    ResponseEntity<Map<String, String>> response = controller.updateFeatures(request, payload);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("ok", response.getBody().get("status"));
    verify(userProfileService)
        .updateFeatureFlags(eq(123L), any(UserProfileService.FeatureUpdateRequest.class));
  }

  @Test
  void getLegalReturnsLegalStatus() {
    LegalService.LegalStatusResponse mockResponse =
        new LegalService.LegalStatusResponse(true, "1.2.0");

    when(legalService.getLegalStatus(123L)).thenReturn(mockResponse);

    ResponseEntity<Map<String, Object>> response = controller.getLegal(request);

    assertEquals(200, response.getStatusCode().value());
    Map<String, Object> body = response.getBody();
    assertEquals(true, body.get("accepted"));
    assertEquals("1.2.0", body.get("version"));
  }

  @Test
  void acceptLegalAcceptsLegalTerms() {
    Map<String, String> payload = Map.of("version", "1.2.0");

    ResponseEntity<Map<String, String>> response = controller.acceptLegal(request, payload);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("ok", response.getBody().get("status"));
    verify(legalService).acceptLegal(123L, "1.2.0");
  }

  @Test
  void getDisclaimerReturnsDisclaimerStatus() {
    when(legalService.getDisclaimerStatus(123L)).thenReturn(true);

    ResponseEntity<Map<String, Boolean>> response = controller.getDisclaimer(request);

    assertEquals(200, response.getStatusCode().value());
    assertEquals(true, response.getBody().get("seen"));
  }

  @Test
  void acceptDisclaimerAcknowledgesDisclaimer() {
    ResponseEntity<Map<String, String>> response = controller.acceptDisclaimer(request);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("ok", response.getBody().get("status"));
    verify(legalService).acceptDisclaimer(123L);
  }

  @Test
  void allEndpointsThrowWhenNoUserId() {
    when(request.getAttribute("userId")).thenReturn(null);

    assertThrows(UnauthorizedException.class, () -> controller.getMe(request));
    assertThrows(UnauthorizedException.class, () -> controller.getProfile(request));
    assertThrows(UnauthorizedException.class, () -> controller.setPlayerTag(request, Map.of()));
  }
}
