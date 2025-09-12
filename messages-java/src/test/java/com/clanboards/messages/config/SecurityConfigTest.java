package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private OidcAuthenticationFilter oidcAuthenticationFilter;
  @Mock private AccessDeniedException accessDeniedException;
  @Mock private AuthenticationException authenticationException;

  private SecurityConfig securityConfig;
  private ListAppender<ILoggingEvent> listAppender;
  private Logger logger;
  private StringWriter responseWriter;

  @BeforeEach
  void setUp() throws Exception {
    securityConfig = new SecurityConfig(oidcAuthenticationFilter);

    // Setup logger capture
    logger = (Logger) LoggerFactory.getLogger(SecurityConfig.class);
    listAppender = new ListAppender<>();
    listAppender.start();
    logger.addAppender(listAppender);

    // Clear MDC before each test
    MDC.clear();
  }

  @Test
  void accessDeniedHandler_ShouldLog403ErrorWithDetails() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    MDC.put("requestId", "test-403");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getAttribute("userId")).thenReturn("12345");
    when(request.getAttribute("authenticated")).thenReturn(true);
    when(request.getHeader("Authorization")).thenReturn("Bearer token");
    when(request.getHeader("Cookie")).thenReturn("sid=cookie");
    when(request.getRemoteAddr()).thenReturn("192.168.1.1");
    when(accessDeniedException.getMessage()).thenReturn("Access is denied");

    AccessDeniedHandler handler = securityConfig.accessDeniedHandler();

    // When
    handler.handle(request, response, accessDeniedException);

    // Then
    verify(response).setStatus(403);
    verify(response).setContentType("application/json");

    String responseBody = responseWriter.toString();
    assertTrue(responseBody.contains("Access Denied"));
    assertTrue(responseBody.contains("Insufficient permissions"));

    // Verify detailed logging
    boolean foundAccessDeniedLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-403] ACCESS DENIED (403)")
                        && event.getFormattedMessage().contains("User: 12345")
                        && event.getFormattedMessage().contains("Authenticated: true"));
    assertTrue(foundAccessDeniedLog, "Should log access denied with user details");

    boolean foundRequestDetailsLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("Request details")
                        && event.getFormattedMessage().contains("AuthHeader: present")
                        && event.getFormattedMessage().contains("Cookie: present")
                        && event.getFormattedMessage().contains("RemoteAddr: 192.168.1.1"));
    assertTrue(foundRequestDetailsLog, "Should log detailed request information");
  }

  @Test
  void accessDeniedHandler_ShouldHandleMissingUserInfo() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    MDC.put("requestId", "test-403-no-user");
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/test");
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getAttribute("authenticated")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getHeader("Cookie")).thenReturn(null);
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(accessDeniedException.getMessage()).thenReturn("No permission");

    AccessDeniedHandler handler = securityConfig.accessDeniedHandler();

    // When
    handler.handle(request, response, accessDeniedException);

    // Then
    boolean foundAccessDeniedLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("ACCESS DENIED (403)")
                        && event.getFormattedMessage().contains("User: none")
                        && event.getFormattedMessage().contains("Authenticated: false"));

    boolean foundRequestDetailsLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("Request details")
                        && event.getFormattedMessage().contains("AuthHeader: missing")
                        && event.getFormattedMessage().contains("Cookie: missing"));

    assertTrue(
        foundAccessDeniedLog && foundRequestDetailsLog,
        "Should handle missing user information gracefully");
  }

  @Test
  void authenticationEntryPoint_ShouldLog401ErrorWithDetails() throws Exception {
    // Given
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    MDC.put("requestId", "test-401");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getAttribute("userId")).thenReturn("67890");
    when(request.getHeader("Authorization")).thenReturn("Bearer expired-token");
    when(request.getHeader("Cookie")).thenReturn(null);
    when(request.getRemoteAddr()).thenReturn("10.0.0.1");
    when(authenticationException.getMessage()).thenReturn("Token expired");

    AuthenticationEntryPoint entryPoint = securityConfig.authenticationEntryPoint();

    // When
    entryPoint.commence(request, response, authenticationException);

    // Then
    verify(response).setStatus(401);
    verify(response).setContentType("application/json");

    String responseBody = responseWriter.toString();
    assertTrue(responseBody.contains("Unauthorized"));
    assertTrue(responseBody.contains("Authentication required"));

    // Verify detailed logging
    boolean foundAuthFailureLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-401] AUTHENTICATION FAILED (401)")
                        && event.getFormattedMessage().contains("User: 67890")
                        && event.getFormattedMessage().contains("Token expired"));
    assertTrue(foundAuthFailureLog, "Should log authentication failure with details");

    boolean foundAuthDetailsLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("Auth failure details")
                        && event.getFormattedMessage().contains("AuthHeader: present")
                        && event.getFormattedMessage().contains("Cookie: missing")
                        && event.getFormattedMessage().contains("RemoteAddr: 10.0.0.1"));
    assertTrue(foundAuthDetailsLog, "Should log detailed authentication failure information");
  }

  @Test
  void shouldHandleMissingRequestId() throws Exception {
    // Given - no request ID in MDC
    responseWriter = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));

    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/test");
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getHeader("Cookie")).thenReturn(null);
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(authenticationException.getMessage()).thenReturn("Auth failed");

    AuthenticationEntryPoint entryPoint = securityConfig.authenticationEntryPoint();

    // When
    entryPoint.commence(request, response, authenticationException);

    // Then
    boolean foundLogWithUnknownId =
        listAppender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().contains("[unknown]"));
    assertTrue(foundLogWithUnknownId, "Should use 'unknown' when request ID is not available");
  }

  @Test
  void securityFilterChain_ShouldBeConfiguredCorrectly() throws Exception {
    // Given
    SecurityConfig config = new SecurityConfig(oidcAuthenticationFilter);

    // When
    AccessDeniedHandler handler = config.accessDeniedHandler();
    AuthenticationEntryPoint entryPoint = config.authenticationEntryPoint();

    // Then
    assertNotNull(handler, "Access denied handler should be created");
    assertNotNull(entryPoint, "Authentication entry point should be created");
  }
}
