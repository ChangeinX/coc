package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.clanboards.clashdata.entity.User;
import com.clanboards.clashdata.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private CocClientService cocClientService;
  @Mock private SecurityContext securityContext;
  @Mock private JwtAuthenticationToken jwtAuthenticationToken;
  @Mock private Jwt jwt;

  private UserService userService;

  @BeforeEach
  void setUp() {
    userService = new UserService(userRepository, cocClientService);
  }

  @Test
  void testVerifyPlayerTokenSuccess() {
    // Arrange
    String token = "valid-token";
    String playerTag = "#ABC123";
    String normalizedTag = "ABC123";
    String userSub = "user123";

    User user = new User();
    user.setId(1L);
    user.setSub(userSub);
    user.setPlayerTag(playerTag);
    user.setIsVerified(false);

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(jwtAuthenticationToken);
      when(jwtAuthenticationToken.getToken()).thenReturn(jwt);
      when(jwt.getClaimAsString("sub")).thenReturn(userSub);
      when(userRepository.findBySub(userSub)).thenReturn(Optional.of(user));
      when(cocClientService.verifyPlayerToken(playerTag, token)).thenReturn(true);
      when(userRepository.save(any(User.class))).thenReturn(user);

      // Act
      String result = userService.verifyPlayerToken(token);

      // Assert
      assertEquals(normalizedTag, result);
      assertTrue(user.getIsVerified());
      assertEquals(normalizedTag, user.getPlayerTag());
      verify(userRepository).save(user);
      verify(cocClientService).verifyPlayerToken(playerTag, token);
    }
  }

  @Test
  void testVerifyPlayerTokenWithEmptyToken() {
    // Act & Assert
    IllegalArgumentException exception =
        assertThrows(IllegalArgumentException.class, () -> userService.verifyPlayerToken(""));
    assertEquals("Token is required", exception.getMessage());
  }

  @Test
  void testVerifyPlayerTokenWithNullToken() {
    // Act & Assert
    IllegalArgumentException exception =
        assertThrows(IllegalArgumentException.class, () -> userService.verifyPlayerToken(null));
    assertEquals("Token is required", exception.getMessage());
  }

  @Test
  void testVerifyPlayerTokenUserNotFound() {
    // Arrange
    String token = "valid-token";
    String userSub = "user123";

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(jwtAuthenticationToken);
      when(jwtAuthenticationToken.getToken()).thenReturn(jwt);
      when(jwt.getClaimAsString("sub")).thenReturn(userSub);
      when(userRepository.findBySub(userSub)).thenReturn(Optional.empty());

      // Act & Assert
      RuntimeException exception =
          assertThrows(RuntimeException.class, () -> userService.verifyPlayerToken(token));
      assertEquals("User not found", exception.getMessage());
    }
  }

  @Test
  void testVerifyPlayerTokenUserWithoutPlayerTag() {
    // Arrange
    String token = "valid-token";
    String userSub = "user123";

    User user = new User();
    user.setId(1L);
    user.setSub(userSub);
    user.setPlayerTag(null);
    user.setIsVerified(false);

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(jwtAuthenticationToken);
      when(jwtAuthenticationToken.getToken()).thenReturn(jwt);
      when(jwt.getClaimAsString("sub")).thenReturn(userSub);
      when(userRepository.findBySub(userSub)).thenReturn(Optional.of(user));

      // Act & Assert
      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> userService.verifyPlayerToken(token));
      assertEquals("User must have a player tag set", exception.getMessage());
    }
  }

  @Test
  void testVerifyPlayerTokenUserAlreadyVerified() {
    // Arrange
    String token = "valid-token";
    String playerTag = "#ABC123";
    String userSub = "user123";

    User user = new User();
    user.setId(1L);
    user.setSub(userSub);
    user.setPlayerTag(playerTag);
    user.setIsVerified(true);

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(jwtAuthenticationToken);
      when(jwtAuthenticationToken.getToken()).thenReturn(jwt);
      when(jwt.getClaimAsString("sub")).thenReturn(userSub);
      when(userRepository.findBySub(userSub)).thenReturn(Optional.of(user));

      // Act & Assert
      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> userService.verifyPlayerToken(token));
      assertEquals("User is already verified", exception.getMessage());
    }
  }

  @Test
  void testVerifyPlayerTokenInvalidToken() {
    // Arrange
    String token = "invalid-token";
    String playerTag = "#ABC123";
    String userSub = "user123";

    User user = new User();
    user.setId(1L);
    user.setSub(userSub);
    user.setPlayerTag(playerTag);
    user.setIsVerified(false);

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(jwtAuthenticationToken);
      when(jwtAuthenticationToken.getToken()).thenReturn(jwt);
      when(jwt.getClaimAsString("sub")).thenReturn(userSub);
      when(userRepository.findBySub(userSub)).thenReturn(Optional.of(user));
      when(cocClientService.verifyPlayerToken(playerTag, token)).thenReturn(false);

      // Act & Assert
      RuntimeException exception =
          assertThrows(RuntimeException.class, () -> userService.verifyPlayerToken(token));
      assertEquals("Token verification failed", exception.getMessage());
      verify(cocClientService).verifyPlayerToken(playerTag, token);
      verify(userRepository, never()).save(any(User.class));
    }
  }

  @Test
  void testVerifyPlayerTokenNoAuthentication() {
    // Arrange
    String token = "valid-token";

    try (MockedStatic<SecurityContextHolder> mockedSecurityContext =
        mockStatic(SecurityContextHolder.class)) {
      mockedSecurityContext.when(SecurityContextHolder::getContext).thenReturn(securityContext);
      when(securityContext.getAuthentication()).thenReturn(null);

      // Act & Assert
      RuntimeException exception =
          assertThrows(RuntimeException.class, () -> userService.verifyPlayerToken(token));
      assertEquals("User not found", exception.getMessage());
    }
  }
}
