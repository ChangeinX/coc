package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class OidcAuthenticationFilterTest {

  @Mock private OidcTokenValidator tokenValidator;
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain filterChain;

  private OidcAuthenticationFilter filter;
  private ListAppender<ILoggingEvent> listAppender;
  private Logger logger;
  private StringWriter responseWriter;

  @BeforeEach
  void setUp() throws Exception {
    // Ensure clean SecurityContext for each test
    SecurityContextHolder.clearContext();

    filter = new OidcAuthenticationFilter(tokenValidator);

    // Setup logger capture with DEBUG level enabled
    logger = (Logger) LoggerFactory.getLogger(OidcAuthenticationFilter.class);
    logger.setLevel(Level.DEBUG);
    listAppender = new ListAppender<>();
    listAppender.start();
    logger.addAppender(listAppender);

    // Response writer setup moved to individual tests that need it

    // Clear MDC and setup default request ID
    MDC.clear();
    MDC.put("requestId", "test-123");

    // Default mock behavior
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getMethod()).thenReturn("POST");
  }

  @Test
  void shouldPopulateSecurityContextOnValidToken() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");

    Claims claims = mock(Claims.class);
    when(claims.getIssuer()).thenReturn("test-issuer");
    when(claims.getAudience()).thenReturn("test-audience");
    when(claims.getSubject()).thenReturn("user-ctx-123");
    when(claims.getExpiration()).thenReturn(new Date(System.currentTimeMillis() + 3600000));

    when(tokenValidator.validateToken("valid-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(13579L);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth, "Authentication should be set in SecurityContext");
    assertTrue(auth.isAuthenticated(), "Authentication should be marked authenticated");
    assertEquals("13579", auth.getName(), "Principal name should be the userId string");
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void shouldLogProcessingWithCorrelationId() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");

    Claims claims = mock(Claims.class);
    when(claims.getIssuer()).thenReturn("test-issuer");
    when(claims.getAudience()).thenReturn("test-audience");
    when(claims.getSubject()).thenReturn("test-subject");
    when(claims.getExpiration()).thenReturn(new Date(System.currentTimeMillis() + 3600000));

    when(tokenValidator.validateToken("valid-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(12345L);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundProcessingLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains("[test-123] Processing authentication for"));
    assertTrue(foundProcessingLog, "Should log processing with correlation ID");
  }

  @Test
  void shouldAuthenticateDuringAsyncDispatch() throws Exception {
    // Given an async dispatch (e.g., Spring GraphQL secondary dispatch)
    when(request.getDispatcherType()).thenReturn(DispatcherType.ASYNC);
    // Allow any attribute lookup (OncePerRequestFilter uses an internal attr name)
    lenient().when(request.getAttribute(any())).thenReturn(null);
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer async-valid-token");

    Claims claims = mock(Claims.class);
    when(claims.getIssuer()).thenReturn("issuer");
    when(claims.getAudience()).thenReturn("aud");
    when(claims.getSubject()).thenReturn("sub");
    when(claims.getExpiration()).thenReturn(new Date(System.currentTimeMillis() + 60000));

    when(tokenValidator.validateToken("async-valid-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(424242L);

    // When
    filter.doFilter(request, response, filterChain);

    // Then: authentication should still occur on ASYNC dispatch
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertEquals("424242", auth.getName());
    verify(filterChain).doFilter(request, response);
  }

  @Test
  void shouldLogSuccessfulAuthentication() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");

    Claims claims = mock(Claims.class);
    when(claims.getIssuer()).thenReturn("test-issuer");
    when(claims.getAudience()).thenReturn("test-audience");
    when(claims.getSubject()).thenReturn("user-123");
    when(claims.getExpiration()).thenReturn(new Date(System.currentTimeMillis() + 3600000));

    when(tokenValidator.validateToken("valid-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(67890L);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(request).setAttribute("userId", "67890");
    verify(request).setAttribute("authenticated", true);
    verify(filterChain).doFilter(request, response);

    // Verify detailed logging
    boolean foundTokenValidationLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                            .getFormattedMessage()
                            .contains("[test-123] Token validation successful. Claims:")
                        && event.getFormattedMessage().contains("issuer=test-issuer")
                        && event.getFormattedMessage().contains("subject=user-123"));
    assertTrue(foundTokenValidationLog, "Should log detailed token validation success");

    boolean foundAuthSuccessLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-123] Auth OK")
                        && event.getFormattedMessage().contains("userId=67890"));
    assertTrue(foundAuthSuccessLog, "Should log authentication success");
  }

  @Test
  void shouldLogTokenValidationFailure() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");

    when(tokenValidator.validateToken("invalid-token"))
        .thenThrow(new OidcTokenValidator.TokenValidationException("Token expired"));

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(response).setStatus(401);
    verify(filterChain, never()).doFilter(any(), any());

    String responseBody = responseWriter.toString();
    assertTrue(responseBody.contains("Invalid or expired token"));

    // Verify error logging
    boolean foundValidationFailureLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-123] Token validation failed")
                        && event.getFormattedMessage().contains("Token expired"));
    assertTrue(foundValidationFailureLog, "Should log token validation failure");

    boolean foundUnauthorizedLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains("[test-123] Sending 401 Unauthorized response"));
    assertTrue(foundUnauthorizedLog, "Should log 401 response");
  }

  @Test
  void shouldLogMissingToken() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getHeader("Cookie")).thenReturn(null);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(response).setStatus(401);
    verify(filterChain, never()).doFilter(any(), any());

    boolean foundNoTokenLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains(
                            "[test-123] No authentication token provided for protected endpoint"));
    assertTrue(foundNoTokenLog, "Should log missing token");

    boolean foundNoTokenHeaderLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains("[test-123] No authentication token found in request headers"));
    assertTrue(foundNoTokenHeaderLog, "Should log detailed token extraction failure");
  }

  @Test
  void shouldLogTokenExtractionDetails() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer test-token-12345");

    Claims claims = mock(Claims.class);
    when(tokenValidator.validateToken("test-token-12345")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(999L);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundAuthHeaderLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains("[test-123] Authorization header present: true"));
    assertTrue(foundAuthHeaderLog, "Should log authorization header presence");

    boolean foundTokenExtractionLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                            .getFormattedMessage()
                            .contains("[test-123] Extracted Bearer token from Authorization header")
                        && event.getFormattedMessage().contains("length: 16"));
    assertTrue(foundTokenExtractionLog, "Should log token extraction details");
  }

  @Test
  void shouldLogCookieTokenExtraction() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getHeader("Cookie"))
        .thenReturn("other=value; sid=cookie-session-token; more=data");

    Claims claims = mock(Claims.class);
    when(tokenValidator.validateToken("cookie-session-token")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(555L);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundCookieHeaderLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-123] Cookie header present: true"));
    assertTrue(foundCookieHeaderLog, "Should log cookie header presence");

    boolean foundCookieTokenLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                            .getFormattedMessage()
                            .contains("[test-123] Extracted session token from cookie")
                        && event.getFormattedMessage().contains("length: 20"));
    assertTrue(foundCookieTokenLog, "Should log cookie token extraction");
  }

  @Test
  void shouldLogValidTokenButInvalidUserId() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer valid-but-no-user");

    Claims claims = mock(Claims.class);
    when(claims.getIssuer()).thenReturn("test");
    when(claims.getSubject()).thenReturn("no-user");
    when(tokenValidator.validateToken("valid-but-no-user")).thenReturn(claims);
    when(tokenValidator.extractUserId(claims)).thenReturn(null);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(response).setStatus(401);

    boolean foundValidTokenNoUserLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains("[test-123] Valid token but could not extract userId"));
    assertTrue(foundValidTokenNoUserLog, "Should log valid token with invalid user ID");
  }

  @Test
  void shouldLogUnexpectedErrors() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn("Bearer error-token");

    when(tokenValidator.validateToken("error-token"))
        .thenThrow(new RuntimeException("Unexpected database error"));

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(response).setStatus(401);

    boolean foundUnexpectedErrorLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                            .getFormattedMessage()
                            .contains("[test-123] Unexpected token validation error")
                        && event.getFormattedMessage().contains("Unexpected database error"));
    assertTrue(foundUnexpectedErrorLog, "Should log unexpected errors");
  }

  @Test
  void shouldSkipWhenUserIdAlreadySet() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn("existing-user");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(request, response);
    verify(tokenValidator, never()).validateToken(any());

    boolean foundSkipLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event
                        .getFormattedMessage()
                        .contains(
                            "[test-123] UserId already set by another mechanism, skipping OIDC validation"));
    assertTrue(foundSkipLog, "Should log skipping when user ID already set");
  }

  @Test
  void shouldHandleMissingRequestId() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    MDC.clear(); // Remove request ID
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundUnknownIdLog =
        listAppender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().contains("[unknown]"));
    assertTrue(foundUnknownIdLog, "Should handle missing request ID gracefully");
  }
}
