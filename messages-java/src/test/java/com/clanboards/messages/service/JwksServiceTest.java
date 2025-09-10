package com.clanboards.messages.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockserver.integration.ClientAndServer;
import org.springframework.test.util.ReflectionTestUtils;

class JwksServiceTest {

  private ClientAndServer mockServer;
  private JwksService jwksService;
  private KeyPair keyPair;
  private String kid = "test-key-id";

  @BeforeEach
  void setUp() throws Exception {
    mockServer = ClientAndServer.startClientAndServer(0);
    String mockServerUrl = "http://localhost:" + mockServer.getPort();

    jwksService = new JwksService(mockServerUrl);

    // Generate test RSA key pair
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    keyPair = generator.generateKeyPair();

    setupMockJwksEndpoint();
  }

  @AfterEach
  void tearDown() {
    mockServer.stop();
  }

  private void setupMockJwksEndpoint() throws Exception {
    RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();

    String n = base64Url(publicKey.getModulus().toByteArray());
    String e = base64Url(publicKey.getPublicExponent().toByteArray());

    Map<String, Object> jwk =
        Map.of("kty", "RSA", "alg", "RS256", "use", "sig", "kid", kid, "n", n, "e", e);

    Map<String, Object> jwks = Map.of("keys", new Object[] {jwk});

    ObjectMapper mapper = new ObjectMapper();
    String jwksJson = mapper.writeValueAsString(jwks);

    mockServer
        .when(request().withMethod("GET").withPath("/api/v1/users/oauth2/jwks.json"))
        .respond(
            response()
                .withStatusCode(200)
                .withHeader("Content-Type", "application/json")
                .withBody(jwksJson));
  }

  @Test
  void testParseValidRsaJwt() throws Exception {
    // Create a valid RS256 JWT
    String token =
        Jwts.builder()
            .setSubject("user123")
            .claim("sid", 42L)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .setIssuedAt(Date.from(Instant.now()))
            .setHeaderParam("kid", kid)
            .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256)
            .compact();

    Claims claims = jwksService.parseAndValidateJwt(token);

    assertNotNull(claims);
    assertEquals("user123", claims.getSubject());
    assertEquals(42L, ((Number) claims.get("sid")).longValue());
  }

  @Test
  void testParseJwtWithMissingKid() throws Exception {
    // Create JWT without kid in header
    String token =
        Jwts.builder()
            .setSubject("user123")
            .claim("sid", 42L)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256)
            .compact();

    assertThrows(
        RuntimeException.class,
        () -> {
          jwksService.parseAndValidateJwt(token);
        });
  }

  @Test
  void testParseJwtWithUnknownKid() throws Exception {
    // Create JWT with unknown kid
    String token =
        Jwts.builder()
            .setSubject("user123")
            .claim("sid", 42L)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .setHeaderParam("kid", "unknown-key-id")
            .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256)
            .compact();

    assertThrows(
        RuntimeException.class,
        () -> {
          jwksService.parseAndValidateJwt(token);
        });
  }

  @Test
  void testJwksEndpointFailure() throws Exception {
    // Setup mock to return 500 error
    mockServer.reset();
    mockServer
        .when(request().withMethod("GET").withPath("/api/v1/users/oauth2/jwks.json"))
        .respond(response().withStatusCode(500));

    // Force cache refresh
    ReflectionTestUtils.setField(jwksService, "lastFetch", Instant.EPOCH);

    String token =
        Jwts.builder()
            .setSubject("user123")
            .setHeaderParam("kid", kid)
            .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256)
            .compact();

    assertThrows(
        RuntimeException.class,
        () -> {
          jwksService.parseAndValidateJwt(token);
        });
  }

  private static String base64Url(byte[] bytes) {
    // Remove leading zero byte if present (for positive big integers)
    if (bytes.length > 1 && bytes[0] == 0) {
      byte[] tmp = new byte[bytes.length - 1];
      System.arraycopy(bytes, 1, tmp, 0, tmp.length);
      bytes = tmp;
    }
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
