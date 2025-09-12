package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class RequestLoggingFilterTest {

  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain filterChain;

  private RequestLoggingFilter filter;
  private ListAppender<ILoggingEvent> listAppender;
  private Logger logger;

  @BeforeEach
  void setUp() {
    filter = new RequestLoggingFilter();

    // Setup logger capture
    logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
    listAppender = new ListAppender<>();
    listAppender.start();
    logger.addAppender(listAppender);
  }

  @Test
  void shouldLogIncomingRequestWithCorrelationId() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn("test-123");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getHeader("User-Agent")).thenReturn("TestClient/1.0");
    when(request.getHeader("Authorization")).thenReturn("Bearer test-token");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(HttpServletRequest.class), any());

    // Verify logging contains correlation ID
    boolean foundRequestLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("[test-123]")
                        && event.getFormattedMessage().contains("INCOMING REQUEST"));
    assertTrue(foundRequestLog, "Should log incoming request with correlation ID");
  }

  @Test
  void shouldLogHealthCheckAtDebugLevel() throws Exception {
    // Given - health check request
    when(request.getHeader("X-Request-ID")).thenReturn("health-123");
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/health");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(HttpServletRequest.class), any());
  }

  @Test
  void shouldLogHealthCheckErrorResponses() throws Exception {
    // Given - health check with error
    when(request.getHeader("X-Request-ID")).thenReturn("health-error-123");
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/health");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getHeader("User-Agent")).thenReturn(null);

    // Mock filterChain to simulate setting response status to 500
    doAnswer(
            invocation -> {
              Object[] args = invocation.getArguments();
              StatusCapturingResponseWrapper wrapper = (StatusCapturingResponseWrapper) args[1];
              wrapper.setStatus(500);
              return null;
            })
        .when(filterChain)
        .doFilter(any(), any());

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    // Should log error response even for health check
    boolean foundErrorLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getLevel().toString().equals("WARN")
                        && event.getFormattedMessage().contains("ERROR RESPONSE")
                        && event.getFormattedMessage().contains("500"));
    assertTrue(foundErrorLog, "Should log health check error responses");
  }

  @Test
  void shouldLogAuthenticationDetailsFor403Errors() throws Exception {
    // Given - request that will result in 403
    when(request.getHeader("X-Request-ID")).thenReturn("auth-error-123");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getHeader("User-Agent")).thenReturn("TestClient/1.0");
    when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
    when(request.getHeader("Cookie")).thenReturn("sid=test-cookie");
    when(request.getAttribute("userId")).thenReturn("12345");
    when(request.getAttribute("authenticated")).thenReturn(false);

    // Mock filterChain to simulate setting response status to 403
    doAnswer(
            invocation -> {
              Object[] args = invocation.getArguments();
              StatusCapturingResponseWrapper wrapper = (StatusCapturingResponseWrapper) args[1];
              wrapper.setStatus(403);
              return null;
            })
        .when(filterChain)
        .doFilter(any(), any());

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    // Should log detailed auth info for 403 errors
    boolean foundAuthDetailsLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("Auth details")
                        && event.getFormattedMessage().contains("hasAuthHeader: true")
                        && event.getFormattedMessage().contains("hasCookie: true")
                        && event.getFormattedMessage().contains("extractedUserId: 12345"));
    assertTrue(foundAuthDetailsLog, "Should log detailed auth information for 403 errors");
  }

  @Test
  void shouldGenerateCorrelationIdWhenNotProvided() throws Exception {
    // Given - no correlation ID header
    when(request.getHeader("X-Request-ID")).thenReturn(null);
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/test");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getHeader("User-Agent")).thenReturn(null);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    // Should generate and use a correlation ID
    boolean foundGeneratedIdLog =
        listAppender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().matches(".*\\[[a-f0-9]{8}\\].*"));
    assertTrue(foundGeneratedIdLog, "Should generate correlation ID when not provided");
  }

  @Test
  void shouldLogResponseTiming() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn("timing-123");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    when(request.getHeader("User-Agent")).thenReturn(null);
    when(request.getAttribute("userId")).thenReturn("12345");
    when(request.getAttribute("authenticated")).thenReturn(true);

    // Simulate some processing time
    doAnswer(
            invocation -> {
              Thread.sleep(10);
              return null;
            })
        .when(filterChain)
        .doFilter(any(), any());

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundTimingLog =
        listAppender.list.stream()
            .anyMatch(
                event ->
                    event.getFormattedMessage().contains("ms)")
                        && event.getFormattedMessage().contains("userId: 12345")
                        && event.getFormattedMessage().contains("authenticated: true"));
    assertTrue(foundTimingLog, "Should log response timing and auth status");
  }

  @Test
  void shouldCaptureActualResponseStatus() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn("status-123");
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn("/api/v1/chat/graphql");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");

    // Mock a response that changes status during processing
    doAnswer(
            invocation -> {
              Object[] args = invocation.getArguments();
              StatusCapturingResponseWrapper wrapper = (StatusCapturingResponseWrapper) args[1];
              wrapper.setStatus(401);
              return null;
            })
        .when(filterChain)
        .doFilter(any(), any());

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    boolean foundStatusLog =
        listAppender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().contains("-> 401"));
    assertTrue(foundStatusLog, "Should capture and log actual response status");
  }
}
