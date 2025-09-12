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

          log.debug("GraphQL interceptor: userId={}, authenticated={}", userId, authenticated);

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
}
