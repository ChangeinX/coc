package com.clanboards.clashdata.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.clanboards.clashdata.entity.UserProfile;
import com.clanboards.clashdata.repository.UserProfileRepository;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class UserContextServiceTest {

  @Mock private UserProfileRepository userProfileRepository;

  @Mock private SecurityContext securityContext;

  @Mock private Authentication authentication;

  private UserContextService userContextService;

  @BeforeEach
  void setUp() {
    userContextService = new UserContextService(userProfileRepository);
    SecurityContextHolder.setContext(securityContext);
  }

  @Test
  void testGetUserWeights_WithAuthenticatedUserAndProfile() {
    // Given
    String userSub = "123";
    Long userId = 123L;

    Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").claim("sub", userSub).build();
    JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);

    UserProfile profile = new UserProfile();
    profile.setUserId(userId);
    profile.setRiskWeightWar(0.45);
    profile.setRiskWeightIdle(0.30);
    profile.setRiskWeightDonDeficit(0.20);
    profile.setRiskWeightDonDrop(0.05);

    when(securityContext.getAuthentication()).thenReturn(jwtAuth);
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

    // When
    Map<String, Double> weights = userContextService.getUserWeights();

    // Then
    assertThat(weights).isNotNull();
    assertThat(weights).hasSize(4);
    assertThat(weights.get("war")).isEqualTo(0.45);
    assertThat(weights.get("idle")).isEqualTo(0.30);
    assertThat(weights.get("don_deficit")).isEqualTo(0.20);
    assertThat(weights.get("don_drop")).isEqualTo(0.05);
  }

  @Test
  void testGetUserWeights_WithAuthenticatedUserNoProfile() {
    // Given
    String userSub = "456";
    Long userId = 456L;

    Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").claim("sub", userSub).build();
    JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);

    when(securityContext.getAuthentication()).thenReturn(jwtAuth);
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

    // When
    Map<String, Double> weights = userContextService.getUserWeights();

    // Then - should return null when no profile found
    assertThat(weights).isNull();
  }

  @Test
  void testGetUserWeights_NoAuthentication() {
    // Given
    when(securityContext.getAuthentication()).thenReturn(null);

    // When
    Map<String, Double> weights = userContextService.getUserWeights();

    // Then
    assertThat(weights).isNull();
  }

  @Test
  void testGetUserWeights_NonJwtAuthentication() {
    // Given
    when(securityContext.getAuthentication()).thenReturn(authentication);

    // When
    Map<String, Double> weights = userContextService.getUserWeights();

    // Then
    assertThat(weights).isNull();
  }

  @Test
  void testGetUserWeights_InvalidUserSubFormat() {
    // Given
    String invalidSub = "not-a-number";

    Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").claim("sub", invalidSub).build();
    JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);

    when(securityContext.getAuthentication()).thenReturn(jwtAuth);

    // When
    Map<String, Double> weights = userContextService.getUserWeights();

    // Then - should return null for invalid user ID format
    assertThat(weights).isNull();
  }

  @Test
  void testGetCurrentUserId_Success() {
    // Given
    String userSub = "789";
    Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").claim("sub", userSub).build();
    JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);

    when(securityContext.getAuthentication()).thenReturn(jwtAuth);

    // When
    Long userId = userContextService.getCurrentUserId();

    // Then
    assertThat(userId).isEqualTo(789L);
  }

  @Test
  void testGetCurrentUserId_NoAuth() {
    // Given
    when(securityContext.getAuthentication()).thenReturn(null);

    // When
    Long userId = userContextService.getCurrentUserId();

    // Then
    assertThat(userId).isNull();
  }

  @Test
  void testGetCurrentUserId_InvalidFormat() {
    // Given
    String invalidSub = "abc";
    Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").claim("sub", invalidSub).build();
    JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt);

    when(securityContext.getAuthentication()).thenReturn(jwtAuth);

    // When
    Long userId = userContextService.getCurrentUserId();

    // Then
    assertThat(userId).isNull();
  }
}
