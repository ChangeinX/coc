package com.clanboards.notifications.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.clanboards.notifications.model.Session;
import com.clanboards.notifications.repository.SessionRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

@ExtendWith(MockitoExtension.class)
class AuthFilterTest {

  @Mock private SessionRepository sessionRepository;
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain filterChain;

  private AuthFilter authFilter;
  private SecretKey signingKey;
  private static final String TEST_KEY = "test-secret-key-for-jwt-signing-that-is-long-enough";

  @BeforeEach
  void setUp() {
    signingKey = Keys.hmacShaKeyFor(TEST_KEY.getBytes(StandardCharsets.UTF_8));
    authFilter = new AuthFilter(sessionRepository, TEST_KEY);
  }

  @Test
  void testValidJwtWithValidSession_SetsUserId() throws Exception {
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

    when(request.getHeader("Authorization")).thenReturn("Bearer " + jwt);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request).setAttribute("userId", userId);
    verify(sessionRepository).findById(sessionId);
    verify(filterChain).doFilter(any(), eq(response));
  }

  @Test
  void testValidJwtWithExpiredSession_DoesNotSetUserId() throws Exception {
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

    when(request.getHeader("Authorization")).thenReturn("Bearer " + jwt);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request, never()).setAttribute(eq("userId"), any());
    verify(sessionRepository).findById(sessionId);
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void testValidJwtWithNonExistentSession_DoesNotSetUserId() throws Exception {
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

    when(request.getHeader("Authorization")).thenReturn("Bearer " + jwt);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.empty());

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request, never()).setAttribute(eq("userId"), any());
    verify(sessionRepository).findById(sessionId);
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void testInvalidJwt_DoesNotSetUserId() throws Exception {
    // Arrange
    String invalidJwt = "invalid.jwt.token";

    when(request.getHeader("Authorization")).thenReturn("Bearer " + invalidJwt);

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request, never()).setAttribute(eq("userId"), any());
    verify(sessionRepository, never()).findById(any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void testCookieAuthentication_SetsUserId() throws Exception {
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

    Cookie sidCookie = new Cookie("sid", jwt);
    Cookie[] cookies = {sidCookie, new Cookie("other", "value")};

    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getCookies()).thenReturn(cookies);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request).setAttribute("userId", userId);
    verify(sessionRepository).findById(sessionId);
    verify(filterChain).doFilter(any(), eq(response));
  }

  @Test
  void testBearerTokenTakesPrecedenceOverCookie() throws Exception {
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

    Cookie sidCookie = new Cookie("sid", cookieJwt);
    Cookie[] cookies = {sidCookie};

    when(request.getHeader("Authorization")).thenReturn("Bearer " + bearerJwt);
    when(sessionRepository.findById(bearerSessionId)).thenReturn(Optional.of(session));

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(sessionRepository).findById(bearerSessionId);
    verify(sessionRepository, never()).findById(cookieSessionId);
    verify(request).setAttribute("userId", userId);
  }

  @Test
  void testNoAuthentication_ContinuesWithoutUserId() throws Exception {
    // Arrange
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getCookies()).thenReturn(null);

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request, never()).setAttribute(eq("userId"), any());
    verify(sessionRepository, never()).findById(any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void testJwtWithoutSessionId_DoesNotSetUserId() throws Exception {
    // Arrange
    String sub = "test-user-sub";

    String jwt =
        Jwts.builder()
            .setSubject(sub)
            // No "sid" claim
            .setExpiration(Date.from(Instant.now().plusSeconds(3600)))
            .signWith(signingKey)
            .compact();

    when(request.getHeader("Authorization")).thenReturn("Bearer " + jwt);

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(request, never()).setAttribute(eq("userId"), any());
    verify(sessionRepository, never()).findById(any());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void testUserPrincipal_SetCorrectly() throws Exception {
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

    when(request.getHeader("Authorization")).thenReturn("Bearer " + jwt);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    // Act
    authFilter.doFilterInternal(request, response, filterChain);

    // Assert
    verify(filterChain)
        .doFilter(
            argThat(
                req ->
                    ((HttpServletRequest) req).getUserPrincipal() != null
                        && ((HttpServletRequest) req)
                            .getUserPrincipal()
                            .getName()
                            .equals(String.valueOf(userId))),
            eq(response));
  }
}
