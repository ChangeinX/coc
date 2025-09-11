package com.clanboards.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clanboards.auth.config.OidcProperties;
import com.clanboards.auth.model.Session;
import com.clanboards.auth.repository.SessionRepository;
import com.clanboards.auth.service.OidcTokenValidator.TokenValidationException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OidcTokenValidatorTest {

  @Mock private JwksService jwksService;
  @Mock private SessionRepository<Session> sessionRepository;
  @Mock private Session session;

  private OidcProperties oidcProperties;
  private OidcTokenValidator validator;

  @BeforeEach
  void setUp() {
    oidcProperties = new OidcProperties();
    oidcProperties.setIssuer("http://localhost:8080");
    oidcProperties.setAudience("clanboards-mobile");

    validator = new OidcTokenValidator(jwksService, oidcProperties, sessionRepository);
  }

  @Test
  void validateToken_withValidToken_returnsClaimsSuccessfully() throws Exception {
    // Arrange
    String token = "valid.jwt.token";
    Claims claims = createValidClaims();
    when(jwksService.parseAndValidateJwt(token)).thenReturn(claims);

    // Act
    Claims result = validator.validateToken(token);

    // Assert
    assertNotNull(result);
    assertEquals("http://localhost:8080", result.getIssuer());
    assertEquals("clanboards-mobile", result.getAudience());
  }

  @Test
  void validateToken_withInvalidIssuer_throwsTokenValidationException() throws Exception {
    // Arrange
    String token = "invalid.issuer.token";
    Claims claims = createValidClaims();
    claims.setIssuer("http://wrong-issuer.com");
    when(jwksService.parseAndValidateJwt(token)).thenReturn(claims);

    // Act & Assert
    TokenValidationException exception =
        assertThrows(TokenValidationException.class, () -> validator.validateToken(token));
    assertTrue(exception.getMessage().contains("Invalid issuer"));
  }

  @Test
  void validateToken_withExpiredToken_throwsTokenValidationException() throws Exception {
    // Arrange
    String token = "expired.jwt.token";
    Claims claims = createValidClaims();
    claims.setExpiration(Date.from(Instant.now().minusSeconds(3600))); // Expired 1 hour ago
    when(jwksService.parseAndValidateJwt(token)).thenReturn(claims);

    // Act & Assert
    TokenValidationException exception =
        assertThrows(TokenValidationException.class, () -> validator.validateToken(token));
    assertTrue(exception.getMessage().contains("Token expired"));
  }

  @Test
  void extractUserId_withValidSessionId_returnsUserIdFromSession() {
    // Arrange
    Claims claims = Jwts.claims();
    claims.put("sid", 123L);
    when(sessionRepository.findById(123L)).thenReturn(Optional.of(session));
    when(session.getExpiresAt()).thenReturn(Instant.now().plusSeconds(3600));
    when(session.getUserId()).thenReturn(456L);

    // Act
    Long userId = validator.extractUserId(claims);

    // Assert
    assertEquals(456L, userId);
  }

  @Test
  void extractUserId_withDirectUserIdClaim_returnsUserId() {
    // Arrange
    Claims claims = Jwts.claims();
    claims.put("userId", 789L);

    // Act
    Long userId = validator.extractUserId(claims);

    // Assert
    assertEquals(789L, userId);
  }

  @Test
  void extractUserId_withSubjectClaim_returnsUserId() {
    // Arrange
    Claims claims = Jwts.claims();
    claims.setSubject("123");

    // Act
    Long userId = validator.extractUserId(claims);

    // Assert
    assertEquals(123L, userId);
  }

  @Test
  void extractUserId_withExpiredSession_returnsNull() {
    // Arrange
    Claims claims = Jwts.claims();
    claims.put("sid", 123L);
    when(sessionRepository.findById(123L)).thenReturn(Optional.of(session));
    when(session.getExpiresAt()).thenReturn(Instant.now().minusSeconds(3600)); // Expired

    // Act
    Long userId = validator.extractUserId(claims);

    // Assert
    assertNull(userId);
  }

  @Test
  void extractUserId_withNonNumericSubject_returnsNull() {
    // Arrange
    Claims claims = Jwts.claims();
    claims.setSubject("google_123");

    // Act
    Long userId = validator.extractUserId(claims);

    // Assert
    assertNull(userId);
  }

  @Test
  void createValidatorWithoutSessionRepository_worksCorrectly() {
    // Test that we can create a validator without session repository
    OidcTokenValidator validator = new OidcTokenValidator(jwksService, oidcProperties);
    assertNotNull(validator);

    // Test extraction without session repository
    Claims claims = Jwts.claims();
    claims.setSubject("456");
    Long userId = validator.extractUserId(claims);
    assertEquals(456L, userId);
  }

  private Claims createValidClaims() {
    Claims claims = Jwts.claims();
    claims.setIssuer("http://localhost:8080");
    claims.setAudience("clanboards-mobile");
    claims.setExpiration(Date.from(Instant.now().plusSeconds(3600))); // Valid for 1 hour
    return claims;
  }
}
