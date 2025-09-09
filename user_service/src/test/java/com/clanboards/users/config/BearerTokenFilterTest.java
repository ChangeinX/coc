package com.clanboards.users.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.model.Session;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.SessionRepository;
import com.clanboards.users.service.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class BearerTokenFilterTest {

  @Mock private SessionRepository sessionRepository;
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain filterChain;
  @Mock private OidcProperties oidcProperties;
  @Mock private KeyHolder keyHolder;

  private BearerTokenFilter filter;
  private TokenService tokenService;
  private KeyPair keyPair;
  private PublicKey publicKey;

  @BeforeEach
  void setUp() throws Exception {
    MockitoAnnotations.openMocks(this);

    // Generate test RSA key pair
    KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
    keyGen.initialize(2048);
    keyPair = keyGen.generateKeyPair();
    publicKey = keyPair.getPublic();

    // Configure mocks
    when(oidcProperties.getIssuer()).thenReturn("http://localhost:8080/api/v1/users");
    when(oidcProperties.getAudience()).thenReturn("clanboards-mobile");
    when(oidcProperties.getAccessTtl()).thenReturn(Duration.ofHours(1));
    when(oidcProperties.getIdTtl()).thenReturn(Duration.ofHours(1));
    when(oidcProperties.getRefreshTtl()).thenReturn(Duration.ofDays(30));
    when(keyHolder.getPrivateKey()).thenReturn(keyPair.getPrivate());
    when(keyHolder.getPublicKey()).thenReturn(publicKey);
    when(keyHolder.getKid()).thenReturn("test-kid");

    tokenService = new TokenService(oidcProperties, keyHolder, sessionRepository);
    filter = new BearerTokenFilter(keyHolder, oidcProperties, sessionRepository);
  }

  @Test
  void validBearerTokenSetsUserIdAttribute() throws Exception {
    // Create a test user and session
    User user = new User();
    user.setId(123L);
    user.setSub(null); // This will make TokenService use String.valueOf(user.getId())

    Session session = new Session();
    session.setId(456L);
    session.setUserId(123L);
    session.setExpiresAt(Instant.now().plusSeconds(3600));

    // Generate a valid token
    TokenService.TokenPair tokenPair = tokenService.issueAccessAndId(user, session.getId());
    String bearerToken = "Bearer " + tokenPair.accessToken();

    // Mock the request
    when(request.getHeader("Authorization")).thenReturn(bearerToken);
    when(sessionRepository.findById(456L)).thenReturn(Optional.of(session));

    // Execute the filter
    filter.doFilterInternal(request, response, filterChain);

    // Verify userId attribute was set
    ArgumentCaptor<String> attrNameCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<Long> attrValueCaptor = ArgumentCaptor.forClass(Long.class);
    verify(request).setAttribute(attrNameCaptor.capture(), attrValueCaptor.capture());
    assertEquals("userId", attrNameCaptor.getValue());
    assertEquals(123L, attrValueCaptor.getValue());

    // Verify filter chain continues
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void missingAuthorizationHeaderDoesNotSetUserId() throws Exception {
    when(request.getHeader("Authorization")).thenReturn(null);

    filter.doFilterInternal(request, response, filterChain);

    verify(request, never()).setAttribute(eq("userId"), any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void invalidBearerTokenDoesNotSetUserId() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer invalid_token");

    filter.doFilterInternal(request, response, filterChain);

    verify(request, never()).setAttribute(eq("userId"), any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void expiredTokenDoesNotSetUserId() throws Exception {
    // Create an expired token by mocking the TTL to be negative
    when(oidcProperties.getAccessTtl()).thenReturn(Duration.ofSeconds(-1));
    TokenService expiredTokenService =
        new TokenService(oidcProperties, keyHolder, sessionRepository);

    User user = new User();
    user.setId(123L);
    user.setSub("test_sub_123");

    TokenService.TokenPair tokenPair = expiredTokenService.issueAccessAndId(user, 456L);
    String bearerToken = "Bearer " + tokenPair.accessToken();

    when(request.getHeader("Authorization")).thenReturn(bearerToken);

    filter.doFilterInternal(request, response, filterChain);

    verify(request, never()).setAttribute(eq("userId"), any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void wrongAudienceTokenDoesNotSetUserId() throws Exception {
    // Create a token with wrong audience
    when(oidcProperties.getAudience()).thenReturn("wrong-audience");
    TokenService wrongAudTokenService =
        new TokenService(oidcProperties, keyHolder, sessionRepository);

    User user = new User();
    user.setId(123L);
    user.setSub("test_sub_123");

    TokenService.TokenPair tokenPair = wrongAudTokenService.issueAccessAndId(user, 456L);
    String bearerToken = "Bearer " + tokenPair.accessToken();

    // Reset audience for filter validation
    when(oidcProperties.getAudience()).thenReturn("clanboards-mobile");

    when(request.getHeader("Authorization")).thenReturn(bearerToken);

    filter.doFilterInternal(request, response, filterChain);

    verify(request, never()).setAttribute(eq("userId"), any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void tokenWithoutSessionIdStillSetsUserId() throws Exception {
    // Generate a token without session ID (e.g., for service-to-service auth)
    // When sub is null, TokenService uses String.valueOf(user.getId()) as the sub
    User user = new User();
    user.setId(789L);
    user.setSub(null); // This will make TokenService use String.valueOf(user.getId())

    TokenService.TokenPair tokenPair = tokenService.issueAccessAndId(user, null);
    String bearerToken = "Bearer " + tokenPair.accessToken();

    when(request.getHeader("Authorization")).thenReturn(bearerToken);

    filter.doFilterInternal(request, response, filterChain);

    // Should still set userId from sub claim (which is "789")
    ArgumentCaptor<String> attrNameCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<Long> attrValueCaptor = ArgumentCaptor.forClass(Long.class);
    verify(request).setAttribute(attrNameCaptor.capture(), attrValueCaptor.capture());
    assertEquals("userId", attrNameCaptor.getValue());
    assertEquals(789L, attrValueCaptor.getValue());

    verify(filterChain).doFilter(request, response);
  }

  @Test
  void nonBearerAuthorizationHeaderDoesNotSetUserId() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Basic dXNlcjpwYXNz");

    filter.doFilterInternal(request, response, filterChain);

    verify(request, never()).setAttribute(eq("userId"), any());
    verify(filterChain).doFilter(request, response);
  }
}
