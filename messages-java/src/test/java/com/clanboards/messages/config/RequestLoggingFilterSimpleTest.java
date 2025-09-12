package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RequestLoggingFilterSimpleTest {

  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain filterChain;

  private RequestLoggingFilter filter;

  @BeforeEach
  void setUp() throws Exception {
    filter = new RequestLoggingFilter();

    // Default mock setup
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/test");
    when(request.getRemoteAddr()).thenReturn("127.0.0.1");

    // Setup flexible header mocking to handle any header request
    when(request.getHeader("User-Agent")).thenReturn("TestAgent");
    when(request.getHeader("X-Request-ID")).thenReturn(null);
    when(request.getHeader("Authorization")).thenReturn(null);
    when(request.getHeader("Cookie")).thenReturn(null);

    // Setup default attribute mocking for authentication info
    when(request.getAttribute("userId")).thenReturn(null);
    when(request.getAttribute("authenticated")).thenReturn(null);
  }

  @Test
  void shouldProcessRequestWithCorrelationId() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn("test-123");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(), any());
  }

  @Test
  void shouldGenerateCorrelationIdWhenNotProvided() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn(null);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(), any());
  }

  @Test
  void shouldHandleHealthCheckRequests() throws Exception {
    // Given
    when(request.getRequestURI()).thenReturn("/api/v1/health");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(), any());
  }

  @Test
  void shouldWrapResponseToCaptureStatus() throws Exception {
    // Given
    when(request.getHeader("X-Request-ID")).thenReturn("status-test");

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(eq(request), any(StatusCapturingResponseWrapper.class));
  }

  @Test
  void shouldLogAuthenticationContext() throws Exception {
    // Given
    when(request.getAttribute("userId")).thenReturn("12345");
    when(request.getAttribute("authenticated")).thenReturn(true);

    // When
    filter.doFilterInternal(request, response, filterChain);

    // Then
    verify(filterChain).doFilter(any(), any());
  }
}
