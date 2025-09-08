package com.clanboards.messages.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.clanboards.messages.model.Session;
import com.clanboards.messages.repository.SessionRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class AuthInterceptorTest {

  @Mock private SessionRepository sessionRepository;
  @Mock private WebGraphQlRequest request;
  @Mock private WebGraphQlResponse response;
  @Mock private WebGraphQlInterceptor.Chain chain;

  private AuthInterceptor authInterceptor;
  private SecretKey signingKey;
  private static final String TEST_KEY = "test-secret-key-for-jwt-signing-that-is-long-enough";

  @BeforeEach
  void setUp() {
    signingKey = Keys.hmacShaKeyFor(TEST_KEY.getBytes(StandardCharsets.UTF_8));
    authInterceptor = new AuthInterceptor(sessionRepository, TEST_KEY);
    when(chain.next(any())).thenReturn(Mono.just(response));
  }

  @Test
  void testValidJwtWithValidSession_SetsUserId() {
    // Arrange
    Long sessionId = 1L;
    Long userId = 42L;
    String sub = "test-user-sub";

    Session session = new Session();
    session.setId(sessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().plusSeconds(3600));

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", sessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + jwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request).configureExecutionInput(any());
    verify(sessionRepository).findById(sessionId);
  }

  @Test
  void testValidJwtWithExpiredSession_DoesNotSetUserId() {
    // Arrange
    Long sessionId = 1L;
    Long userId = 42L;
    String sub = "test-user-sub";

    Session session = new Session();
    session.setId(sessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().minusSeconds(3600)); // Expired session

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", sessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + jwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request, never()).configureExecutionInput(any());
    verify(sessionRepository).findById(sessionId);
  }

  @Test
  void testValidJwtWithNonExistentSession_DoesNotSetUserId() {
    // Arrange
    Long sessionId = 1L;
    String sub = "test-user-sub";

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", sessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + jwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.empty());

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request, never()).configureExecutionInput(any());
    verify(sessionRepository).findById(sessionId);
  }

  @Test
  void testInvalidJwt_DoesNotSetUserId() {
    // Arrange
    String invalidJwt = "invalid.jwt.token";

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + invalidJwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request, never()).configureExecutionInput(any());
    verify(sessionRepository, never()).findById(any());
  }

  @Test
  void testCookieAuthentication_SetsUserId() {
    // Arrange
    Long sessionId = 1L;
    Long userId = 42L;
    String sub = "test-user-sub";

    Session session = new Session();
    session.setId(sessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().plusSeconds(3600));

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", sessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Cookie", "sid=" + jwt + "; other=value");

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request).configureExecutionInput(any());
    verify(sessionRepository).findById(sessionId);
  }

  @Test
  void testBearerTokenTakesPrecedenceOverCookie() {
    // Arrange
    Long bearerSessionId = 1L;
    Long cookieSessionId = 2L;
    Long userId = 42L;
    String sub = "test-user-sub";

    Session session = new Session();
    session.setId(bearerSessionId);
    session.setUserId(userId);
    session.setExpiresAt(Instant.now().plusSeconds(3600));

    String bearerJwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", bearerSessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    String cookieJwt =
        Jwts.builder()
            .setSubject(sub)
            .claim("sid", cookieSessionId)
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + bearerJwt);
    headers.add("Cookie", "sid=" + cookieJwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));
    when(sessionRepository.findById(bearerSessionId)).thenReturn(Optional.of(session));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(sessionRepository).findById(bearerSessionId);
    verify(sessionRepository, never()).findById(cookieSessionId);
  }

  @Test
  void testNoAuthentication_ContinuesWithoutUserId() {
    // Arrange
    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request, never()).configureExecutionInput(any());
    verify(sessionRepository, never()).findById(any());
  }

  @Test
  void testJwtWithoutSessionId_DoesNotSetUserId() {
    // Arrange
    String sub = "test-user-sub";

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            // No "sid" claim
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + jwt);

    when(request.getHeaders()).thenReturn(HttpHeaders.readOnlyHttpHeaders(headers));

    // Act & Assert
    StepVerifier.create(authInterceptor.intercept(request, chain))
        .expectNext(response)
        .verifyComplete();

    verify(request, never()).configureExecutionInput(any());
    verify(sessionRepository, never()).findById(any());
  }
}
