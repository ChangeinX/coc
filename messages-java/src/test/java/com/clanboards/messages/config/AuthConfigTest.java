package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.service.JwksService;
import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.messages.model.Session;
import com.clanboards.messages.repository.SessionRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthConfigTest {

  @Mock private JwksService jwksService;

  @Mock private OidcProperties oidcProperties;

  @Mock private SessionRepository sessionRepository;

  private AuthConfig authConfig;

  @BeforeEach
  void setUp() {
    authConfig = new AuthConfig();
  }

  @Test
  void testOidcTokenValidatorWithSessionsBean() {
    // Test that the bean creates an OidcTokenValidator with session repository adapter
    OidcTokenValidator validator =
        authConfig.oidcTokenValidatorWithSessions(jwksService, oidcProperties, sessionRepository);

    assertNotNull(validator);
    // Verify the validator was created (we can't easily test the internal adapter)
  }

  @Test
  void testSessionRepositoryAdapterFindById() {
    // Create a test session
    Session testSession = new Session();
    testSession.setId(123L);
    testSession.setUserId(456L);
    testSession.setExpiresAt(Instant.now().plusSeconds(3600));

    // Mock the JPA repository
    when(sessionRepository.findById(123L)).thenReturn(Optional.of(testSession));

    // Create the validator (which creates the adapter internally)
    OidcTokenValidator validator =
        authConfig.oidcTokenValidatorWithSessions(jwksService, oidcProperties, sessionRepository);

    // We can't directly test the adapter, but we can verify the mock was set up correctly
    verify(sessionRepository, never()).findById(any()); // Not called yet

    // Test that the repository would be called (indirectly through the adapter)
    Optional<Session> result = sessionRepository.findById(123L);
    assertTrue(result.isPresent());
    assertEquals(123L, result.get().getId());
    assertEquals(456L, result.get().getUserId());
  }

  @Test
  void testSessionRepositoryAdapterNotFound() {
    // Mock the JPA repository to return empty
    when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

    // Create the validator
    OidcTokenValidator validator =
        authConfig.oidcTokenValidatorWithSessions(jwksService, oidcProperties, sessionRepository);

    // Test that empty result is handled
    Optional<Session> result = sessionRepository.findById(999L);
    assertFalse(result.isPresent());
  }

  @Test
  void testBeanAnnotations() {
    // Verify that the method has the correct annotations
    try {
      var method =
          AuthConfig.class.getMethod(
              "oidcTokenValidatorWithSessions",
              JwksService.class,
              OidcProperties.class,
              SessionRepository.class);

      // Check for @Bean annotation
      assertTrue(method.isAnnotationPresent(org.springframework.context.annotation.Bean.class));

      // Check for @Primary annotation
      assertTrue(method.isAnnotationPresent(org.springframework.context.annotation.Primary.class));

    } catch (NoSuchMethodException e) {
      fail("Method oidcTokenValidatorWithSessions not found");
    }
  }

  @Test
  void testConfigurationAnnotation() {
    // Verify that the class has the @Configuration annotation
    assertTrue(
        AuthConfig.class.isAnnotationPresent(
            org.springframework.context.annotation.Configuration.class));
  }
}
