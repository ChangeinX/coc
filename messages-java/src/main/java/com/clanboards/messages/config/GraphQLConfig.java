package com.clanboards.messages.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import reactor.core.publisher.Mono;

@Configuration
public class GraphQLConfig {
  private static final Logger log = LoggerFactory.getLogger(GraphQLConfig.class);

  @Bean
  public WebGraphQlInterceptor authContextInterceptor() {
    return new WebGraphQlInterceptor() {
      @Override
      public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        // Get the HTTP servlet request
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
          HttpServletRequest servletRequest = attributes.getRequest();

          // Extract authentication data from request attributes (set by OidcAuthenticationFilter)
          String userId = (String) servletRequest.getAttribute("userId");
          Boolean authenticated = (Boolean) servletRequest.getAttribute("authenticated");
          String requestId = org.slf4j.MDC.get("requestId");

          log.info(
              "[{}] GraphQL interceptor: userId={}, authenticated={}, operation={}",
              requestId != null ? requestId : "unknown",
              userId,
              authenticated,
              getOperationName(request.getDocument()));

          // Log authentication details for troubleshooting
          if (userId == null || !Boolean.TRUE.equals(authenticated)) {
            log.warn(
                "[{}] GraphQL auth issue - userId: {}, authenticated: {}, hasAuthHeader: {}, hasCookie: {}",
                requestId != null ? requestId : "unknown",
                userId,
                authenticated,
                servletRequest.getHeader("Authorization") != null,
                servletRequest.getHeader("Cookie") != null);
          }

          // Add authentication context to GraphQL execution context
          if (userId != null) {
            request.configureExecutionInput(
                (executionInput, builder) -> {
                  return builder
                      .graphQLContext(
                          contextBuilder -> {
                            contextBuilder
                                .put("userId", userId)
                                .put("authenticated", Boolean.TRUE.equals(authenticated))
                                .put("ip", servletRequest.getHeader("X-Forwarded-For"))
                                .put("ua", servletRequest.getHeader("User-Agent"));
                          })
                      .build();
                });
            log.debug("Added userId {} to GraphQL context", userId);
          } else {
            log.debug("No userId found in request attributes for GraphQL context");
          }
        } else {
          log.warn("No ServletRequestAttributes found for GraphQL request");
        }

        return chain.next(request);
      }
    };
  }

  String getOperationName(String document) {
    if (document == null || document.isBlank()) {
      return "unknown";
    }

    // Simple regex to extract operation name from GraphQL document
    try {
      if (document.contains("query")) {
        if (document.contains("listChats")) return "listChats";
        if (document.contains("getMessages")) return "getMessages";
      }
      if (document.contains("mutation")) {
        if (document.contains("sendMessage")) return "sendMessage";
        if (document.contains("createDirectChat")) return "createDirectChat";
      }
      return "unknown";
    } catch (Exception e) {
      return "unknown";
    }
  }
}
