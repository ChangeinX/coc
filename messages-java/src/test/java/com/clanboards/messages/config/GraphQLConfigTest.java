package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import reactor.core.publisher.Mono;

@ExtendWith(MockitoExtension.class)
class GraphQLConfigTest {

  @Mock private WebGraphQlRequest graphqlRequest;
  @Mock private WebGraphQlInterceptor.Chain chain;
  @Mock private WebGraphQlResponse graphqlResponse;
  @Mock private HttpServletRequest servletRequest;
  @Mock private ServletRequestAttributes requestAttributes;

  private GraphQLConfig config;
  private ListAppender<ILoggingEvent> listAppender;
  private Logger logger;

  @BeforeEach
  void setUp() {
    config = new GraphQLConfig();
    SecurityContextHolder.clearContext();

    // Setup logger capture
    logger = (Logger) LoggerFactory.getLogger(GraphQLConfig.class);
    listAppender = new ListAppender<>();
    listAppender.start();
    logger.addAppender(listAppender);

    // Clear MDC
    MDC.clear();
  }

  @Test
  void testInterceptorBean_IsCreated() {
    // Test that the bean is properly created
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();
    assertNotNull(interceptor);
  }

  @Test
  void interceptor_ShouldLogGraphQLRequestWithCorrelationId() throws Exception {
    // Given
    MDC.put("requestId", "graphql-123");
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();

    when(graphqlRequest.getDocument()).thenReturn("query { listChats { id kind } }");
    when(requestAttributes.getRequest()).thenReturn(servletRequest);
    // Set authentication in SecurityContext
    var auth =
        new UsernamePasswordAuthenticationToken(
            "12345", null, java.util.List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContextHolder.getContext().setAuthentication(auth);
    when(chain.next(any())).thenReturn(Mono.just(graphqlResponse));

    try (MockedStatic<RequestContextHolder> mockedHolder =
        Mockito.mockStatic(RequestContextHolder.class)) {
      mockedHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(requestAttributes);

      // When
      Mono<WebGraphQlResponse> result = interceptor.intercept(graphqlRequest, chain);
      result.block(); // Execute the chain

      // Then
      boolean foundInterceptorLog =
          listAppender.list.stream()
              .anyMatch(
                  event ->
                      event.getFormattedMessage().contains("[graphql-123] GraphQL interceptor")
                          && event.getFormattedMessage().contains("userId=12345")
                          && event.getFormattedMessage().contains("authenticated=true")
                          && event.getFormattedMessage().contains("operation=listChats"));
      assertTrue(
          foundInterceptorLog,
          "Should log GraphQL request with correlation ID and operation details");
    }
  }

  @Test
  void interceptor_ShouldLogAuthenticationIssues() throws Exception {
    // Given
    MDC.put("requestId", "graphql-auth-issue");
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();

    when(graphqlRequest.getDocument())
        .thenReturn("mutation { sendMessage(chatId: \"test\", content: \"hello\") { id } }");
    when(requestAttributes.getRequest()).thenReturn(servletRequest);
    SecurityContextHolder.clearContext();
    when(servletRequest.getHeader("Authorization")).thenReturn("Bearer invalid");
    when(servletRequest.getHeader("Cookie")).thenReturn(null);
    when(chain.next(any())).thenReturn(Mono.just(graphqlResponse));

    try (MockedStatic<RequestContextHolder> mockedHolder =
        Mockito.mockStatic(RequestContextHolder.class)) {
      mockedHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(requestAttributes);

      // When
      Mono<WebGraphQlResponse> result = interceptor.intercept(graphqlRequest, chain);
      result.block();

      // Then
      boolean foundAuthIssueLog =
          listAppender.list.stream()
              .anyMatch(
                  event ->
                      event
                              .getFormattedMessage()
                              .contains("[graphql-auth-issue] GraphQL auth issue")
                          && event.getFormattedMessage().contains("userId: null")
                          && event.getFormattedMessage().contains("authenticated: false")
                          && event.getFormattedMessage().contains("hasAuthHeader: true")
                          && event.getFormattedMessage().contains("hasCookie: false"));
      assertTrue(foundAuthIssueLog, "Should log detailed authentication issues");
    }
  }

  @Test
  void getOperationName_ShouldExtractCorrectOperations() {
    // Test query operations
    assertEquals("listChats", config.getOperationName("query { listChats { id } }"));
    assertEquals(
        "getMessages",
        config.getOperationName(
            "query GetMessages($id: ID!) { getMessages(chatId: $id) { content } }"));

    // Test mutation operations
    assertEquals(
        "sendMessage",
        config.getOperationName(
            "mutation { sendMessage(chatId: \"test\", content: \"hi\") { id } }"));
    assertEquals(
        "createDirectChat",
        config.getOperationName(
            "mutation CreateChat { createDirectChat(recipientId: \"123\") { id } }"));

    // Test unknown operations
    assertEquals("unknown", config.getOperationName("query { someOtherOperation }"));
    assertEquals("unknown", config.getOperationName(""));
    assertEquals("unknown", config.getOperationName(null));
  }

  @Test
  void interceptor_ShouldHandleMissingRequestAttributes() throws Exception {
    // Given
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();
    // Note: No need to stub getDocument() since it's not called when attributes are null
    when(chain.next(any())).thenReturn(Mono.just(graphqlResponse));

    try (MockedStatic<RequestContextHolder> mockedHolder =
        Mockito.mockStatic(RequestContextHolder.class)) {
      mockedHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(null);

      // When
      Mono<WebGraphQlResponse> result = interceptor.intercept(graphqlRequest, chain);
      result.block();

      // Then
      boolean foundWarningLog =
          listAppender.list.stream()
              .anyMatch(
                  event ->
                      event.getFormattedMessage().contains("No ServletRequestAttributes found"));
      assertTrue(foundWarningLog, "Should warn when request attributes are missing");
    }
  }

  @Test
  void interceptor_ShouldHandleMissingRequestId() throws Exception {
    // Given - no request ID in MDC
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();

    when(graphqlRequest.getDocument()).thenReturn("query { listChats }");
    when(requestAttributes.getRequest()).thenReturn(servletRequest);
    var auth2 =
        new UsernamePasswordAuthenticationToken(
            "456", null, java.util.List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContextHolder.getContext().setAuthentication(auth2);
    when(chain.next(any())).thenReturn(Mono.just(graphqlResponse));

    try (MockedStatic<RequestContextHolder> mockedHolder =
        Mockito.mockStatic(RequestContextHolder.class)) {
      mockedHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(requestAttributes);

      // When
      Mono<WebGraphQlResponse> result = interceptor.intercept(graphqlRequest, chain);
      result.block();

      // Then
      boolean foundUnknownIdLog =
          listAppender.list.stream()
              .anyMatch(
                  event -> event.getFormattedMessage().contains("[unknown] GraphQL interceptor"));
      assertTrue(foundUnknownIdLog, "Should use 'unknown' when request ID is missing");
    }
  }
}
