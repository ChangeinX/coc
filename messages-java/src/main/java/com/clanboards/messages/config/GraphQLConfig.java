package com.clanboards.messages.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        String requestId = org.slf4j.MDC.get("requestId");

        final String userIdFinal;
        final boolean authenticatedFinal;
        if (attributes != null) {
          HttpServletRequest servletRequest = attributes.getRequest();
          Authentication auth = SecurityContextHolder.getContext().getAuthentication();
          userIdFinal = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
          authenticatedFinal = auth != null && auth.isAuthenticated();

          log.info(
              "[{}] GraphQL interceptor: userId={}, authenticated={}, operation={}",
              requestId != null ? requestId : "unknown",
              userIdFinal,
              authenticatedFinal,
              getOperationName(request.getDocument()));

          if (userIdFinal != null) {
            String ip = servletRequest.getHeader("X-Forwarded-For");
            String ua = servletRequest.getHeader("User-Agent");
            request.configureExecutionInput(
                (executionInput, builder) ->
                    builder
                        .graphQLContext(
                            contextBuilder ->
                                contextBuilder
                                    .put("userId", userIdFinal)
                                    .put("authenticated", authenticatedFinal)
                                    .put("ip", ip)
                                    .put("ua", ua))
                        .build());
            log.debug("Added userId {} to GraphQL context", userIdFinal);
          } else {
            log.warn(
                "[{}] GraphQL auth issue - userId: {}, authenticated: {}, hasAuthHeader: {}, hasCookie: {}",
                requestId != null ? requestId : "unknown",
                null,
                false,
                attributes.getRequest().getHeader("Authorization") != null,
                attributes.getRequest().getHeader("Cookie") != null);
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
