package com.clanboards.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

import com.clanboards.auth.config.OidcProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwksServiceTest {

  @Mock private JwksContentProvider jwksContentProvider;
  private OidcProperties oidcProperties;
  private JwksService jwksService;
  private KeyPair testKeyPair;
  private String validJwksJson;

  @BeforeEach
  void setUp() throws Exception {
    oidcProperties = new OidcProperties();
    oidcProperties.setUserServiceUrl("http://localhost:8080");
    oidcProperties.setKeysCacheDurationMinutes(15);
    oidcProperties.setConnectionTimeoutSeconds(10);
    oidcProperties.setJwksSource("db");
    oidcProperties.setDisallowHttp(true);

    // Generate test keypair and JWKS JSON
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    testKeyPair = generator.generateKeyPair();

    // Create valid JWKS JSON
    RSAPublicKey publicKey = (RSAPublicKey) testKeyPair.getPublic();
    String n = base64Url(publicKey.getModulus().toByteArray());
    String e = base64Url(publicKey.getPublicExponent().toByteArray());

    Map<String, Object> jwk = Map.of("kty", "RSA", "kid", "test-key-1", "n", n, "e", e);

    validJwksJson = new ObjectMapper().writeValueAsString(Map.of("keys", new Object[] {jwk}));
  }

  @Test
  void constructor_withProvider_setsUpCorrectly() {
    jwksService = new JwksService(oidcProperties, jwksContentProvider);
    assertNotNull(jwksService);
  }

  @Test
  void constructor_withHttpOnly_setsUpCorrectly() {
    oidcProperties.setJwksSource("http");
    oidcProperties.setDisallowHttp(false);
    jwksService = new JwksService(oidcProperties);
    assertNotNull(jwksService);
  }

  @Test
  void parseAndValidateJwt_withValidProviderJwks_parsesSuccessfully() throws Exception {
    // Arrange
    when(jwksContentProvider.loadJwksJson()).thenReturn(validJwksJson);
    jwksService = new JwksService(oidcProperties, jwksContentProvider);

    String token =
        Jwts.builder()
            .setHeaderParam("kid", "test-key-1")
            .claim("test", "value")
            .signWith(testKeyPair.getPrivate())
            .compact();

    // Act
    Claims claims = jwksService.parseAndValidateJwt(token);

    // Assert
    assertNotNull(claims);
    assertEquals("value", claims.get("test"));
    verify(jwksContentProvider, atLeastOnce()).loadJwksJson();
  }

  @Test
  void parseAndValidateJwt_withProviderException_throwsException() throws Exception {
    // Arrange
    lenient()
        .when(jwksContentProvider.loadJwksJson())
        .thenThrow(new RuntimeException("Provider failed"));
    jwksService = new JwksService(oidcProperties, jwksContentProvider);

    String token = "invalid.token";

    // Act & Assert
    assertThrows(Exception.class, () -> jwksService.parseAndValidateJwt(token));
  }

  @Test
  void parseAndValidateJwt_withInvalidJwksFromProvider_throwsException() throws Exception {
    // Arrange
    lenient().when(jwksContentProvider.loadJwksJson()).thenReturn("invalid json");
    jwksService = new JwksService(oidcProperties, jwksContentProvider);

    String token = "some.token";

    // Act & Assert
    assertThrows(Exception.class, () -> jwksService.parseAndValidateJwt(token));
  }

  @Test
  void parseAndValidateJwt_withMissingKid_throwsException() throws Exception {
    // Arrange
    lenient().when(jwksContentProvider.loadJwksJson()).thenReturn(validJwksJson);
    jwksService = new JwksService(oidcProperties, jwksContentProvider);

    String tokenWithoutKid =
        Jwts.builder().claim("test", "value").signWith(testKeyPair.getPrivate()).compact();

    // Act & Assert
    RuntimeException exception =
        assertThrows(
            RuntimeException.class, () -> jwksService.parseAndValidateJwt(tokenWithoutKid));
    assertTrue(exception.getMessage().contains("missing 'kid'"));
  }

  @Test
  void parseAndValidateJwt_withUnknownKid_throwsException() throws Exception {
    // Arrange
    when(jwksContentProvider.loadJwksJson()).thenReturn(validJwksJson);
    jwksService = new JwksService(oidcProperties, jwksContentProvider);

    String tokenWithWrongKid =
        Jwts.builder()
            .setHeaderParam("kid", "unknown-key")
            .claim("test", "value")
            .signWith(testKeyPair.getPrivate())
            .compact();

    // Act & Assert
    RuntimeException exception =
        assertThrows(
            RuntimeException.class, () -> jwksService.parseAndValidateJwt(tokenWithWrongKid));
    assertTrue(exception.getMessage().contains("No key found for kid"));
  }

  @Test
  void constructor_withHttpDisallowedAndNoProvider_throwsException() {
    oidcProperties.setJwksSource("db");
    oidcProperties.setDisallowHttp(true);

    // Should throw when trying to parse without provider
    jwksService = new JwksService(oidcProperties);
    String token = "some.token";

    assertThrows(RuntimeException.class, () -> jwksService.parseAndValidateJwt(token));
  }

  private static String base64Url(byte[] bytes) {
    // Ensure positive big integer by stripping leading sign byte if present
    if (bytes.length > 1 && bytes[0] == 0) {
      byte[] tmp = new byte[bytes.length - 1];
      System.arraycopy(bytes, 1, tmp, 0, tmp.length);
      bytes = tmp;
    }
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
